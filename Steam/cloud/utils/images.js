module.exports.getBaseDomainUrl = function(domainClass) {
  return "http://steamappmedia.parseapp.com/images/domain/" + domainClass;
};

/**
 * Get the Steam-generated image URL for a particular steam game
 * @param steamGameAppId - The STEAM appid for a game. This is different than Parse.Game.id
 * @param hash - The generated hash (by Steam) for a particular image.
 * @returns {string} - Full public URL of image
 */
module.exports.getSteamGameImageUrl = function(steamGameAppId, hash) {
  return "http://media.steampowered.com/steamcommunity/public/images/apps/" + steamGameAppId + "/" + hash + ".jpg";
};