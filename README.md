# extension-donation-decklist
A twitch extension that aims to help manage donation decklists for streamers.

## Motivation
Some card game streamers keep a list of decklists in a Google Sheet that they plan to play later.

Instead of repeatedly linking their chat to the google sheet, the streamer can activate this extension to
directly show the list to the viewers.

## Nuts and Bolts
When the client (viewer.html) loads, it uses viewer.js to connect to the published google spreadsheet as a JSON.

The client then uses decklist.js to parse the results of the Google API call into a nice-looking table of decks.

pagination.js goes through the table and figures out how to display it as a set of fixed-length pages so there is no scrolling.
