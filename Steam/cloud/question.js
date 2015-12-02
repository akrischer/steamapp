module.exports.get = function(urlParams, response) {
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

    response.success(questions);
};