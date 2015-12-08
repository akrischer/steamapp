const steamKey = "E812073DDEB4C433E29A9F198A815CE0";
var userObject = Parse.Object.extend('_User');
var steamAccount = Parse.Object.extend('SteamAccount');
var parseUtils = require('cloud/utils/parseUtils.js');

module.exports.get = function(urlParams, response) {
  var steamid;

  var steamQuery = new Parse.Query(steamAccount);
  steamQuery.equalTo('vanity_url', urlParams.userId);
  var userQuery = new Parse.Query(userObject);
  userQuery.matchesQuery('steam_account', steamQuery);
  userQuery.include("steam_account");
  userQuery.find().then(function(data) {
    if(data.length >= 1) {
      var user = data[0];
      response.success({
        'id' : user.id,
        'steam_id' : user.get("steam_account").get("steam_id"),
        'display_name' : user.get("steam_account").get("display_name"),
        'avatar_small' : user.get("steam_account").get("avatar_small_url"),
        'avatar_medium' : user.get("steam_account").get("avatar_medium_url"),
        'avatar_full' : user.get("steam_account").get("avatar_full_url"),
        'created_at' : user.createdAt,
        'updated_at' : user.updatedAt
      });
    }
    else {
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
            acc.fetch().then(function(){
              var newUser = new userObject();
              newUser.set('username', player.personaname);
              newUser.set('password', 'password');
              newUser.set('steam_account', parseUtils.createPointer("SteamAccount", acc.id));
              newUser.save().then(function(obj) {
                obj.fetch().then(function(user){
                  response.success({
                    'id' : user.id,
                    'steam_id' : user.get("steam_account").get("steam_id"),
                    'display_name' : user.get("steam_account").get("display_name"),
                    'avatar_small' : user.get("steam_account").get("avatar_small_url"),
                    'avatar_medium' : user.get("steam_account").get("avatar_medium_url"),
                    'avatar_full' : user.get("steam_account").get("avatar_full_url"),
                    'created_at' : user.createdAt,
                    'updated_at' : user.updatedAt,
                  });
                })
              }, function (err) {
                response.error(err);
              });
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
    }
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
