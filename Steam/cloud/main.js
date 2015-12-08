const GET = "GET";
const PUT = "PUT";
const POST = "POST";

var user = require('cloud/user.js');
var game = require('cloud/game.js');
var question = require('cloud/question.js');
var session = require('cloud/session.js');
var criterion = require('cloud/criterion.js');
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
    Parse.Cloud.useMasterKey();

    var userId = request.params.user_id;
    var userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('objectId', userId);
    userQuery.include('steam_account');

    userQuery.first().then(function(user) {
        //return Parse.User.become(parseUser.getSessionToken()).then(function(user) {
            user.set('all_games_in_db_verified', true);
            return user.save().then(function(user) {
                return getGamesPromises(user.get('steam_account')).then(function(games) {
                    return createAndSaveNewGamesPromise(games).then(function(newgame) {
                        console.log("newgame :" + newgame);
                        // finally, create and save user game objects
                        return createAndSaveNewUserGamesPromise(games, user).then(function(newusergame) {
                                console.log("new usergame = " + newusergame);
                            },
                            function(error) {
                                console.log("Something went wrong saving new user games");
                                console.log(error);
                                status.error(error.code.toString());
                            });
                    }, function() {
                        console.log("Something went wrong saving new games");
                    });
                }, function() {
                    console.log("Something went wrong in getGamesPromises");
                });
            }, function() {
                console.log("Something went wrong saving the user");
            });
    }).then(function() {
        status.success();
    }, function(error) {
        status.error("Something went wrong updating user info");
        console.log(error);
    });
});

function createAndSaveNewUserGamesPromise(games, user) {
    console.log("got to save new user game func");
    console.log("games.length = " + games.length);
    var gamesQuery = new Parse.Query(Game);
    gamesQuery.containedIn('app_id', _.map(games, function(g) { return g.get('app_id').toString(); }));

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
    console.log("Any games have undefined 'app_id'?  " + _.some(games, function(g) { return g.app_id == null; }));
    query.containedIn('app_id', _.map(games, function(g) { return g.get('app_id').toString(); }));
    return query.find().then(function(parseGames) {
        console.log("parseGames.length = " + parseGames.length);
        var gamesToSave = _.filter(games, function(game) {
            var parseGameAppIds = _.map(parseGames, function(g) { return g.get('app_id'); });
            return !_.contains(parseGameAppIds, game.app_id.toString());
        });

        //console.log("gamesToSave.length = " + gamesToSave.length);
        var promise = Parse.Promise.as();
        _.each(gamesToSave, function(game) {
            promise = promise.then(function() {
                var tagsQuery = game.tagQuery;
                return tagsQuery.find().then(function(parseTags) {
                    console.log("Found " + parseTags.length + " tags for game " + appid);
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
        return promise;
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
    return steamService.getOwnedGames(steamAccount).then(function (games) {
        var getTagsPromises = _.map(games, function (game) {
            return steamService.getTagsForGame(game.appid);
        });

        // propagate games
        getTagsPromises.push(games);
        return Parse.Promise.when(getTagsPromises)
    }).then(function() {
        var args = _.toArray(arguments);
        var getTagsPromises = args.slice(0, args.length - 1);
        var games = args[args.length - 1];

        console.log("getTagsPromises has " + getTagsPromises.length + " elements");
        getTagsPromises = _.filter(getTagsPromises, function (a) {
            return a != null;
        });
        console.log("Any arguments null in getOwnedGames.getTagsPromises? " + _.some(getTagsPromises, function (a) {
                return a == null
            }));
        console.log("getTagsPromises has " + getTagsPromises.length + " elements");

        // list of unique tags
        var tags = _.map(getTagsPromises, function (appIdAndTag) {
            return appIdAndTag.tags;
        });
        tags = _.flatten(tags);
        tags = _.unique(tags, false, function (tag) {
            return tag.name;
        });

        var tagQuery = new Parse.Query(Tag);

        return Parse.Promise.when([tagQuery.find(), getTagsPromises, tags, games]);
    }).then(function() {
        var parseTags = arguments[0];
        console.log("Found " + parseTags.length + " Parse.Tag objects in DB");
        var parseTagNames = _.map(parseTags, function(parseTag) {
            return parseTag.get('name');
        });
        var getTagsPromises = arguments[1];
        var tags = arguments[2];
        var games = arguments[3];

        var parseTagsToCreate = _.filter(tags, function(tag) {
            return !_.contains(parseTagNames, tag.name);
        });

        var createNewTagsPromises = [];
        _.each(parseTagsToCreate, function(tagInfo) {
            console.log("saving tag '" + tagInfo.name + "'");
            var newTag = new Tag();
            newTag.set('name', tagInfo.name);
            newTag.set('icon_url', tagInfo.icon_url);
            createNewTagsPromises.push(newTag.save());
        });
        // propagate games
        createNewTagsPromises.push(games);
        // add so we can get it in next block
        createNewTagsPromises.push(getTagsPromises);

        return Parse.Promise.when(createNewTagsPromises);
    }, function (error) {
        console.log("Error saving a new tag!")
    }).then(function () {
        var args = _.toArray(arguments);
        var results = [];
        var parseTags = args.slice(0, args.length - 2);
        var getTagsPromises = args[args.length - 1];
        var games = args[args.length - 2];
        console.log("Done saving tags (if any)");

        var gamesArray = _.map(getTagsPromises, function (appIdAndTag) {
            var tagQuery = new Parse.Query(Tag);
            // get the game where game.appid == appIdAndTag.app_id
            var game = _.first(_.filter(games, function (game) {
                return game.appid == appIdAndTag.app_id;
            }));
            var tagNames = _.map(appIdAndTag.tags, function(tag) {
                return tag.name;
            });
            tagQuery.containedIn('name', tagNames);
            return {
                app_id: game.appid,
                name: game.name,
                icon_url: game.img_icon_url,
                box_art_url: game.img_logo_url,
                tagQuery: tagQuery
            }
        });
        _.each(gamesArray, function (game) {
            var newlyMadeSteamGame = new SimpleMapPrototype();
            newlyMadeSteamGame.set('app_id', game.app_id);
            newlyMadeSteamGame.set('name', game.name);
            newlyMadeSteamGame.set('icon_url', game.img_icon_url);
            newlyMadeSteamGame.set('box_art_url', game.img_logo_url);
            // TODO: Sort Criteria
            newlyMadeSteamGame.set('tagQuery', game.tagQuery);
            results.push(newlyMadeSteamGame);
        });

        return Parse.Promise.as(results)
    }, function (error) {
        console.log("Something went wrong setting up SimpleMapPrototype for games");
    });
}

