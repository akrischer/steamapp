/**
 File for defining jobs relating to games
 */
var _ = require('underscore');
var game = require('cloud/game.js');
var steamService = require('cloud/services/steamService.js');
var parseUtils = require('cloud/utils/parseUtils.js');

var Game = Parse.Object.extend('Game');
var UserGame = Parse.Object.extend('UserGame');
var Tag = Parse.Object.extend('Tag');

var SimpleMapPrototype = function() {};
SimpleMapPrototype.prototype.get = function(key) {
 return this[key];
};
SimpleMapPrototype.prototype.set = function(key, value) {
 this[key] = value;
};

Parse.Cloud.job("triggerUserData", function(request, status) {
 var userId = request.params.user_id;
 var userQuery = Parse.Query(Parse.User);
 userQuery.equalTo('objectId', userId);
 userQuery.include('steam_account');

 userQuery.first().then(function(user) {
  if (!user.get('get_all_games_in_db_verified')) {
   // get the games from steam
   getGamesPromises(user.get('steam_account')).then(function(games) {
    // from those returned games, create any new tags that we need to
    return CreateAndSaveNewTagsPromise(games).then(function() {
     // then create and save any new Game objects
     return createAndSaveNewGamesPromise(games).then(function() {
      // finally, create and save user game objects
      return createAndSaveNewUserGamesPromise(games, user);
     })
    })
   }).then(function() {
    status.success();
   }, function() {
    status.error();
   })
  } else {
   status.error();
  }
 })
});

function createAndSaveNewUserGamesPromise(games, user) {
  var userGameSavePromises = [];
  var gamesQuery = Parse.Query(Game);
  gamesQuery.containedIn('app_id', _.map(games, function(g) { return g.app_id; }));

  gamesQuery.find().then(function(parseGames) {
   _.each(parseGames, function(parseGame) {
    var newUserGame = new UserGame();
    newUserGame.set('user', user);
    newUserGame.set('game', parseGame);
    userGameSavePromises.push(newUserGame.save());
   });
   return Parse.Promise.when(userGameSavePromises);
  })
}

/**
 * Given an object that has all the necessary information for a game,
 * query all games and create and save any new Parse.Game objects that aren't already in the
 * database.
 * @param games - Games of the object type from 'getGamesPromises'
 */
function createAndSaveNewGamesPromise(games) {
 var gamesToSavePromises = [];
 var query = Parse.Query(Game);
 // find all games that we DO have in the db
 query.containedIn('appid', _.map(games, function(g) { return g.app_id; }));
 query.find().then(function(parseGames) {
  // remove every game in 'games' whose appid is also in parseGames.appid
  var gamesToSave = _.filter(games, function(game) {
   var parseGameAppIds = _.map(parseGames, function(g) { return g.get('app_id'); });
   return parseGameAppIds.includes(game.app_id);
  });

  return steamService.getTagsForGame(game.appid).then(function(tags) {
   var tagsQuery = new Parse.Query(Tag);
   tagsQuery.containedIn('name', _.map(tags, function(t) { return t.name; }));

   return tagsQuery.find().then(function(parseTags) {
    var parseTagIds = _.map(parseTags, function(t) {
     return t.id;
    });

    _.each(gamesToSave, function(game) {
     var newGame = new Game();
     newGame.set('app_id', game.appid);
     newGame.set('name', game.name);
     newGame.set('icon_url', game.img_icon_url);
     newGame.set('box_art_url', game.img_logo_url);
     newGame.set('tags', parseUtils.createListOfPointers('Tag', parseTagIds));
     // TODO: Sort Criteria
     gamesToSavePromises.push(newGame.save());
    });
    return Parse.Promise.when(gamesToSavePromises);
   });
  });



 })
}

// ALL of the games
function CreateAndSaveNewTagsPromise(games) {
 var getTagsPromises = _.map(games, function(game) {
  return steamService.getTagsForGame(game.appid);
 });

 return Parse.Promise.when(getTagsPromises).then(function() {
  var saveTagPromises = [];
  // Create a list of tags
  _.each(arguments, function(tags) {
   // [[tag1, tag2], [tag2, tag3]] --> [tag1, tag2, tag2, tag3]
   var tagArray = _.flatten(tags);
   // [tag1, tag2, tag2, tag3] --> [tag1, tag2, tag3]
   tagArray = _.unique(flattenedArray, function(tag) { return tag.name; });
   _.each(tagArray, function(tag) {
    var newTag = new Tag();
    newTag.set('name', tag.name);
    newTag.set('icon_url', tag.icon_url);
    saveTagPromises.push(newTag.save());
   })
  });

  return Parse.Promise.when(saveTagPromises);
 })
}

/**
 * Returns a promise of an array of objects that contain info for games:
 *   - app_id
 *   - name
 *   - icon_url
 *   - box_art_url
 *
 *   NOTE: Tags are calculated separately

 * @returns {Promise.<T>}
 */
function getGamesPromises(steamAccount) {
 var gamesArray = [];
 var results = [];

 return steamService.getOwnedGames(steamAccount).then(function (games) {
  //console.log("returned from steam: " + games);
  if (Array.isArray(games)) {
   gamesArray = games;
   _.each(gamesArray, function(game) {
    var newlyMadeSteamGame = new SimpleMapPrototype();
    newlyMadeSteamGame.set('app_id', game.appid);
    newlyMadeSteamGame.set('name', game.name);
    newlyMadeSteamGame.set('icon_url', game.img_icon_url);
    newlyMadeSteamGame.set('box_art_url', game.img_logo_url);
    // TODO: Sort Criteria
    results.push(newlyMadeSteamGame);
   });
   console.log("LIST OF TAGS: " + arguments);

   console.log("results length = " + results.length);
   return Parse.Promise.as(results)
  }
 });
}

// returns list of tag objects
function createTags(jsonTags) {
 return _.map(jsonTags, function(tag) {
  var newTag = new SimpleMapPrototype();
  newTag.name = tag.name;
  newTag.icon_url = tag.icon_url;
  return newTag;
 });
}