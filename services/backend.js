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
const {google} = require('googleapis');
const privatekey = require("./privateSettings.json")
const path = require('path');
const Boom = require('boom');
const ext = require('commander');
const jwt = require('jsonwebtoken');
const request = require('request');

const verboseLogging = true; // verbose logging; turn off for production

const initialDonationDecklist = ''         // default value for a channel's donation decklist
const serverTokenDurationSec = 30;         // our tokens for pubsub expire after 30 seconds
const userCooldownMs = 1000;               // maximum input rate per user to prevent bot abuse
const userCooldownClearIntervalMs = 60000; // interval to reset our tracking object
const channelGapiCooldownMs = 20000;       // only use the google api this often to look for new data
const bearerPrefix = 'Bearer ';            // JWT auth headers have this prefix

const channelDonationDecklists = { }   // current extension state
const channelGapiCooldowns = { }       // GAPI rate limit compliance
let   userCooldowns = { };             // spam prevention

const STRINGS = {
    env_secret: `* Using env var for secret`,
    env_client_id: `* Using env var for client-id`,
    env_owner_id: `* Using env var for owner-id`,
    server_started: `Server running at %s`,
    missing_secret: "Extension secret required.\nUse argument '-s <secret>' or env var 'EXT_SECRET'",
    missing_clientId: "Extension client ID required.\nUse argument '-c <client ID>' or env var 'EXT_CLIENT_ID'",
    missing_ownerId: "Extension owner ID required.\nUse argument '-o <owner ID>' or env var 'EXT_OWNER_ID'",
    send_state: "Sending donation decklist with %s decks to c:%s",
    use_gapi: "Using Google API to get the donation decklist for %s",
    dont_use_gapi: "Using cache (not Google API) for the donation decklist for %s",
    gapi_error: "Google API error: %s",
    gapi_success: "Google API successfully retrieved %s rows."
};

ext
    .version(require('../package.json').version)
    .option('-s, --secret <secret>', 'Extension secret')
    .option('-c, --client-id <client_id>', 'Extension client ID')
    .option('-o, --owner-id <owner_id>','Extension owner ID')
    .parse(process.argv)
;

// This env var support is from twitch extension hello-world.
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

// Spin up a server using the certificates in /conf. Suppoedly `npm run cert` should make certs if you don't have any.
const server = new Hapi.Server({
    host: 'localhost.rig.twitch.tv',
    port: 8081,
    tls: {
        key: fs.readFileSync(path.resolve(__dirname, '../conf/server.key')),
        cert: fs.readFileSync(path.resolve(__dirname, '../conf/server.crt')),
    },
    routes: { 
        cors: {
            origin: ['*']
        }
    }
});

// Configure a JWT auth client to connect to the Google Sheets API.
// From http://isd-soft.com/tech_blog/accessing-google-apis-using-service-account-node-js/
let jwtClient = new google.auth.JWT(
    privatekey.client_email,
    null,
    privatekey.private_key,
    ['https://www.googleapis.com/auth/spreadsheets.readonly']);
    //authenticate request
jwtClient.authorize(function (err, tokens) {
    if (err) {
        console.log(err);
        return;
    } else {
        console.log("Successfully connected to Google API with a JWT.");
    }
});

// Use a common method for consistency of dealing with the headers from twitch requests. From hello-world.
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

    // Per-channel rate limit handler for requests to the google sheets API.
    const now = Date.now();
    const cooldown = channelGapiCooldowns[channelId];

    if (!cooldown || cooldown.time < now) {

        // We can hit the google API immediately because we're outside the cooldown
        verboseLog(STRINGS.use_gapi, opaqueUserId);

        // Reset the cooldown immediately.
        channelGapiCooldowns[channelId] = { time: now + channelGapiCooldownMs };

        // Call getDecks, which returns a Promise to tell us the number of decks it found when it is done.
        return getDecks(channelId).then(
            function (numberOfDecks){
                verboseLog(STRINGS.send_state, numberOfDecks, opaqueUserId);
                return channelDonationDecklists[channelId];
            });

    } else {

        // We have already recently queried the google API for this channel, so just send what we already have.
        verboseLog(STRINGS.dont_use_gapi, opaqueUserId)
        let currentDonationDecklist = channelDonationDecklists[channelId] || initialDonationDecklist;

        if (currentDonationDecklist.length === 0) {
            numberOfDecks = 0;
        } else {
            // The donation decklist is a semicolon-delimited list of decks, so counting the semicolons finds how many.
            numberOfDecks = (currentDonationDecklist.match(/;/g) || []).length + 1;
        }
        verboseLog(STRINGS.send_state, numberOfDecks, opaqueUserId);
        return currentDonationDecklist;

    }


}

