/*
* This function is called after the table has been created and its header rows have been inserted.
*
* Its job is to populate the div class="pagination" with anchors that point to various pages of the table,
* or hide the pagination elements entirely if there is only one page.
*
*/

// The main challenge here is knowing where each page actually starts in the table. That is stored here.
let paginationFirstRowOfPage = [0];

function paginate() {
    var tbl = document.getElementById('content-tbody'),
        rowsPerPage = getRowsPerPage(),   // The source HTML file should create this function to tell us how many rows.
        div = document.getElementById('paginationDiv'),
        i,
        numberOfPages = 1,  // We will increment this later.
        rowsOnThisPage = 0; // Same, a counter for trying to figure out where each page will start.

    if (tbl.rows.length <= rowsPerPage) {
        // We only have one page, so kill all the pagination.
        div.style.display = 'none';
    } else {
        // Start by making the left arrow pagination anchor.
        var leftarrow = document.createElement("A");
        leftarrow.href="#";
        leftarrow.text="<";
        leftarrow.addEventListener("click", function(){ paginationDecrement(); });
        div.appendChild(leftarrow);  // Drop the anchor into the page.

        // For each page, make an anchor for the page.
        /* The way the row headings are handled, it ends up being complicated how many pages we actually have.
        *  First of all, if rowsPerPage is 9, it usually doesn't actually display 9 new rows on the page, because
        *  usually it will need to repeat a header row to make sure we can tell what format we are on right now.
        *  But sometimes it does actually display 9 new rows, because sometimes the first row of the page is
        *  actually the first time that the new format has been displayed.
        *  Basically it is kind of a mess.
        *
        *  To even find out how many pages we need, we need to loop through and see which rows would end up getting
        *  displayed on each page.
        */
        // We are simulating the creation of all the pages.
        for (i=0; i<tbl.rows.length; i++) {
            // This is the first row of a new page that is not the first page exactly if rowsOnThisPage is rowsPerPage.
            if (rowsOnThisPage === rowsPerPage) { // So this is the first row of a new page that is not page 1.
                // Remember which row was the start of this page.
                paginationFirstRowOfPage.push(i);
                // Go to a new page.
                rowsOnThisPage = 0;
                numberOfPages++;
                /* If this is the first row of a page and not the first page AND this is NOT a header row,
                *  then we will actually need an extra copy of the old header row here. This means we are actually +1
                * to rows on this page. */
                if (tbl.rows[i].className !== 'extension-decklist-format-header') {
                    rowsOnThisPage += 1;
                }
            }
            // Okay, now this row will get displayed too.
            rowsOnThisPage += 1;
        }
        // At the end, however many pages were generated, that's how many we need. This is in numberOfPages.
        for (i=0; i<numberOfPages; i++) {
            appendAnchorToDiv(i);
        }

        // Then make the right arrow pagination anchor.
        var rightarrow = document.createElement("A");
        rightarrow.href="#";
        rightarrow.text=">";
        rightarrow.addEventListener("click", function(){ paginationIncrement(); });
        div.appendChild(rightarrow);

        // Once this is over, turn to page 1.
        paginationChange(1);
    }
}

function appendAnchorToDiv(pageIndex) {
    // This makes a new anchor and appends it to the pagination div. The anchor has a click event: change to that page.
    var tbl = document.getElementById('content-tbody'),
        div = document.getElementById('paginationDiv'),
        a = document.createElement("A");

        a.href = "#";
        a.id = "paginationAnchor"+(pageIndex + 1);
        a.text = pageIndex + 1;
        a.addEventListener("click", function(){
            paginationChange(pageIndex + 1);
        });
        div.appendChild(a);
}

function paginationChange(pageNumber) {
    var tbl = document.getElementById('content-tbody'),
        div = document.getElementById('paginationDiv'),
        rowsPerPage = getRowsPerPage(),
        lastHeaderRow = -1,
        r,
        i,
        startRow = paginationFirstRowOfPage[pageNumber - 1],
        endRow = startRow + rowsPerPage - 1;

    // Loop through all the rows before this page and turn them off.
    for (i = 0; i < startRow; i++) {
        r = tbl.rows[i];
        // This row is too early to be displayed yet.
        r.style.display = 'none';
        if (r.className === 'extension-decklist-format-header') {
            lastHeaderRow = i;
        }
    }
    // We want to display the last header row before this page if the first row of this page is not a header row.
    if (tbl.rows[startRow].className !== 'extension-decklist-format-header' && lastHeaderRow !== -1) {
        tbl.rows[lastHeaderRow].style.display = 'table-row';
        // This takes up one of the rows, so move back the ending row.
        endRow--;
    }

    // Loop through all the rows in this page and turn them on. Make sure to stop before we hit the end of the table.
    for (i = startRow; i <= endRow && i < tbl.rows.length; i++) {
        r = tbl.rows[i];
        r.style.display = 'table-row';
    }
    for (i=endRow+1; i < tbl.rows.length; i++) {
        r = tbl.rows[i];
        r.style.display = 'none';
    }

    // Now loop through all the pagination anchors and set the good one to active.
    var anchors = div.children;
    // The first and last element here are not eligible, so we start at index 1 and exclude the last element.
    for (i=1; i < anchors.length - 1; i++) {
        // If we want page number "1", that is actually spot 1 in this collection because spot 0 is the left arrow.
        if (i === pageNumber) {
            div.children[i].className = 'active';
        } else {
            div.children[i].className = '';
        }
    }

}

function paginationDecrement() {
    var c = currentPage();
    if (c > 1) {
        // If you decrement the page when on page 1, nothing happens.
        // Otherwise, lower the page by 1. We do this by literally clicking on the correct page number.
        paginationChange(c - 1);
    }
}

function paginationIncrement() {
    var c = currentPage(),
        div = document.getElementById('paginationDiv'),
        anchors = div.children;
    // If you increment the page when on the last page, nothing happens.
    if (c < anchors.length - 2) {
        // Otherwise, raise the page by 1.
        paginationChange(c + 1);
    }
}

function currentPage() {
    // Look at the anchors in the pagination div and find which one is active.
    var div = document.getElementById('paginationDiv'),
        anchors = div.children,
        i;

    for (i=1; i<anchors.length; i++) {
        if (anchors[i].className === 'active') {
            // Note that the left arrow is index 0, so if number "1" is active, then we are on page 1.
            return i;
        }
    }
    return 1;
}


