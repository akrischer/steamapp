var parseUtils = require('cloud/utils/parseUtils.js');
var steamService = require('cloud/services/steamService.js');
var respond = require('cloud/utils/respond.js');
var _ = require('underscore');
var errors = require('cloud/utils/errors.js');

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

    var userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('objectId', userId);
    userQuery.include('steam_account');

    userQuery.first().then(function(user) {
        if (!user.get('all_games_in_db_verified')) {
            response.error(errors.USER_NOT_INITIALIZED);
        } else {
            var userGamesQuery = new Parse.Query(UserGame);
            userGamesQuery.equalTo('user', parseUtils.createPointer('_User', user.id));
            userGamesQuery.include('game.tags,game.sort_criteria');
            return userGamesQuery.find();
        }
    }).then(function(userGames) {
        if (userGames) {
            var games = _.map(userGames, function(ug) {
                return ug.get('game');
            });

            respond.success(response, games, 'Game');
        }
    });
};

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