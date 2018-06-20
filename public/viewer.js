
// because who wants to type this every time?
var twitch = window.Twitch.ext;


/*
* The following is setup to be able to access google sheets.
*
* Client ID and API key from the Developer Console.
* IMPORTANT: You need to restrict your Google API key to only be usable from certain IPs or Referrers so you
* don't end up letting everyone in the world use your extension.
*
* Yes, the API Key is here on purpose.
*
* Twitch extensions are served from https://<twitch-client-id>.ext-twitch.com/ so that can help you restrict.
*/
var CLIENT_ID = '113528389247-uaj21g751tq0osm83k9hc2do2ab3f0r1.apps.googleusercontent.com';
var API_KEY = 'AIzaSyBvQ9J6Z5jt89qaszH4SqzrHh_1IePTeBo';
// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        client_id: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: DISCOVERY_DOCS
    }).then(function(response) {
        listDecks();
    }, function(reason) {
        twitch.rig.log('Extension Donation Decklist Error 1: ' + reason.error.message);
        twitch.rig.log(reason.details);
    });
}

/**
*  On load, called to load the Google Docs API client library and populate the table.
*/
function handleClientLoad() {
    gapi.load('client', initClient);
}

function listDecks() {
    // This function should only be called if the promise to create an API client was fulfilled, but check anyway.
    if(!gapi.client) {
        twitch.rig.log('Extension Donation Decklist Error 4: No Google API Client found.')
        return;
    } else {

        // The Google API client exists; let's go get some rows.
        gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: '1DuDRgdV0LNJC2YNMJS4K24tds2e-L6F9cZuaSjTC0-0',
        range: 'Magic!A2:F',
        }).then(function(response) {
            var range = response.result;
            if (range.values.length > 0) {
                for (var i = 0; i < range.values.length; i++) {
                    var row = range.values[i];
                    if (String(row[1]) != 'undefined') {   // Don't display blank rows.
                        appendTable(row);
                    }
                }
                // After the table is created, go back into it and put header rows in for new formats. See decklist.js.
                insertHeaderRows();
                // After that is all done, set up pagination so we aren't scrolling iframe. See pagination.js.
                paginate();
            } else {
                twitch.rig.log('Extension Donation Decklist Error 2: No data found.');
            }
        }, function(response) {
            twitch.rig.log('Extension Donation Decklist Error 3: ' + response.result.error.message);
        });


    }

}

