var images = require('cloud/utils/images.js');
var parseUtils = require('cloud/utils/parseUtils.js');

var Game = Parse.Object.extend('Game');
var UserGame = Parse.Object.extend('UserGame');

module.exports.get = function(urlParams, response) {
    var games = [
        {
            "id": 1,
            "name": "Call of Duty 4: Modern Warfare",
            "game_version": 2,
            "achievements_count": 12,
            "icon_url": images.getSteamGameImageUrl("7940", "b40c43b0b14b7e124553e0220581a1b9ef8e38bf"),
            "box_art_url": images.getSteamGameImageUrl("7940", "a4bd2ef1a993631ca1290a79bd0dd090349ff3e2"),
            "sort_criteria": {
                "id": 1,
                "metacritic_score": 88,
                "price": 50.0
            }
        },
        {
            "id": 3,
            "name": "Dota 2",
            "game_version": 1,
            "achievements_count": 40,
            "icon_url": images.getSteamGameImageUrl("570", "0bbb630d63262dd66d2fdd0f7d37e8661a410075"),
            "box_art_url": images.getSteamGameImageUrl("570", "d4f836839254be08d8e9dd333ecc9a01782c26d2"),
            "sort_criteria": {
                "id": 2,
                "metacritic_score": 94,
                "price": 0
            }
        },
        {
            "id": 12,
            "name": "Saints Row: The Third",
            "game_version": 1,
            "achievements_count": 0,
            "icon_url": images.getSteamGameImageUrl("55230", "ec83645f13643999e7c91da75d418053d6b56529"),
            "box_art_url": images.getSteamGameImageUrl("55230", "1129528455a8b297fb6404cbb90e802a62881b11"),
            "sort_criteria": {
                "id": 1,
                "metacritic_score": null,
                "price": 50.0
            }
        }
    ];
    response.success(games);

};

module.exports.getAllGamesQuery = function(userId, excludeGamesArray, excludeTagsArray) {
    var userPtr = parseUtils.createPointer('_User', userId);
    var gamePtrs = parseUtils.createListOfPointers('Game', excludeGamesArray);
    var tagPtrs = parseUtils.createListOfPointers('Tag', excludeTagsArray);

    // a list of games whose 1 or more tags are in excludeTagsArray
    var blacklistedGamesQuery = new Parse.Query(UserGame);
    blacklistedGamesQuery.contains('game.tag', tagPtrs);

    var query = new Parse.Query(UserGame);
    query.equalTo('user', userPtr);
    query.notContainedIn('game', gamePtrs);
    // Basically, exclude any UserGames whose objectId matches the objectId from the blacklistedGamesQuery
    query.doesNotMatchKeyInQuery('objectId', 'objectId', blacklistedGamesQuery);

    return query;
}