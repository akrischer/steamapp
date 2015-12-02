const GET = "GET";
const PUT = "PUT";
const POST = "POST";

var user = require('cloud/user.js');
var game = require('cloud/game.js');
var question = require('cloud/question.js');
var session = require('cloud/session.js');
var criterion = require('cloud/criterion.js');
var steam = require('cloud/services/steamService.js');

// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Team 'what\'s our name?' says hello!");
});

function debugSuccessServeResponse(verb, uri, response) {
  response.success("Successful '" + verb + "' request to uri '" + uri + "'.");
}

Parse.Cloud.define("serve", function(request, response) {
    var uri = request.params.uri;
    var verb = request.params.verb;
    var urlParams = request.params.urlParams ? request.params.urlParams : {};
    var body = request.params.body ? request.params.urlParams : {};

    // because no elvis operator in js...
    var uriResources = getResourceIds(uri);
    uriResources = uriResources ? uriResources : {};

    urlParams = combineObjects(uriResources, urlParams);
    body = combineObjects(uriResources, body);

    console.log("urlParams['userId'] = " + urlParams['userId']);

  switch(true) {
    // /v1/users/$userId
    case /\/?v1\/users\/[0-9a-zA-Z]+\/?$/.test(uri) && verb === GET:
        // GET      /v1/users/$userId
        user.get(urlParams, response);
        break;

    // /v1/user
    case /\/?v1\/user\/?$/.test(uri) && verb === POST:
        // POST     /v1/users/$userId
        user.create(body, response);

    // /v1/users/$userId/games
    case /\/?v1\/users\/[0-9a-zA-Z]+\/games\/?$/.test(uri) && verb === GET:
        // GET      /v1/users/$userId/games
        game.get(urlParams, response);
        break;

    // /v1/users/$userId/session
    case /\/?v1\/users\/[0-9a-zA-Z]+\/session\/?$/.test(uri) && verb === GET:
        // GET      /v1/users/$userId/session
        session.get(urlParams, response);
        break;

    // /v1/users/$userId/session
    case /\/?v1\/users\/[0-9a-zA-Z]+\/session\/?$/.test(uri) && verb === POST:
        // POST     /v1/users/$userId/session
        session.create(body, response);
        break;

    // /v1/users/$userId/session/$sessionId
    case /\/?v1\/users\/[0-9a-zA-Z]+\/sessions\/[0-9a-zA-Z]+\/?$/.test(uri) && verb === PUT:
        // PUT      /v1/users/$userId/sessions/$sessionId
        session.update(body, response);
        break;

    // /v1/criteria
    case /\/?v1\/criteria\/?$/.test(uri) && verb === GET:
        // GET      /v1/criteria
        criterion.get(urlParams, response);
        break;

    // /v1/questions
    case /\/?v1\/questions\/?$/.test(uri) && verb === GET:
        // GET      /v1/questions
        question.get(urlParams, response);
        break;

    case /debug_steamtags/.test(uri):
        break;

    default:
      response.error("Could not find mapping for action '" + verb + "' to uri '" + uri + "'.");
  }
});

function getResourceIds(uri) {
    var resourceIds = {};
    var sessionIdRegex = /sessions\/(.*(?=\/)).*/;
    var userIdRegex = /users\/(.*(?=\/)).*/;

    if (sessionIdRegex.test(uri)) {
        //console.log("Found resource id for session: " + uri.match(sessionIdRegex)[1]);
        resourceIds["sessionId"] = uri.match(sessionIdRegex)[1];
    }
    if (userIdRegex.test(uri)) {
        //console.log("Found resource id for user: " + uri.match(userIdRegex)[1]);
        resourceIds["userId"] = uri.match(userIdRegex)[1];
    }

    return resourceIds;
}

function combineObjects(obj1, obj2) {
    var keys = Object.keys(obj1);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        //console.log("Looping through map: current key = " + key);
        if (!obj2.hasOwnProperty(key)) {
            //console.log("Adding key '" + key + "' with value '" + obj1[key] + "' to object ");
            Object.defineProperty(obj2, key, {
                value : obj1[key],
                writable: true,
                enumerable: true,
                configurable: true
            });
            //console.log("obj1[key] = " + obj1[key]);
        }
    }
    return obj2;
}