// From hello-world.
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

// From hello-world.
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

/*
*
* getDecks() is the workhorse of the EBS.
* Most users will not cause this function to be called; it will only be called if we suspect our data might be old.
*
* The donation decklist for this channel is stored at channelDonationDecklists[channelId].
* This function clears out whatever was in there (hopefully this doesn't cause a collision?)
* Then it goes to ask google's API for all the rows of the spreadsheet.
* Then it stores the decklists in the channelDonationDecklists[] collection.
*
* Returns a Promise to tell you the number of rows it found.
*
*/
function getDecks(channelId) {

    // Connecting to the google API and getting the results might be slow, so we return a Promise.
    return new Promise(function (fulfill, reject){

        // Connect to the Google API.
        const sheets = google.sheets({version: 'v4', auth: jwtClient});

        // Clear out the donation decklist variable for this channel.
        channelDonationDecklists[channelId] = initialDonationDecklist;

        // Go get the values.
        sheets.spreadsheets.values.get({
            spreadsheetId: '1DuDRgdV0LNJC2YNMJS4K24tds2e-L6F9cZuaSjTC0-0',
            range: 'Magic!A2:F'
        }, function(err, result) {
            if(err) {
                // In this case, Google's API gave us an error.
                verboseLog(STRINGS.gapi_error, err);
                reject(err);
            } else {
                // In this case, result.data.values is an array of rows of data.
                var numRows = result.data.values ? result.data.values.length : 0;
                verboseLog(STRINGS.gapi_success, numRows);

                // Not every row of data represents an actual deck. Keep track of how many decks.
                var numberOfDecks = 0;

                // Loop through all the rows in the spreadsheet looking for decks.
                for (var i = 0; i < numRows; i++) {
                    var row = result.data.values[i];
                    if (String(row[1]) != 'undefined') {   // Rows with blank second columns are not decks.
                        // Append this deck to the donation decklist variable.
                        appendDeck(row, channelId);
                        numberOfDecks += 1;
                    }
                }
                // We made it, so fulfill the Promise to say how many decks there were.
                fulfill(numberOfDecks);
            }
        });
    });

}

// This function takes a row from a Google Sheets API spreadsheet and appends it as a string to the
// current channel's donation decklist. The donation decklist is a semicolon-delimited list.
function appendDeck(row, channelId) {
    let currentDonationDecklist = channelDonationDecklists[channelId] || initialDonationDecklist;

    // We are making a semicolon-delimited list of decks to pass back to the client.
    // The first deck doesn't need a semicolon.
    if (currentDonationDecklist.length > 0) currentDonationDecklist += ';'

    let thisDeck = '';
    for (var i=0; i<row.length; i++) {
        // Each deck is a comma-delimited list of the entries in the row.
        // So make sure the entries in the row don't have any commas or semicolons.
        thisDeck += removeDelimiters(row[i]);
        if (i < row.length - 1) thisDeck += ',';
    }

    // Append the deck to the string channelDonationDecklists[channelId]. We already appended the delimiter earlier.
    channelDonationDecklists[channelId] = currentDonationDecklist + thisDeck;

    return;
}
function removeDelimiters(str) {
    /*
    * ['",;] we want to remove these characters: ' " , ;
    * +       we want to remove any number of these characters.
    * /g      we want to do this for the whole string, not just the first occurrence.
    * ''      we want to replace the characters above with a blank.
    */
    return str.replace(/['",;]+/g, '')
}



(async () => { // we await top-level await ;P

    // this is the route for a new viewer to request the current state.
    server.route({
        method: 'GET',
        path: '/state/query',
        handler: stateQueryHandler
    });

    // Load up our server for the EBS.
    await server.start();
    console.log(STRINGS.server_started, server.info.uri);

    // periodically clear cooldown tracking to prevent unbounded growth due to
    // per-session logged out user tokens
    setInterval(function() { userCooldowns = {} }, userCooldownClearIntervalMs)

})(); // IIFE you know what I mean ;)




