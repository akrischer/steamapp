const steamKey = "E812073DDEB4C433E29A9F198A815CE0";

module.exports.get = function(urlParams, response) {
    var steamid;
    Parse.Cloud.httpRequest({
      method: "GET",
      url: "http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=" + steamKey + "&vanityurl=" + urlParams.userId
    }).then(function(response) {
      //success
      steamid = response.steamid;
      Parse.Cloud.httpRequest({
        method: "GET",
        url: "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" + steamKey + "&steamids=" + steamid
      }).then(function(data) {
        //success
        response.success(response);
      }, function(data) {
        response.error("incorrect vanity url");
      });
    }, function(response) {
      //failure
      response.error("incorrect vanity url");
    });



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
