/**
 * Each marshaller is a function that is the resource's class name!
 *
 File for formatting and sending correctly-marshalled JSON responses
    One exposed function:
        - success
    Each take in a resource to marshall. This is the structure of a nonspecific query:

    {
        __type: "Object",
        className: "Session",
        ...
    }

    So queryResult.className will give the appropriate marshaller to use
 **/

/**
 * Calls marshalling function based on className of resource
 * @param response - response object
 * @param resource - resource object that will be marshalled
 */
var parseUtils = require('cloud/utils/parseUtils.js');
var _ = require('underscore');

module.exports.success = function(response, resource, isManyResources) {
    //console.log("----------   SUCCESS ----------");
    //console.log(resource);
    //console.log(resource.result.className);
    if (typeof(isManyResources) === 'undefined') isManyResources = false;

    var className = isManyResources && resource.length > 0 ? resource[0].className : resource.className;

    if (typeof this[className] === 'function') {
        console.log("Make it to className is function");
        this[className](response, resource);
    }
    console.log(typeof this[className]);
    response.success(Session(resource));
};


function Session(resource) {
    const deepIncludeExclude = false;

    var steamAccount = resource.get('user_id').get('steam_account');
    var gameLibrary = steamAccount.get('game_library');

    var include_tags = deepIncludeExclude ? Tag(resource.get('include_tags')) : resource.get('include_tags').map(function(t){return t.id;});
    var exclude_tags = deepIncludeExclude ? Tag(resource.get('exclude_tags')) : resource.get('exclude_tags').map(function(t){return t.id;});
    var include_games = deepIncludeExclude ? Game(resource.get('include_games')) : resource.get('include_games').map(function(g){return g.id;});
    var exclude_games = deepIncludeExclude ? Game(resource.get('exclude_games')) : resource.get('exclude_games').map(function(g){return g.id;});
    var games = gameLibrary.get('games');

    // filter out all games in exclude_games list
    games = games.filter(function(game) {
        return -1 === (exclude_games.map(function(g) {
            return g.id;
        }).indexOf(game.id));
    });
    // filter out all games that have tags in the exclude_tags list
    // first--list of tag ids
    var excludeTagIds = exclude_tags;
    if (deepIncludeExclude) {
        excludeTagIds = exclude_tags.map(function(t) {
            return t.id;
        });
    }
    games = games.filter(function(game) {
        var gameTagIds = game.get('tags').map(function(t) {
            return t.id;
        });
        // True iff none of the game's tag ids are in excludeTagIds
        return !gameTagIds.some(function(id) {
                // True iff any of the game's tags are in excludeTagIds
                return -1 !== excludeTagIds.indexOf(id);
            })
    });
    return {
        id: resource.id,
        status: resource.get('status'),
        include_tags: include_tags,
        exclude_tags: exclude_tags,
        include_games: include_games,
        exclude_games: exclude_games,
        games_count: games.length,
        games: Game(games)
    };
}

function Game(resource) {
    if (Array.isArray(resource)) {
        var list = [];
        for (var i = 0; i < resource.length; i++) {
            list.push(_Game(resource[i]));
        }
        return list;
    } else {
        return _Game(resource);
    }
    function _Game(game) {
        return {
            id: game.id,
            name: game.get('name'),
            game_version: game.get('game_version'),
            achievements_count: game.get('achievements_count'),
            icon_url: game.get('icon_url'),
            box_art_url: game.get('box_art_url'),
            // TODO: Sort criteria implementation
            sort_criteria: {}
        }
    }
}

function Tag(resource) {
    if (Array.isArray(resource)) {
        var list = [];
        for (var i = 0; i < resource.length; i++) {
            list.push(_Tag(resource[i]));
        }
        return list;
    } else {
        return _Tag(resource);
    }
    function _Tag(tag) {
        return {
            id: tag.id,
            icon_url: tag.get('icon_url'),
            name: tag.get('name')
        };
    }
}