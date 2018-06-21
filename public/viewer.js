
// because who wants to type this every time?
var twitch = window.Twitch.ext;

function handleClientLoad() {
    // When the client loads, we can go get the google spreadsheet and use handleParsedData on the result.

    // Note: the google sheet referenced here must be "Published." Do this by going to File --> Publish to Web...
    var publishedSpreadsheetId = '1DuDRgdV0LNJC2YNMJS4K24tds2e-L6F9cZuaSjTC0-0',
        publishedSpreadsheetUrl = "https://spreadsheets.google.com/feeds/list/" + publishedSpreadsheetId + "/od6/public/values?alt=json";

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        var parsedJSON = JSON.parse(this.responseText);
        handleParsedData(parsedJSON);
        }
    };

    xmlhttp.open("GET", publishedSpreadsheetUrl, true);
    xmlhttp.send();

    if (extensionType() === 'Component') {
        // For component extensions, make the toggle-display-on-click part of the page actually toggle part of the display.
        var pagination = document.getElementById('paginationDiv'),
            content    = document.getElementById('content-table'),
            sellout    = document.getElementById('selloutDiv'),
            toggler = document.getElementById('toggle-display-on-click');
        toggler.addEventListener("click", function() {
            toggleDisplay(pagination);
            toggleDisplay(content);
            toggleDisplay(selloutDiv);
         });
     }
}


/* Takes a parsed JSON from a google spreadsheet and calls the functions to add decks to the table,
*  create header rows, and paginate the table. */
function handleParsedData(parsedJSON) {
    var range = parsedJSON.feed.entry;
    if (range.length > 0) {
        for (var i = 0; i < range.length; i++) {
            var row = range[i];
            if (row.gsx$deckname.$t.length > 0) {   // Don't display blank rows.
                appendTable(row);
            }
        }
        // After the table is created, go back into it and put header rows in for new formats. See decklist.js.
        insertHeaderRows();
        // After that is all done, set up pagination so we aren't scrolling iframe. See pagination.js.
        paginate();
    } else {
        twitch.rig.log('Extension Donation Decklist Error: No data found.');
    }
}

// Can we tell whether we are a panel or component extension?
function extensionType() {
    if (document.getElementById('ComponentExtensionContainer')) {
        return 'Component';
    } else if (document.getElementById('PanelExtensionContainer')) {
        return 'Panel';
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