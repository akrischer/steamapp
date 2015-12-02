const steamKey = "E812073DDEB4C433E29A9F198A815CE0";
var user = Parse.Object.extend('_User');
var steamAccount = Parse.Object.extend('SteamAccount');

module.exports.get = function(urlParams, response) {
    var steamid;

    var userQuery = new Parse.Query(user);
    userQuery.include('steam_account');
    userQuery.equalTo('steam_account.vanityurl', urlParams.userId);
    userQuery.find().then(function(resources) {
      respond.success(resources);
    }, function(resources) {
      Parse.Cloud.httpRequest({
        method: "GET",
        url: "http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=" + steamKey + "&vanityurl=" + urlParams.userId
      }).then(function(data) {
        //success
        steamid = data.data.response.steamid;
        Parse.Cloud.httpRequest({
          method: "GET",
          url: "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" + steamKey + "&steamids=" + steamid
        }).then(function(data) {
          //success
          var player = data.data.response.players[0];
          var newAcc = new steamAccount();
          newAcc.set('acc_visibility_state', 'PUBLIC');
          newAcc.set('avatar_full_url', player.avatarfull);
          newAcc.set('avatar_medium_url', player.avatarmedium);
          newAcc.set('avatar_small_url', player.avatar);
          newAcc.set('display_name', player.personaname);
          newAcc.set('steam_id', parseInt(player.steamid));
          newAcc.set('vanity_url', urlParams.userId);
          newAcc.save().then(function(acc) {
            var newUser = new user();
            newUser.set('username', player.personaname);
            newUser.set('password', 'password');
            newUser.set('steam_account', acc);
            newUser.save().then(function(user) {
              response.success(user);
            }, function (err) {
              response.error(err);
            });
          }, function(err) {
            response.error(err);
          });
        }, function(data) {
          //error
          response.error("incorrect vanity url");
        });
      }, function(data) {
        //failure
        response.error("incorrect vanity url");
      });
  });
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
