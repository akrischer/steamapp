var images = require('cloud/utils/images.js');

module.exports.get = function(urlParams, response) {
    var criteria = [
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
    response.success(criteria);
};

function getImageUrl(criterionName) {
    return images.getBaseDomainUrl('criterion') + "/" + criterionName + ".png";
}