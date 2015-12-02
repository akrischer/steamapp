module.exports.get = function(urlParams, response) {
    var user = {
        "id": 1,
        "steam_id": 123,
        "display_name": "Petracles",
        "avatar_small": "www.url.com",
        "avatar_medium": "www.url.com",
        "avatar_full": "www.url.com",
        "created_at": "2015-11-16T22:23:48Z",
        "updated_at": "2015-11-16T22:23:48Z"
    };
    response.success(user);
};

module.exports.create = function(body, response) {
    var user = {
        "id": 1,
        "steam_id": 123,
        "display_name": "Petracles",
        "avatar_small": "www.url.com",
        "avatar_medium": "www.url.com",
        "avatar_full": "www.url.com",
        "created_at": "2015-11-16T22:23:48Z",
        "updated_at": "2015-11-16T22:23:48Z"
    };
    response.success(user);
};