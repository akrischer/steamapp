var parseUtils = require('cloud/utils/parseUtils.js');
var steamService = require('cloud/services/steamService.js');
var respond = require('cloud/utils/respond.js');
var _ = require('underscore');

var Game = Parse.Object.extend('Game');
var UserGame = Parse.Object.extend('UserGame');
var Tag = Parse.Object.extend('Tag');
var SteamAccount = Parse.Object.extend('SteamAccount');

module.exports.get = function(urlParams, response) {
    var userId = urlParams['userId'];

    if (!userId) {
        // NOT FOUND
        response.status = 404;
        response.error("Error: No user ID given");
        return;
    }
    var user = null;

    var userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('objectId', userId);
    userQuery.include('steam_account');

    userQuery.first().then(function(_user) {
        user = _user;
        var steamAccountId = user.get('steam_account').id;
        var steamAccountQuery = new Parse.Query(SteamAccount);
        steamAccountQuery.equalTo('objectId', steamAccountId);

        return steamAccountQuery.first();
    }).then(function(steamAccount) {
        if (!user.all_games_in_db_verified) {
            console.log("!user.all_games_in_db_verified");
            // get games from steam
            return steamService.getOwnedGames(steamAccount).then(function (games) {
                //console.log("returned from steam: " + games);
                if (Array.isArray(games)) {
                    var promises = [];
                    console.log("games array from steam length: " + games.length);
                    // foreach game:
                    _.each(games, function (game) {
                            // add Game row if not there (and save it's id)
                            var gameQuery = new Parse.Query(Game);
                            gameQuery.equalTo('app_id', game.appid);
                            var _game = null;

                            // execute query chain
                            var promise = gameQuery.first().then(function (foundGame) {
                                // we need to save our result and then call getOrCreateTags, and THEN construct our game.
                                _game = foundGame;
                                return steamService.getTagsForGame(game.appid);
                            }).then(function(steamTags) {
                                return getOrCreateTags(steamTags);
                            }).then(function(tags) {
                                if (_game) {
                                    console.log("found game in db already!");
                                    return Parse.Promise.as(_game);
                                } else {
                                    console.log("creating new game '" + game.name + "' with appid '" + game.appid + "'");
                                    // create new game object
                                    var newGame = new Game();
                                    newGame.set('app_id', game.appid);
                                    newGame.set('name', game.name);
                                    newGame.set('icon_url', game.img_icon_url);
                                    newGame.set('box_art_url', game.img_logo_url);
                                    newGame.set('tags', tags);
                                    return newGame.save();
                                }
                            }).then(function (newGame) {
                                // add UserGame row if not there
                                var gamePtr = parseUtils.createPointer('Game', newGame.id);
                                var userGameQuery = new Parse.Query(UserGame);
                                userGameQuery.include('game');
                                userGameQuery.equalTo('game', gamePtr);
                                userGameQuery.equalTo('user', parseUtils.createPointer('_User', userId));
                                return userGameQuery.first();
                            }).then(function (foundUserGame) {
                                if (foundUserGame) {
                                    return foundUserGame.get('game');
                                } else {
                                    // create a new UserGame
                                    var newUserGame = new UserGame();
                                    newUserGame.set('user', parseUtils.createPointer('_User', userId));
                                    newUserGame.set('game', foundUserGame.get('game'));
                                    return foundUserGame.save();
                                }
                            });
                        promises.push(promise);
                    });
                    return Parse.Promise.when(promises);
                }
            }, function(error) {
                console.log("STEAM ERROR! " + error.message);
            }).then(function(userGames) {
                var games = _.map(userGames, function(ug) {
                    return ug.get('game');
                });
                return Parse.Promise.as(games);
            });
        } else {
            console.log("all games for user verified!");
            // all games are verified to be in db!
            var userGamesQuery = new Parse.Query(UserGame);
            userGamesQuery.equalTo('user', user);
            userGamesQuery.include('game');
            return userGamesQuery.find().then(function (userGames) {
                // map UserGames -> Games
                var results = _.map(userGames, function (userGame) {
                    return userGame.get('game');
                });
                return Parse.Promise.as(results);
            });
        }
    }).then(function(games) {
        respond.success(response, games, 'Game');
    }, function(error) {
        response.error(error);
    })

};

function getGamesFromSteam() {

}

// returns list of pointers to tags (or tag ids)
function getOrCreateTags(jsonTags) {
    return Parse.Promise.as().then(function() {
        var list = _.map(jsonTags, function(tag) {
            var tagQuery = new Parse.Query(Tag);
            tagQuery.equalTo('name', tag.name);

            tagQuery.first().then(function(foundTag) {
                if (foundTag) {
                    return parseUtils.createPointer('Tag', foundTag.id);
                } else {
                    // create a new tag!
                    var newTag = new Tag();
                    newTag.set('name', tag.name);
                    newTag.set('icon_url', tag.icon_url);
                    return newTag.save();
                }
            });
        });
        return Parse.Promise.as(list);
    });
}

module.exports.getAllUserGamesQuery = function(userId, excludeGamesArray, excludeTagsArray) {
    var userPtr = parseUtils.createPointer('_User', userId);
    var gamePtrs = parseUtils.createListOfPointers('Game', excludeGamesArray);
    var tagPtrs = parseUtils.createListOfPointers('Tag', excludeTagsArray);

    // get all the games that should be blacklisted
    var blacklistGamesQuery = new Parse.Query(Parse.Object.extend('Game'));
    blacklistGamesQuery.containedIn('tags', tagPtrs);

    var userGamesQuery = new Parse.Query(UserGame);
    userGamesQuery.include('game');
    userGamesQuery.equalTo('user', userPtr);
    userGamesQuery.notContainedIn('game', gamePtrs);
    userGamesQuery.doesNotMatchQuery('game', blacklistGamesQuery);

    return userGamesQuery;
};