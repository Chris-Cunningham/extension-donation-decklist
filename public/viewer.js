var token = "";
var tuid = "";
var ebs = "";
var HOST_URL = 'https://localhost:8081/state/'

// because who wants to type this every time?
var twitch = window.Twitch.ext;

// create the request options for our Twitch API calls
var requests = {
    get: createRequest('GET', 'query')
};

function createRequest(type, method) {
    return {
        type: type,
        url: HOST_URL + method,
        success: updateBlockState,
        error: logError
    }
}

function setAuth(token) {
    Object.keys(requests).forEach((req) => {
        twitch.rig.log('Setting auth headers');
        requests[req].headers = { 'Authorization': 'Bearer ' + token }
    });
}

twitch.onContext(function(context) {
    twitch.rig.log(context);
});

twitch.onAuthorized(function(auth) {
    // save our credentials
    token = auth.token;
    tuid = auth.userId;

    // enable all the buttons that have class "extension-decklist-button" once we are auth'd.
    var x = document.getElementsByClassName("extension-decklist-button");
    var i;
    for (i = 0; i < x.length; i++) {
        x[i].removeAttr('disabled');
    }

    setAuth(token);
    $.ajax(requests.get);
});

function logError(_, error, status) {
  twitch.rig.log('EBS request returned error '+status+' ('+error+')');
}

function logSuccess(hex, status) {
  // we could also use the output to update the block synchronously here,
  // but we want all views to get the same broadcast response at the same time.
  twitch.rig.log('EBS request returned success '+hex+' ('+status+')');
}

function updateBlockState(state) {
    twitch.rig.log('Updating block state');
    // Currently this doesn't do anything
}

function decodeState(state) {
    // Takes a string as input and returns an object that has the components of the state.
    // For us that will eventually be a list of how many votes each deck has.
    return {}
}

$(function() {
    // When we click the refresh button, we want to clear out the table body and make a new data request.
    $('RefreshButton').click(function() {
        if(!token) { return twitch.rig.log('Not authorized'); }
        twitch.rig.log('Requesting a new set of data.');
        // This removes all the <tr>s from the body, leaving the header row intact.
        $("#content-table tbody tr").remove();
        $.ajax(requests.get);
    });

    // listen for incoming broadcast message from our EBS
    twitch.listen('broadcast', function (target, contentType, message) {
        twitch.rig.log('Received broadcast state: '+message);
        updateBlockState(message);
    });
});
