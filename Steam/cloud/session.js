var images = require('cloud/utils/images.js');
var _ = require('underscore');

var Session = Parse.Object.extend('Session');

const Status = {
    CLOSED: 1,
    OPEN: 2,
    properties : {
        CLOSED: { name: 'CLOSED' },
        OPEN: { name: 'OPEN' }
    }
};

var stubbedSession = {
    "status": "OPEN",
    "include_tags": [
        {
            "id": 1,
            "display_tag": "short game",
            "hidden_tag": "short"
        }
    ],
    "exclude_tags": [],
    "include_games": [
        {
            "id": 1,
            "name": "Call of Duty 4: Modern Warfare",
            "game_version": 2,
            "achievements_count": 12,
            "icon_url": "www.url.com",
            "box_art_url": "www.url.com",
            "sort_criteria": {
                "id": 1,
                "metacritic_score": 88,
                "price": 50.0
            }
        }
    ],
    "exclude_games": [],
    "games_count": 3,
    "games": [
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
    ]
};

module.exports.get = function(urlParams, response) {
    var userId = urlParams['userId'];

    if (!userId) {
        // NOT FOUND
        response.status = 404;
        response.error("Error: No user ID given");
        return;
    }

    console.log("GET Session: userId = " + userId);

    var openSessionsQuery = getAllOpenSessionsQuery(userId);

    openSessionsQuery.find().then(function(results) {
        response.success(results[0]);
    }, function(error) {
        console.log("ERROR: GET Session.\nurlParams = " + urlParams + "\nerror " + error.code + ": " + error.message);
        response.error("Error " + error.code + ": " + error.message);
    });
};

module.exports.create = function(body, response) {
    var userId = body['userId'];

    if (!userId) {
        // NOT FOUND
        response.status = 404;
        response.error("Error: No user ID given");
        return;
    }

    // close all previous sessions. Return if save fails.
    var openSessionsQuery = getAllOpenSessionsQuery(userId);

    openSessionsQuery.find().then(function(openSessions) {
        // https://parse.com/docs/js/guide#promises-promises-in-series
        // Close every open session for this user
        var promise = Parse.Promise.as();
        _.each(openSessions, function (openSession) {
            // For each open session, close and save it
            promise = promise.then(function() {
                openSession.set('status', 'CLOSED');
                return openSession.save();
            })
        });
        return promise;
    }).then(function() {
        // user ptr to point to correct user
        var userPtr = new Parse.Object.extend("User");
        userPtr.id = userId;

        // create, populate, and save new session
        var newSession = new Session();
        newSession.set('user_id', userPtr);
        newSession.set('status', 'OPEN');
        newSession.set('include_tags', []);
        newSession.set('include_games', []);
        newSession.set('exclude_tags', []);
        newSession.set('exclude_games', []);
        return newSession.save();
    }).then(function(session) {
        response.success(session);
    }, function(error) {
        response.error(error);
    });
};

module.exports.update = function(body, response) {
    response.success(stubbedSession);
};

/**
 * @param userId - Parse user id
 * @returns {Parse.Query} - Query object that will get all open sessions when ran
 */
function getAllOpenSessionsQuery(userId) {
    var userPtr = new Parse.Object.extend("User");
    userPtr.id = userId;

    var query = new Parse.Query(Session);
    query.include('user_id');
    query.equalTo("user_id", userPtr);
    query.equalTo('status', 'OPEN');
    query.descending('createdAt');
    return query;
}