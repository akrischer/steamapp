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
var parseUtils = require('cloud/utils/parseUtils.js');

module.exports.success = function(response, resource, className) {
    // TODO: Please, find something better than eval
    response.success(eval(className)(resource));
};

function handleArrays(resource, callback) {
    if (Array.isArray(resource)) {
        var list = [];
        for (var i = 0; i < resource.length; i++) {
            list.push(callback(resource[i]));
        }
        return list;
    } else {
        return callback(resource);
    }
}

/**
 * @param resource:
 *      This is actually a SessionResponse (see session.js) with a session and list of games:
 *      {
 *          session: <session>,
 *          games: <games>
 *      }
 */
function Session(resource) {
    return handleArrays(resource, _Session);

    function _Session(sessionAndGames) {
        var session = sessionAndGames.session;
        var games = sessionAndGames.games;

        var exclude_tags = session.get('exclude_tags');/*Tag(exclude_tags_ptrs)*///;
        var exclude_games = session.get('exclude_games');/*Game(exclude_game_ptrs)*///;

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
    return handleArrays(resource, _Game);
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
    return handleArrays(resource, _Tag);
    function _Tag(tag) {
        return {
            id: tag.id,
            icon_url: tag.get('icon_url'),
            name: tag.get('name')
        };
    }
}

function Criterion(resource) {
    return handleArrays(resource, _Criterion);
    function _Criterion(criterion) {
        return {
            id: criterion.id,
            icon_url: _getIconUrl(criterion.get('name')),
            name: criterion.get('name'),
            tags: Tag(criterion.get('tags'))
        };
        function _getIconUrl(criterionName) {
            return images.getBaseDomainUrl('criterion') + "/" + criterionName + ".png";
        }
    }

}

function Question(resource) {
    // create a list of just criteria ids
    var criteriaIds = resource.map(function(question) {
       return question.get('criterion').id;
    });

    // Then for each criterion id, filter the questions to find the questions whose criterion id match.
    // Then build the object.
    var listOfQuestionsByCriterionId = [];
    _.each(criteriaIds, function(criterionId) {
        var questions = resource.filter(function(question) {
            return criterionId === question.get('criterion').id;
        });
        // marshall each question
        questions = questions.map(function(q) {
            return _Question(q);
        });

        // build second layer, where each question relates to a criterion
        var newQuestionObject = {
            criterion_id: criterionId,
            questions: questions
        };
        listOfQuestionsByCriterionId.push(newQuestionObject);
    });

    return listOfQuestionsByCriterionId;

    function _Question(question) {
        // correctly format responses
        var responses = question.get('responses').map(function(r) {
            return {
                text: r.text,
                valence: r.valence
            }
        });
        return {
            id: question.id,
            tag: Tag(question.get('tag')),
            text: question.get('text'),
            responses: responses
        }
    }
}