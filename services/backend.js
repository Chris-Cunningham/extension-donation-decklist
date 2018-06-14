/**
 *    Copyright 2018 Amazon.com, Inc. or its affiliates
 * 
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 * 
 *        http://www.apache.org/licenses/LICENSE-2.0
 * 
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

const fs = require('fs');
const Hapi = require('hapi');
const path = require('path');
const Boom = require('boom');
const color = require('color');
const ext = require('commander');
const jwt = require('jsonwebtoken');
const request = require('request');

const verboseLogging = true; // verbose logging; turn off for production

const initialColor = color('#6441A4');     // super important; bleedPurple, etc.
const initialShape = 100;                   // the radius of the circle starts at 50
const serverTokenDurationSec = 30;         // our tokens for pubsub expire after 30 seconds
const userCooldownMs = 1000;               // maximum input rate per user to prevent bot abuse
const userCooldownClearIntervalMs = 60000; // interval to reset our tracking object
const channelCooldownMs = 1000;            // maximum broadcast rate per channel
const bearerPrefix = 'Bearer ';            // JWT auth headers have this prefix

const channelCooldowns = { }           // rate limit compliance
let   userCooldowns = { };             // spam prevention

// TODO: i18n
const STRINGS = {
    env_secret: `* Using env var for secret`,
    env_client_id: `* Using env var for client-id`,
    env_owner_id: `* Using env var for owner-id`,
    server_started: `Server running at %s`,
    missing_secret: "Extension secret required.\nUse argument '-s <secret>' or env var 'EXT_SECRET'",
    missing_clientId: "Extension client ID required.\nUse argument '-c <client ID>' or env var 'EXT_CLIENT_ID'",
    missing_ownerId: "Extension owner ID required.\nUse argument '-o <owner ID>' or env var 'EXT_OWNER_ID'",
    message_send_error: "Error sending message to channel %s",
    pubsub_response: "Message to c:%s returned %s",
    state_broadcast: "Broadcasting state",
    body_broadcast: "Body of request is:%s",
    send_state: "Sending nothing to c:%s",
    cooldown: "Please wait before clicking again",
    invalid_jwt: "Invalid JWT"
};

ext
    .version(require('../package.json').version)
    .option('-s, --secret <secret>', 'Extension secret')
    .option('-c, --client-id <client_id>', 'Extension client ID')
    .option('-o, --owner-id <owner_id>','Extension owner ID')
    .parse(process.argv)
;

// hacky env var support
const ENV_SECRET = process.env.EXT_SECRET;
const ENV_CLIENT_ID = process.env.EXT_CLIENT_ID;
const ENV_OWNER_ID = process.env.EXT_OWNER_ID;

if(!ext.secret && ENV_SECRET) { 
    console.log(STRINGS.env_secret);
    ext.secret = ENV_SECRET; 
}
if(!ext.clientId && ENV_CLIENT_ID) { 
    console.log(STRINGS.env_client_id);
    ext.clientId = ENV_CLIENT_ID;
}

if(!ext.ownerId && ENV_OWNER_ID) {
    console.log(STRINGS.env_owner_id);
    ext.ownerId = ENV_OWNER_ID;
}

// YOU SHALL NOT PASS
if(!ext.secret) { 
    console.log(STRINGS.missing_secret);
    process.exit(1); 
}
if(!ext.clientId) {
    console.log(STRINGS.missing_clientId);
    process.exit(1); 
}

if(!ext.ownerId) {
    console.log(STRINGS.missing_ownerId);
    process.exit(1);
}

// log function that won't spam in production
const verboseLog = verboseLogging ? console.log.bind(console) : function(){}

const server = new Hapi.Server({
    host: 'localhost.rig.twitch.tv',
    port: 8081,
    tls: { // if you need a certificate, use `npm run cert`
        key: fs.readFileSync(path.resolve(__dirname, '../conf/server.key')),
        cert: fs.readFileSync(path.resolve(__dirname, '../conf/server.crt')),
    },
    routes: { 
        cors: {
            origin: ['*']
        }
    }
});

// use a common method for consistency
function verifyAndDecode(header) {

    try {
        if (!header.startsWith(bearerPrefix)) {
            return false;
        }
        
        const token = header.substring(bearerPrefix.length);
        const secret = Buffer.from(ext.secret, 'base64');
        return jwt.verify(token, secret, { algorithms: ['HS256'] }); 
    }
    catch (e) {
        return false;
    }
}

function stateQueryHandler(req, h) {
    
    // REMEMBER! every request MUST be verified, for SAFETY!
    const payload = verifyAndDecode(req.headers.authorization);
    if(!payload) { throw Boom.unauthorized(STRINGS.invalid_jwt); } // seriously though

    const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;

    verboseLog(STRINGS.send_state, opaqueUserId);
    return 'ok';
}

function attemptStateBroadcast(channelId) {

  // per-channel rate limit handler
  const now = Date.now();
  const cooldown = channelCooldowns[channelId];

  if (!cooldown || cooldown.time < now) {
    // we can send immediately because we're outside the cooldown
    sendStateBroadcast(channelId);
    channelCooldowns[channelId] = { time: now + channelCooldownMs };
    return;
  }

  // schedule a delayed broadcast only if we haven't already
  if (!cooldown.trigger) {
      cooldown.trigger = setTimeout(sendStateBroadcast, now - cooldown.time, channelId);
  }
}

function sendStateBroadcast(channelId) {
  
    // our HTTP headers to the Twitch API
    const headers = {
        'Client-Id': ext.clientId,
        'Content-Type': 'application/json',
        'Authorization': bearerPrefix + makeServerToken(channelId)
    };

    const currentState = 'ok!';

    // our POST body to the Twitch API
    const body = JSON.stringify({
        content_type: 'application/json',
        message: currentState,
        targets: [ 'broadcast' ]
    });

    verboseLog(STRINGS.body_broadcast, body);

    // send our broadcast request to Twitch
    request(
        `https://api.twitch.tv/extensions/message/${channelId}`,
        {
            method: 'POST',
            headers,
            body
        }
        , (err, res) => {
            if (err) {
                console.log(STRINGS.messageSendError, channelId);
            } else {
                verboseLog(STRINGS.pubsub_response, channelId, res.statusCode);
            }
    });
}

function makeServerToken(channelId) {
  
    const payload = {
        exp: Math.floor(Date.now() / 1000) + serverTokenDurationSec,
        channel_id: channelId,
        user_id: ext.ownerId, // extension owner ID for the call to Twitch PubSub
        role: 'external',
        pubsub_perms: {
            send: [ '*' ],
        },
    }

    const secret = Buffer.from(ext.secret, 'base64');
    return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

function userIsInCooldown(opaqueUserId) {
  
    const cooldown = userCooldowns[opaqueUserId];
    const now = Date.now();
    if (cooldown && cooldown > now) {
        return true;
    }
    
    // voting extensions should also track per-user votes to prevent skew
    userCooldowns[opaqueUserId] = now + userCooldownMs;
    return false;
}

(async () => { // we await top-level await ;P
  
    // new viewer is requesting the current state.
    server.route({
        method: 'GET',
        path: '/state/query',
        handler: stateQueryHandler
    });

    await server.start();

    console.log(STRINGS.server_started, server.info.uri);

    // periodically clear cooldown tracking to prevent unbounded growth due to
    // per-session logged out user tokens
    setInterval(function() { userCooldowns = {} }, userCooldownClearIntervalMs)

})(); // IIFE you know what I mean ;)
