/**
* As we loop through the decks, we want to keep track of what the previous format was so we know
* whether to make a header row.
*/
var EXTENSION_DONATION_DECKLIST_PREVIOUS_FORMAT = '';

/**
* The following is setup to be able to access google sheets.
*/

// Client ID and API key from the Developer Console
var CLIENT_ID = '113528389247-uaj21g751tq0osm83k9hc2do2ab3f0r1.apps.googleusercontent.com';
var API_KEY = 'AIzaSyAgTnnhamUN5hkryKuc9N5qNlyZHer3VJ4';
// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

/**
*  On load, called to load the Google Docs API client library.
*/
function handleClientLoad() {
    gapi.load('client', initClient);
}

/**
*  Initializes the Google Docs API client library.
*/
function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        client_id: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: DISCOVERY_DOCS
    }).then(function(response) {
        listDecks();
    }, function(reason) {
        twitch.rig.log('Extension Donation Decklist Error 1: ' + reason.result.error.message);
    });
}


/**
* Append a row element to the content-table displaying the results of the API call.
*
* @param {row} a row from a Google Sheets API spreadsheet read.
*/
function appendTable(row) {
    // Here is how we find the relevant things out of the row.
    var deckFormat = row[3],
        deckName = row[1],
        deckPoints = row[0],
        deckLink = row[2],
        deckMoneyPoints = row[4],
        deckDate = row[5]
    var tbl = document.getElementById('content-table');

    // If this is the first row of a new format, make a new format row.
    if (formatOfLastRow() != deckFormat) {
        appendCategoryLine(deckFormat);
        thisIsAnOddRow = true;
    }

    // Make a row in the table to put things in.
    var r = tbl.insertRow(-1);
    r.className = 'extension-decklist-deck';

    // insertCell(-1) creates a new cell at the end of the row.
    // Make a cell that has the deck name and might have the deck link.
    createCell(r.insertCell(-1), deckName, 'deck-with-link', deckLink);
    // Make a cell with the number of votes.
    deckDatePoints = deckPoints - deckMoneyPoints;
    createCell(r.insertCell(-1), deckPoints + ' ($' + deckMoneyPoints + ' + ' + deckDatePoints + ' days)');

    // Keep track of what we did last.
    EXTENSION_DONATION_DECKLIST_PREVIOUS_FORMAT = deckFormat;

}

/**
* Append a row element to the content-table that is a header for the given format.
*
* @param {stringFormat} a string that represents the format name.
*/
function appendCategoryLine(stringFormat) {
    // Make a row in the table to put things in.
    var tbl = document.getElementById('content-table'),
        r1 = tbl.insertRow(-1),
        c1 = r1.insertCell(-1),
        r2 = tbl.insertRow(-1),
        c2 = r2.insertCell(-1),
        c3 = r2.insertCell(-1),
        columnsInTable = 2;


    // The first row just says the format name.
    // Let the CSS control what this looks like except set its column span.
    r1.className = 'extension-decklist-format-header';
    c1.colSpan = columnsInTable;
    createCell(c1, stringFormat);

    // The second row says we are looking at Decks and Democracy Points.
    // Let the CSS control what this looks like except set its column span.
    r2.className = 'extension-decklist-column-headings';
    createCell(c2, 'Deck');
    createCell(c3, 'Democracy');

}

/**
* Extracts the root domain from a URL. From https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
*
* @param {domain} a string that is supposedly the hostname.
*/
function extractRootDomain(domain) {
    var splitArr = domain.split('.'),
        arrLen = splitArr.length;

    //extracting the root domain here
    //if there is a subdomain
    if (arrLen > 2) {
        domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
        //check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
        if (splitArr[arrLen - 2].length == 2 && splitArr[arrLen - 1].length == 2) {
            //this is using a ccTLD
            domain = splitArr[arrLen - 3] + '.' + domain;
        }
    }
    return domain;
}

/**
* Look at the last row of the content-table and figure out what format it is.
*/
function formatOfLastRow() {
    // Right now this is stored in a global variable.
    return EXTENSION_DONATION_DECKLIST_PREVIOUS_FORMAT;
}

// create DIV element and append to the table cell. If voteButtonText is not null, we will make a button!
function createCell(cell, text, chosenClass, possibleURL) {

    var div = document.createElement('div') // create DIV element
    if (chosenClass) div.className = chosenClass;  // If they gave us a class, set it.

    // See https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
    // This tries to tell if a string is a URL by asking the browser to parse
    // it as a URL. If the result goes to a different host, the string is probably a URL.
    if (possibleURL) {
        var a  = document.createElement('a');
        a.href = possibleURL;
        if (a.host && a.host != window.location.host && isAcceptableHost(a.host)) {
            a.text = text;
            a.target = "_blank";
            div.appendChild(a);    // The anchor element here is valid, so use it!
        } else {
            var txt = document.createTextNode(text); // create text node, it turned out this wasn't a URL.
            div.appendChild(txt);                    // append text node to the DIV
        }
    } else {
        // No one gave us a potential URL, so just put in the text node.
        var txt = document.createTextNode(text); // create text node, it turned out this wasn't a URL.
        div.appendChild(txt);                    // append text node to the DIV
    }
    cell.appendChild(div);                       // append DIV to the table cell
}

function isAcceptableHost(str) {
    var acceptableDomains = ['tappedout.net', 'twitter.com', 'deckstats.net', 'tcgplayer.com', 'mtgtop8.com', 'streamdecker.com', 'twimg.com', 'mtggoldfish.com'];
    return acceptableDomains.indexOf(extractRootDomain(str)) >= 0
}

/**
* Print the decklists from a specific spreadsheet:
* https://docs.google.com/spreadsheets/d/1DuDRgdV0LNJC2YNMJS4K24tds2e-L6F9cZuaSjTC0-0
*/
function listDecks() {
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
        } else {
            twitch.rig.log('Extension Donation Decklist Error 3: No data found.');
        }
    }, function(response) {
        twitch.rig.log('Extension Donation Decklist Error 2: ' + response.result.error.message);
    });
}
