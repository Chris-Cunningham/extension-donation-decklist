# extension-donation-decklist
A twitch extension that aims to help manage donation decklists for streamers.

## Motivation
Some card game streamers keep a list of decklists in a Google Sheet that they plan to play later.

Instead of repeatedly linking their chat to the google sheet, the streamer can activate this extension to
directly show the list to the viewers.

## Initializing the EBS
The EBS runs just like hello-world: run `node services/backend`, with the following command line arguments: `-c <client id>`, `-s <secret>`, `-o <owner id>`

The backend expects to find the file `services/privateSettings.json` to help it connect to the Google API using a Service Account.

## Nuts and Bolts
When the client (viewer.html) loads, it uses viewer.js to connect to the EBS (which is at servies/backend.js).

The EBS checks whether it has recently asked Google's API for the spreadsheet for this channel. If it hasn't,
the API is queried and the results are sent back. If it already has recently, the cached results from the last
query are sent back.

The client then uses decklist.js to parse the results, which are a huge string, into a nice-looking table of decks.
