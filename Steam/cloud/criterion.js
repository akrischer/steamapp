var images = require('cloud/utils/images.js');
var respond = require('cloud/utils/respond.js');

var Criterion = Parse.Object.extend('Criterion');

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

module.exports.getIconUrl = function(criterionName) {
    return images.getBaseDomainUrl('criterion') + "/" + criterionName + ".png";
};