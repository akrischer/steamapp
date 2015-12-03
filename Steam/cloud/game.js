var parseUtils = require('cloud/utils/parseUtils.js');
var steamService = require('cloud/services/steamService.js');
var respond = require('cloud/utils/respond.js');

var Game = Parse.Object.extend('Game');
var UserGame = Parse.Object.extend('UserGame');
var Tag = Parse.Object.extend('Tag');

module.exports.get = function(urlParams, response) {
    var userId = urlParams['userId'];

    if (!userId) {
        // NOT FOUND
        response.status = 404;
        response.error("Error: No user ID given");
        return;
    }

    var results = [];

    var userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('objectId', userId);

    userQuery.first().then(function(user) {
        if (!user.all_games_in_db_verified) {
            // get games from steam
            games = steamService.getOwnedGames(user);
            if (Array.isArray(games)) {
                // foreach game:
                _.each(games, function(game) {
                    // add Game row if not there (and save it's id)
                    var gameQuery = new Parse.Query(Game);
                    gameQuery.equalTo('app_id', game.appid);

                    // execute query chain
                    gameQuery.first().then(function(foundGame) {
                        if (foundGame) {
                            return Parse.Promise.as(foundGame);
                        } else {
                            // create new game object
                            var newGame = new Game();
                            newGame.set('app_id', game.appid);
                            newGame.set('name', game.name);
                            newGame.set('icon_url', game.img_icon_url);
                            newGame.set('box_art_url', game.img_logo_url);
                            newGame.set('tags', getOrCreateTags(steamService.getTagsForGame(game.appid)));
                            return newGame.save();
                        }
                    }).then(function(newGame) {
                        // add game to results array
                        results.push(newGame);

                        // add UserGame row if not there
                        var gamePtr = parseUtils.createPointer('Game', newGame.id);
                        var userGameQuery = new Parse.Query(UserGame);
                        userGameQuery.equalTo('game', gamePtr);
                        userGameQuery.equalTo('user', parseUtils.createPointer('_User', userId));
                        return userGameQuery.first();
                    }).then(function(foundUserGame) {
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
                });

            }
        } else {
            // all games are verified to be in db!
            var userGamesQuery = new Parse.Query(UserGame);
            userGamesQuery.equalTo('user', user);
            userGamesQuery.include('game');
            userGamesQuery.find().then(function(userGames) {
                // map UserGames -> Games
                _.each(userGames, function(userGame) {
                    results.push(userGame.get('game'));
                })
            })
        }
        return Parse.Promise.as(results);
    }).then(function(games) {
        respond.success(response, results, 'Game');
    }, function(error) {
        response.error(error);
    })

};

function getGamesFromSteam() {

}

// returns list of pointers to tags (or tag ids)
function getOrCreateTags(jsonTags) {
    return _.map(jsonTags, function(tag) {
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