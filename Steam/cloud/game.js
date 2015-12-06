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
                    console.log("games array from steam length: " + games.length);
                    var results = [];
                    // foreach game:
                    _.each(games, function (game) {

                        steamService.getTagsForGame(game.appid).then(function (steamTags) {
                            return getOrCreateTags(steamTags);
                        }).then(function (tags) {
                            var newlyMadeSteamGame = {
                                app_id: game.appid,
                                name: game.name,
                                icon_url: game.img_icon_url,
                                box_art_url: game.img_logo_url,
                                tags: tags
                            };
                            results.push(newlyMadeSteamGame);
                        });
                    });
                    return Parse.Promise.as(games);
                }
            })
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