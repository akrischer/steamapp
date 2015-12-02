var respond = require('cloud/utils/respond.js');
var parseUtils = require('cloud/utils/parseUtils.js');

var Question = Parse.Object.extend('Question');

var questions = [
    {
        "criterion_id": 1,
        "questions": [
            {
                "id": 1,
                "tag": {
                    "id": 1,
                    "display_tag": "short game",
                    "hidden_tag": "short"
                },
                "text": "Do you want to play a short game?",
                "responses": [
                    {
                        "text": "Yes",
                        "valence": 1
                    },
                    {
                        "text": "No",
                        "valence": -1
                    }
                ]
            },
            {
                "id": 2,
                "tag": {
                    "id": 1,
                    "display_tag": "short game",
                    "hidden_tag": "short"
                },
                "text": "Do you LIKE shorter games?",
                "responses": [
                    {
                        "text": "Yes",
                        "valence": 1
                    },
                    {
                        "text": "No",
                        "valence": -1
                    }
                ]
            }
        ]
    }
];

module.exports.get = function(urlParams, response) {
    var includeOnly = urlParams.include_only | [];
    // map includeOnly to become array of pointers to Criterion
    includeOnly = parseUtils.createListOfPointers("Criterion", includeOnly);

    var query = new Parse.Query(Question);
    query.include('tag');
    query.equalTo("enabled", true);
    query.descending('createdAt');
    if (includeOnly.length > 0) {
        query.containedIn('criterion', includeOnly);
    }
    respond.success(response, questions);
};