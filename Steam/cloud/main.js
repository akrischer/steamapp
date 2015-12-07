const GET = "GET";
const PUT = "PUT";
const POST = "POST";

var user = require('cloud/user.js');
var game = require('cloud/game.js');
var question = require('cloud/question.js');
var session = require('cloud/session.js');
var criterion = require('cloud/criterion.js');
var steam = require('cloud/services/steamService.js');
var images = require('cloud/utils/images.js');
var _ = require('underscore');

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
    var body = request.params.body ? request.params.body : {};

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
    var sessionIdRegex = /(?:\/sessions\/)([0-9a-zA-Z]+)/;
    var userIdRegex = /(?:\/users\/)([0-9a-zA-Z]+)/;

    if (sessionIdRegex.test(uri)) {
        console.log("Found resource id for session: " + uri.match(sessionIdRegex)[1]);
        resourceIds["sessionId"] = uri.match(sessionIdRegex)[1];
    }
    if (userIdRegex.test(uri)) {
        console.log("Found resource id for user: " + uri.match(userIdRegex)[1]);
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

//////////////////// JOBS ////////////////////
/**
 File for defining jobs relating to games
 */
var _ = require('underscore');
var steamService = require('cloud/services/steamService.js');
var parseUtils = require('cloud/utils/parseUtils.js');

var Game = Parse.Object.extend('Game');
var UserGame = Parse.Object.extend('UserGame');
var Tag = Parse.Object.extend('Tag');

var SimpleMapPrototype = function() {};
SimpleMapPrototype.prototype.get = function(key) {
    return this[key];
};
SimpleMapPrototype.prototype.set = function(key, value) {
    this[key] = value;
};

Parse.Cloud.job("triggerUserData", function(request, status) {
    var userId = request.params.user_id;
    var userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('objectId', userId);
    userQuery.include('steam_account');

    userQuery.first().then(function(user) {
        if (!user.get('get_all_games_in_db_verified')) {
            // get the games from steam
            getGamesPromises(user.get('steam_account')).then(function(games) {
                console.log("games: " + games);
                // from those returned games, create any new tags that we need to
                return createAndSaveNewTagsPromise(games).then(function(newtag) {
                    console.log("newtag: " + newtag);
                    // then create and save any new Game objects
                    return createAndSaveNewGamesPromise(games).then(function(newgame) {
                        console.log("newgame :" + newgame);
                        // finally, create and save user game objects
                        return createAndSaveNewUserGamesPromise(games, user).then(function(newusergame) {
                                console.log("new usergame = " + newusergame);
                            },
                            function(error) {
                                console.log(error);
                                status.error(error.code.toString());
                            });
                    })
                })
            }).then(function() {
                status.success();
            }, function() {
                status.error("Something went wrong inited player data");
            })
        } else {
            status.error("User is already inited");
        }
    })
});

function createAndSaveNewUserGamesPromise(games, user) {
    console.log("got to save new user game func");
    console.log("games.length = " + games.length);
    var gamesQuery = new Parse.Query(Game);
    gamesQuery.containedIn('app_id', _.map(games, function(g) { return g.app_id.toString(); }));

    return gamesQuery.find().then(function(parseGames) {
        // Get all UserGames that the player already has for parseGames
        var userGamesQuery = new Parse.Query(UserGame);
        userGamesQuery.matchesQuery('game', gamesQuery);
        userGamesQuery.equalTo('user', parseUtils.createPointer('_User', user.id));
        return userGamesQuery.find().then(function(parseUserGames) {
           var gameIds = _.map(parseUserGames, function(userGame) {
               return userGame.get('game').id;
           });
            var filteredParseGames = _.filter(parseGames, function(pg) {
                return !_.contains(gameIds, pg.id);
            });

            var promise = Parse.Promise.as();
            _.each(filteredParseGames, function(parseGame) {
                promise = promise.then(function() {
                    var newUserGame = new UserGame();
                    newUserGame.set('user', parseUtils.createPointer('_User', user.id));
                    newUserGame.set('game', parseUtils.createPointer('Game', parseGame.id));
                    return newUserGame.save();
                    //console.log("Saving new usergame for game id '" + parseGame.id + "'");
                });
            });
            return promise;
        });
    })
}

/**
 * Given an object that has all the necessary information for a game,
 * query all games and create and save any new Parse.Game objects that aren't already in the
 * database.
 * @param games - Games of the object type from 'getGamesPromises'
 */
function createAndSaveNewGamesPromise(games) {
    var query = new Parse.Query(Game);
    // find all games that we DO have in the db
    query.containedIn('app_id', _.map(games, function(g) { return g.app_id.toString(); }));
    return query.find().then(function(parseGames) {
        // remove every game in 'games' whose appid is also in parseGames.appid
        //console.log("games.length = " + games.length);
        console.log("parseGames.length = " + parseGames.length);
        var gamesToSave = _.filter(games, function(game) {
            var parseGameAppIds = _.map(parseGames, function(g) { return g.get('app_id'); });
            return !_.contains(parseGameAppIds, game.app_id.toString());
        });

        //console.log("gamesToSave.length = " + gamesToSave.length);
        var promise = Parse.Promise.as();
        _.each(gamesToSave, function(game) {
            promise = promise.then(function() {
                return steamService.getTagsForGame(game.app_id).then(function(tags) {
                    var tagsQuery = new Parse.Query(Tag);
                    tagsQuery.containedIn('name', _.map(tags, function(t) { return t.name; }));

                    return tagsQuery.find().then(function(parseTags) {
                        var parseTagIds = _.map(parseTags, function(t) {
                            return t.id;
                        });

                        var appid = game.app_id.toString();
                        var newGame = new Game();
                        newGame.set('app_id', appid);
                        newGame.set('name', game.name);
                        newGame.set('icon_url', images.getSteamGameImageUrl(appid, game.icon_url));
                        newGame.set('box_art_url', images.getSteamGameImageUrl(appid, game.box_art_url));
                        newGame.set('tags', parseUtils.createListOfPointers('Tag', parseTagIds));
                        // TODO: Sort Criteria
                        return newGame.save();
                    });
                });
            });
        });
        return promise;
    })
}

// ALL of the games
function createAndSaveNewTagsPromise(games) {
    var getTagsPromises = _.map(games, function(game) {
        return steamService.getTagsForGame(game.app_id);
    });

    return Parse.Promise.when(getTagsPromises).then(function() {
        var saveTagPromises = [];
        var promise = Parse.Promise.as();

        // Create a list of tags
        _.each(arguments, function(tags) {
            // [[tag1, tag2], [tag2, tag3]] --> [tag1, tag2, tag2, tag3]
            var tagArray = _.flatten(tags);
            // [tag1, tag2, tag2, tag3] --> [tag1, tag2, tag3]
            tagArray = _.unique(tagArray, function(tag) { return tag.name; });

            //console.log("Tag Array has " + tagArray.length + " elements");
            //console.log("Tag Array: " + tagArray);

            var tagQuery = new Parse.Query(Tag);
            tagQuery.containedIn('name', _.map(tagArray, function(t) { return t.name; }));

            promise = promise.then(function() {
                return tagQuery.find().then(function(parseTags) {
                    var parseTagNames = _.map(parseTags, function(parseTag) {
                        return parseTag.get('name');
                    });

                    // remove all tags that are already in db
                    tagArray = _.filter(tagArray, function(tag) {
                        return !_.contains(parseTagNames, tag.name);
                    })
                }).then(function() {
                    var promise = Parse.Promise.as();
                    _.each(tagArray, function(tag) {
                        console.log("saving tag '" + tag.name + "'");
                        promise = promise.then(function() {
                            var newTag = new Tag();
                            newTag.set('name', tag.name);
                            newTag.set('icon_url', tag.icon_url);
                            newTag.save();
                            saveTagPromises.push(newTag);
                        });
                    });
                    return Parse.Promise.as(saveTagPromises);
                });
            });
        });
        return promise;
    }, function(error) {
        console.log("ERROR - createAndSaveNewTagsPromise");
        _.each(Object.keys(error), function(key) {
            console.log("'" + key + "': '" + error[key] + "'");
        })
    })
}

/**
 * Returns a promise of an array of objects that contain info for games:
 *   - app_id
 *   - name
 *   - icon_url
 *   - box_art_url
 *
 *   NOTE: Tags are calculated separately

 * @returns {Promise.<T>}
 */
function getGamesPromises(steamAccount) {
    var gamesArray = [];
    var results = [];

    return steamService.getOwnedGames(steamAccount).then(function (games) {
        //console.log("returned from steam: " + games);
        if (Array.isArray(games)) {
            gamesArray = games;
            _.each(gamesArray, function(game) {
                var newlyMadeSteamGame = new SimpleMapPrototype();
                newlyMadeSteamGame.set('app_id', game.appid);
                newlyMadeSteamGame.set('name', game.name);
                newlyMadeSteamGame.set('icon_url', game.img_icon_url);
                newlyMadeSteamGame.set('box_art_url', game.img_logo_url);
                // TODO: Sort Criteria
                results.push(newlyMadeSteamGame);
            });
            console.log("LIST OF TAGS: " + arguments);

            console.log("results length = " + results.length);
            return Parse.Promise.as(results)
        }
    });
}

// returns list of tag objects
function createTags(jsonTags) {
    return _.map(jsonTags, function(tag) {
        var newTag = new SimpleMapPrototype();
        newTag.name = tag.name;
        newTag.icon_url = tag.icon_url;
        return newTag;
    });
}

