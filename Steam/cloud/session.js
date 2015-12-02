var _ = require('underscore');
var parseUtils = require('cloud/utils/parseUtils.js');
var respond = require('cloud/utils/respond.js');
var game = require('cloud/game.js');

var Session = Parse.Object.extend('Session');

/**
 * Prototype for how to construct a session response
 *  - session
 *  - games
 */
function SessionResponse(session, games) {
    this.session = session;
    this.games = games;
}

// Before any session saves, it will go through this function.
// If response.success, it saves as normal.
// If response.error, it will fail the save.
Parse.Cloud.beforeSave("Session", function(request, response) {
    var body = request.params ? request.params.body : null;
    // if Session.status is being udpated...
    if (body && body.status) {
        // make sure it's a valid value
        if (body.status === 'OPEN' || body.status === 'CLOSED') {
            response.success();
        } else {
            response.error("Session.status must either be 'OPEN' or 'CLOSED'.");
        }
    } else {
        response.success();
    }
});

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

    var results = new SessionResponse(null, null);

    openSessionsQuery.first().then(function(session) {
        results.session = session;

        var userGamesQuery = game.getAllUserGamesQuery(userId, session.get('exclude_games'), session.get('exclude_tags'));

        return userGamesQuery.find();
    }).then(function(userGames) {
            // We want Game objects not UserGame objects, so flatten UserGame -> Game
            results.games = _.map(userGames, function(ug) {
                return ug.get('game');
            });
            // send the session coupled with the games
            respond.success(response, results, 'Session')
    }, function(error) {
            console.log("ERROR: GET Session.\nurlParams = " + urlParams + "\nerror " + error.code + ": " + error.message);
            response.error("Error " + error.code + ": " + error.message);
        }
    )
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

    var results = new SessionResponse(null, null);

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
        var userPtr = new Parse.User();
        userPtr.id = userId;

        // create, populate, and save new session
        var newSession = new Session();
        newSession.set('user_id', userPtr);
        newSession.set('status', 'OPEN');
        newSession.set('exclude_tags', []);
        newSession.set('exclude_games', []);
        return newSession.save();
    }).then(function(session) {
        results.session = session;

        var userGamesQuery = game.getAllUserGamesQuery(userId, [], []);

        return userGamesQuery.find();
    }).then(function(userGames) {
        // We want Game objects not UserGame objects, so flatten UserGame -> Game
        results.games = _.map(userGames, function(ug) {
            return ug.get('game');
        });
        // send the session coupled with the games
        respond.success(response, session, 'Session');
    }, function(error) {
        response.error(error);
    });
};

/**
 * Possible updatable fields:
 *      exclude_games
 *      exclude_tags
 *      status
 *
 * Note: fields only updated if non-null!
 * @param body
 * @param response
 */
module.exports.update = function(body, response) {
    var userId = body['userId'];
    var sessionId = body['sessionId'];

    if (!userId) {
        // NOT FOUND
        response.status = 404;
        response.error("Error: No user ID given -- '" + body['userId'] + "'");
        return;
    }

    var results = new SessionResponse(null, null);

    var sessionQuery = getSessionQuery(userId, sessionId);

    sessionQuery.first().then(function(session) {
        if (body['exclude_games']) {
            session.set('exclude_games', body['exclude_games']);
        }
        if (body['exclude_tags']) {
            session.set('exclude_tags', body['exclude_tags']);
        }
        if (body['status']) {
            session.set('status', body['status']);
        }

        if (session.dirty()) {
            return session.save();
        } else {
            return Parse.Promise.as(session);
        }
    }).then(function(session) {
        results.session = session;

        var userGamesQuery = game.getAllUserGamesQuery(userId, session.get('exclude_games'), session.get('exclude_tags'));

        return userGamesQuery.find();
    }).then(function(userGames) {
        // We want Game objects not UserGame objects, so flatten UserGame -> Game
        results.games = _.map(userGames, function(ug) {
            return ug.get('game');
        });
        // send the session coupled with the games
        respond.success(response, results, 'Session');
    }, function(error) {
        response.error(error);
    })
};

/**
 * @param userId - Parse user id
 * @returns {Parse.Query} - Query object that will get all open sessions when ran
 */
function getAllOpenSessionsQuery(userId) {
    var userPtr = parseUtils.createPointer('_User', userId);

    var query = new Parse.Query(Session);
    query.include('user_id.steam_account');
    query.equalTo("user_id", userPtr);
    query.equalTo('status', 'OPEN');
    query.descending('createdAt');

    return query;
}

function getSessionQuery(userId, sessionId) {
    var userPtr = parseUtils.createPointer('_User', userId);

    var query = new Parse.Query(Session);
    query.include('user_id.steam_account');
    query.equalTo("user_id", userPtr);
    query.equalTo('objectId', sessionId);

    return query;
}