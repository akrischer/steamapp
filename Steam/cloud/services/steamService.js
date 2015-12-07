// TODO: This stuff should really be stored in a config
const steamKey = "E812073DDEB4C433E29A9F198A815CE0";
const steamBaseUrl = "http://api.steampowered.com/";

var h2j = require('cloud/Dependencies/html2json.js');
var _ = require('underscore');

module.exports.getOwnedGames = function(steamAccount) {
    var url = steamBaseUrl + 'IPlayerService/GetOwnedGames/v0001/?key=' + steamKey;
    url += '&include_appinfo=1&include_played_free_games=0&format=json';
    url += '&steamid=' + steamAccount.get('steam_id');
    console.log("Steam url: " + url);
    return Parse.Cloud.httpRequest({
        method: "GET",
        url: url
    }).then(function(response) {
        return response.data.response.games;
    }, function(error) {
        return error;
    });
};

/**
 * Returns promise for tags for a specific steam game (appid):
 *      [
 *          {
 *              icon_url: ...,
 *              name: ...
 *          }
 *      ]
 * @param gameAppId
 */
module.exports.getTagsForGame = function(gameAppId) {
    var appid = gameAppId;
    //console.log("Getting tags for appid " + gameAppId);
    return Parse.Cloud.httpRequest({
        method: "GET",
        url: "http://store.steampowered.com/app/" + appid
    }).then(function(response) {
        //console.log("getting tags for game '" + gameAppId + "'");
        var jsonResponse = html2json(response.text);

        return Parse.Promise.as(getSteamTags(jsonResponse));
    }, function(error) {
        console.log("Error getting tags for app " + appid);
        _.each(Object.keys(error), function(key) {
            console.log("'" + key + "': '" + error[key] + "'");
        });
        // TODO: Better way to deal with redirects/bypassing age verification?
        if (error.status == 302) {
            return bypassAgeGatePromise(error, appid);
        }
    });
};

function bypassAgeGatePromise(error, appid) {
    return Parse.Cloud.httpRequest({
        method: "GET",
        url: error.headers.Location
    }).then(function(response) {
        // bypass age verification gate
        return Parse.Cloud.httpRequest({
            method: "POST",
            url: "http://store.steampowered.com/agecheck/app/" + appid,
            followRedirects: true,
            body: {
                snr: '1_agecheck_agecheck__age-gate',
                ageDay: 1,
                ageMonth: 'January',
                ageYear: 1980
            },
            headers: {
                Origin: "http://store.steampowered.com",
                Referer: "http://store.steampowered.com/agecheck/app/" + appid,
                "Content-Type": "application/json"
            }
        }).then(function(response) {
            //console.log("getting tags for game '" + gameAppId + "'");
            var jsonResponse = html2json(response.text);

            return Parse.Promise.as(getSteamTags(jsonResponse));
        });


    }, function(error) {
        console.log("Redirect was not successful");
    });
}

function html2json(html) {
    //return JSON.parse(JSON.stringify(h2j.html2json(html, true)).replace(/(\\n|\\r|\\t)+/g, ''));
    return h2j.html2json(html, true)
}

// get Steam-defined steam tags given an html response for a game
function getSteamTags(jsonifiedHtml) {
    var tags = [];
    var steamTagNode = findJsonNode("category_block", jsonifiedHtml, true);
    //console.log(steamTagNode);
    for (var i = 0; i < steamTagNode.child.length; i++) {
        var ele = steamTagNode.child[i];
        var tagMatch = ele.text.match(/>.*<\/a>/);
        if (tagMatch) {
            var tagName = ele.text.match(/>.*<\/a>/)[0].replace('>','').replace("</a>",'');
            var newTag = {
                icon_url: ele.child[0].child[0].attr.src,
                name: tagName
            };
            tags.push(newTag);
        }
    }

    return tags;
}
//////////////////////////////////
// http://stackoverflow.com/questions/22222599/javascript-recursive-search-in-json-object
// with modifications by Andrew Krischer 11/30/2015
// Recursively searches for node in a JSON object until it finds node with id.
// If returnParent === True, then it returns the parent object.
function findJsonNode(id, currentNode, returnParent, parent) {
    var i,
        currentChild,
        result;

    if (id == currentNode.id) {
        return returnParent ? parent : currentNode;
    } else {

        // Use a for loop instead of forEach to avoid nested functions
        // Otherwise "return" will not work properly

        // children is the attributes on the current node. However, Object.keys(primitive)
        // throws an exception, so set children to empty list if currentNode is a primitive.
        var children = (currentNode !== null && typeof currentNode === 'object') ? Object.keys(currentNode) : [];
        for (i = 0; i < children.length; i += 1) {
            // new child is currentNode[key]
            currentChild = currentNode[children[i]];

            // Search in the current child
            result = findJsonNode(id, currentChild, returnParent, currentNode);

            // Return the result if the node has been found
            if (result !== false) {
                return result;
            }
        }

        // The node has not been found and we have no more options
        return false;
    }
}