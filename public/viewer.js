
// because who wants to type this every time?
var twitch = window.Twitch.ext;

function handleClientLoad() {
    // When the client loads, we can go get the google spreadsheet and use handleParsedData on the result.

    // Note: the google sheet referenced here must be "Published." Do this by going to File --> Publish to Web...
    var publishedSpreadsheetId = '1DuDRgdV0LNJC2YNMJS4K24tds2e-L6F9cZuaSjTC0-0',
        publishedSpreadsheetFeedUrl = "https://spreadsheets.google.com/feeds/list/" + publishedSpreadsheetId + "/od6/public/values?alt=json",
        publishedSpreadsheetHeadUrl = "https://spreadsheets.google.com/feeds/cells/" + publishedSpreadsheetId + "/od6/public/full?min-row=1&max-row=1&min-col=1&max-col=5&alt=json";

    var xmlhttpfeed = new XMLHttpRequest(),
        xmlheadfeed = new XMLHttpRequest(),
        parsedHeadJSON,
        parsedFeedJSON;

    xmlhttpfeed.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            parsedFeedJSON = JSON.parse(this.responseText);
            handleParsedData(parsedHeadJSON, parsedFeedJSON);
        }
    };

    xmlheadfeed.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            parsedHeadJSON = JSON.parse(this.responseText);
            xmlhttpfeed.open("GET", publishedSpreadsheetFeedUrl, true);
            xmlhttpfeed.send();
        }
    };

    xmlheadfeed.open("GET", publishedSpreadsheetHeadUrl, true);
    xmlheadfeed.send();


    if (extensionType() == 'component') {
        // For component extensions, make the toggle-display-on-click part of the page actually toggle part of the display.
        var pagination = document.getElementById('paginationDiv'),
            content    = document.getElementById('content-table'),
            addyourown = document.getElementById('addYourOwnDiv'),
            toggler = document.getElementById('toggle-display-on-click');
        toggler.addEventListener("click", function() {
            toggleDisplay(pagination);
            toggleDisplay(content);
            toggleDisplay(addyourown);
         });
     }
}


/* Takes a parsed JSON from a google spreadsheet and calls the functions to add decks to the table,
*  create header rows, and paginate the table. */
function handleParsedData(parsedHeadJSON, parsedFeedJSON) {


    var range = parsedFeedJSON.feed.entry;
    if (range.length > 0) {

        // The parsedHeadJSON has the titles of the columns. So extract those.
        var headerRow = parsedHeadJSON.feed.entry,
            columnnamestouse = [];

        for (var j = 1; j < 5; j++) {
            // Column 0 will always be accessed the same way when reading the feed. We need to tell it the names of #1 through 4.
            columnnamestouse.push(headerRow[j].content.$t.toLowerCase().replace(/\s/g, ''))  // Remove spaces and make lowercase.
        }

        for (var i = 0; i < range.length; i++) {
            var row = range[i];
            if (row.content.$t.split(',').length > 2) {   // Don't display blank rows.
                appendTable(row, columnnamestouse);
            }
        }
        // After the table is created, go back into it and put header rows in for new formats. See decklist.js.
        insertHeaderRows();
        // After that is all done, set up pagination so we aren't scrolling iframe. See pagination.js.
        paginate();
    } else {
        twitch.rig.log('Extension Decklist Queue Error: No data found.');
    }
}

// Can we tell whether we are a panel or component extension?
function extensionType() {
    /* var urlParams = new URLSearchParams(location.search);
    return urlParams.get('anchor');*/

    if (document.getElementById('ComponentExtensionContainer') && typeof document.getElementById('ComponentExtensionContainer') === 'object') {
        return 'component';
    } else if (document.getElementById('PanelExtensionContainer') && typeof document.getElementById('PanelExtensionContainer') === 'object') {
        return 'panel';
    } else {
        return 'unknown';
    }

}

// For component extensions, we may need to toggle the display of elements to save space.
function toggleDisplay(obj) {
    if (obj.style.display === 'none') {
        obj.style.display = '';
    } else {
        obj.style.display = 'none';
    }
}

// This used to be inline javascript. Removing it to here.
window.onload = function () {
    handleClientLoad();
}