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
var _ = require('underscore');
var images = require('cloud/utils/images.js');

module.exports.success = function(response, resource) {
    var className = Array.isArray(resource) && resource.length > 0 ? resource[0].className : resource.className;
    // TODO: Please, find something better than eval
    response.success(eval(className)(resource));
};


function Session(resource) {
    if (Array.isArray(resource)) {
        var list = [];
        for (var i = 0; i < resource.length; i++) {
            list.push(_Session(resource[i]));
        }
        return list;
    } else {
        return _Session(resource);
    }

    function _Session(session) {
        const deepIncludeExclude = false;

        var steamAccount = session.get('user_id').get('steam_account');
        var gameLibrary = steamAccount.get('game_library');

        var exclude_tags = deepIncludeExclude ? Tag(session.get('exclude_tags')) : session.get('exclude_tags').map(function(t){return t.id;});
        var exclude_games = deepIncludeExclude ? Game(session.get('exclude_games')) : session.get('exclude_games').map(function(g){return g.id;});
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
        // return object that'll actually be marshalled
        return {
            id: session.id,
            status: session.get('status'),
            exclude_tags: exclude_tags,
            exclude_games: exclude_games,
            games_count: games.length,
            games: Game(games)
        };
    }

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

function Criterion(resource) {
    if (Array.isArray(resource)) {
        var list = [];
        for (var i = 0; i < resource.length; i++) {
            list.push(_Criterion(resource[i]));
        }
        return list;
    } else {
        return _Criterion(resource);
    }
    function _Criterion(criterion) {
        return {
            id: criterion.id,
            icon_url: _getIconUrl(criterion.get('name')),
            name: criterion.get('name'),
            tags: Tag(criterion.get('tags'))
        };
    }
    function _getIconUrl(criterionName) {
        return images.getBaseDomainUrl('criterion') + "/" + criterionName + ".png";
    }
}