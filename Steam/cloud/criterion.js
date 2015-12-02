var images = require('cloud/utils/images.js');
var respond = require('cloud/utils/respond.js');

var Criterion = Parse.Object.extend('Criterion');

var stubbed_criteria = [
    {
        "id": 1,
        "tags": [
            {
                "id": 1,
                "display_tag": "short game",
                "hidden_tag": "short"
            },
            {
                "id": 3,
                "display_tag": "casual",
                "hidden_tag": "casual"
            }
        ],
        "name": "Time",
        "icon_url": getImageUrl("Time")
    },
    {
        "id": 2,
        "tags": [
            {
                "id": 2,
                "display_tag": "Multiplayer",
                "hidden_tag": "co-op"
            }
        ],
        "name": "Co-Op",
        "icon_url": getImageUrl("Co-Op")
    }
];

module.exports.get = function(urlParams, response) {
    var query = new Parse.Query(Criterion);
    query.include('tags');
    query.equalTo("enabled", true);
    query.descending('createdAt');

    query.find().then(function(resources) {
        respond.success(response, resources)
    }, function(error) {
        response.error(error);
    });
};

function getImageUrl(criterionName) {
    return images.getBaseDomainUrl('criterion') + "/" + criterionName + ".png";
}