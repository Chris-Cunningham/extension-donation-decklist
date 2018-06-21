// The domains listed here need to be explicitly allowed on the extension's Whitelisted Panel URLs.
const acceptableDomains = ['tappedout.net',
                           'twitter.com',
                           'deckstats.net',
                           'tcgplayer.com',
                           'mtgtop8.com',
                           'streamdecker.com',
                           'twimg.com',
                           'imgur.com',
                           'mtggoldfish.com',
                           'deckedbuilder.com'];

/**
* Append a row element to the content-tbody displaying the results of the API call.
*
* @param {row} a row from a JSON parsed published Google spreadsheet feed.
*/
function appendTable(row) {
    // Here is how we find the relevant things out of the row.
    var deckFormat = row.gsx$format.$t,
        deckName = row.gsx$deckname.$t,
        deckPoints = row.gsx$totaldemocracy.$t,
        deckLink = row.gsx$decklink.$t,
        deckMoneyPoints = row.gsx$bonusweight.$t,
        deckDatePoints = deckPoints - deckMoneyPoints,
        stringForVotes;
    var tbl = document.getElementById('content-tbody');

    // Make a row in the table to put things in.
    var r = tbl.insertRow(-1);

    // Set up the class for CSS.
    r.className = 'extension-decklist-deck';

    // Start out with all rows invisible. pagination.js will fix this.
    r.style.display = 'none';

    // Label the title so we can get category headers inserted later.
    r.title = deckFormat;

    // insertCell(-1) creates a new cell at the end of the row.
    // Make a cell that has the deck name and might have the deck link.
    createCell(r.insertCell(-1), deckName, 'deck-with-link', deckLink);
    // Make a cell with the number of votes.
    stringForVotes = deckPoints + ' ($' + deckMoneyPoints + ' + ' + deckDatePoints + ' day';
    if (deckDatePoints != 1) {
        stringForVotes += 's)';
    } else {
        stringForVotes += ')';
    }
    createCell(r.insertCell(-1), stringForVotes);

}

// create DIV element and append to the table cell.
function createCell(cell, text, chosenClass, possibleURL) {

    var div = document.createElement('div')        // create DIV element
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

// Insert all the header rows. This function assumes that all the decklists are already in the table.
function insertHeaderRows() {
    var tbl = document.getElementById('content-tbody'),
        previousRowFormat,
        thisRowFormat,
        i;

    /** We need to loop through the table in reverse, because when we add rows to the table, we are going
    * to change the indexes where things need to be added. For example, if the table is
    *
    * 0 Modern deck
    * 1 Modern deck
    * 2 Legacy Deck
    * 3 Vintage Deck
    *
    * then we need headers at locations 0, 2, and 3. But if you start with inserting a row at 0,
    * then you actually need 0, 3, and 4. And then it keeps changing. Looping in reverse fixes this issue.
    */

    for (i = tbl.rows.length - 1; i >= 0; i--) {
        thisRowFormat = tbl.rows[i].title;

        // The bottom row of the table shouldn't trigger a new header that says "blank."
        if (i === tbl.rows.length - 1) {
            previousRowFormat = thisRowFormat;
        } else {
            if (thisRowFormat !== previousRowFormat) {
                insertHeaderRow(previousRowFormat, i + 1);
                previousRowFormat = thisRowFormat;
            }
        }
    }
    // There will always be a header row at the top. This is the price of looping in reverse.
    insertHeaderRow(previousRowFormat, 0);
}

/**
* Insert a row element into the content-tbody at position rowPosition that is a header for the given format.
*
* @param {stringFormat} a string that represents the format name.
* @param {rowPosition} an integer that gives the location of the row to be inserted.
*/
function insertHeaderRow(stringFormat, rowPosition) {
    // Make a row in the table to put things in.
    var tbl = document.getElementById('content-tbody'),
        r = tbl.insertRow(rowPosition),
        c1 = r.insertCell(-1),
        columnsInTable = 2;

    // The first row just says the format name.
    // Let the CSS control what this looks like except set its column span.
    r.className = 'extension-decklist-format-header';
    c1.colSpan = columnsInTable;
    createCell(c1, stringFormat);
    // Start out with all rows invisible. pagination.js will fix this.
    r.style.display = 'none';
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

function decklistShouldIncludeLinks() {
    // In a panel extension, it is ok to have links. Otherwise no.
    return extensionType() === 'Panel';
}

function isAcceptableHost(str) {
    // If we are allowed to show deck links at all, then check whether the domain is in the accepted list.
    if (decklistShouldIncludeLinks()) {
        return acceptableDomains.indexOf(extractRootDomain(str)) >= 0
    }
}


