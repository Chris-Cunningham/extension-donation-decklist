
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
function handleParsedData(parsedJSON) {

    var range = parsedJSON.feed.entry;
    if (range.length > 0) {

        var maxcolumns = 0,
            rowasarray = [],
            longestrowasarray = [];

         // We need to find out what the columns are called. So find the row with the most columns.
         // The reason we have to do this is that if a row has a blank column, that column isn't even mentioned in the row.
        for (var i = 0; i < range.length; i++) {
            rowasarray = range[i].content.$t.split(',').map(s => s.trim());
            if (rowasarray.length > maxcolumns) {
                maxcolumns = rowasarray.length;   // So far, this is the maximum columns in a row.
                longestrowasarray = rowasarray;   // And this is the longest row found so far.
            }
        }

        // The longest row as array has the following setup at the start:
        // Total points // Deck name // Deck link // Format // Bonus Money
        // The longest row as an array has the column names in it before the first colon in each entry.
        var columnnames = longestrowasarray.map(s=> s.split(':', 1))
        // Bring the first 4 columns of this -- they will be the names corresponding to Deck name // Deck link // Format // Bonus Money
        if (maxcolumns < 4) return false; // If we never found 4 columns, something has gone horribly wrong.
        var columnnamestouse = columnnames.slice(0,4)

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