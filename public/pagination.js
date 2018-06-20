/*
* This function is called after the table has been created and its header rows have been inserted.
*
* Its job is to populate the div class="pagination" with anchors that point to various pages of the table,
* or hide the pagination elements entirely if there is only one page.
*
*/

function paginate() {
    var tbl = document.getElementById('content-table'),
        rowsPerPage = getRowsPerPage(),
        pageStartLocations = [],
        div = document.getElementById('paginationDiv'),
        i;

    if (tbl.rows.length <= rowsPerPage) {
        // We only have one page, so kill all the pagination.
        div.style.display = 'none';
    } else {
        // Start by making the left arrow pagination anchor.
        var leftarrow = document.createElement("A");
        leftarrow.href="#";
        leftarrow.text="<";
        leftarrow.addEventListener("click", function(){ paginationDecrement(); });
        div.appendChild(leftarrow);

        // For each page, make an anchor for the page.
        for (i=0; i<tbl.rows.length/rowsPerPage; i++) {
            var className = '';
            if (i === 0) className = 'active';
            appendAnchorToDiv(i, i*rowsPerPage, rowsPerPage, className || '');
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

function appendAnchorToDiv(pageIndex, startRow, rowsPerPage, className) {
    var tbl = document.getElementById('content-table'),
        div = document.getElementById('paginationDiv'),
        a = document.createElement("A");

        a.href = "#";
        a.id = "paginationLink"+(pageIndex + 1);
        a.text = pageIndex + 1;
        a.addEventListener("click", function(){
            paginationChange(pageIndex + 1);
        });
        a.className = className;
        div.appendChild(a);
}

function paginationChange(pageNumber) {
    var tbl = document.getElementById('content-table'),
        div = document.getElementById('paginationDiv'),
        rowsPerPage = getRowsPerPage(),
        lastHeaderRow = -1,
        r,
        i;

    // "Page 1" should start at row 0.
    var startRow = (pageNumber - 1) * rowsPerPage;

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
    }
    // Loop through all the rows in this page and turn them on. Make sure to stop before we hit the end of the table.
    for (i = startRow; i < startRow + rowsPerPage && i < tbl.rows.length; i++) {

        r = tbl.rows[i];
        r.style.display = 'table-row';
    }
    for (i=startRow + rowsPerPage; i < tbl.rows.length; i++) {
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
        // Otherwise, lower the page by 1.
        paginationChange(c - 1);
    }
}

function paginationIncrement() {
    var c = currentPage(),
        div = document.getElementById('paginationDiv'),
        anchors = div.children;
    // If you increment the page when on the last page, nothing happens.
    if (c < anchors.length - 2) {
        // Otherwise, lower the page by 1.
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


