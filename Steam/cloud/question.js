var respond = require('cloud/utils/respond.js');
var parseUtils = require('cloud/utils/parseUtils.js');
var _ = require('underscore');

var Question = Parse.Object.extend('Question');

module.exports.get = function(urlParams, response) {
    var includeOnly = urlParams.include_only ? urlParams.include_only : [];
    // map includeOnly to become array of pointers to Criterion
    includeOnly = parseUtils.createListOfPointers("Criterion", includeOnly);

    console.log("~-~-~- Include_Only pointers: ~-~-~-");
    _.each(includeOnly, function(ptr) {
        console.log(ptr.id);
    });

    var query = new Parse.Query(Question);
    query.include('tag');
    query.equalTo("enabled", true);
    query.descending('createdAt');
    if (includeOnly.length > 0) {
        query.containedIn('criterion', includeOnly);
    }

    query.find().then(function(questions) {
        respond.success(response, questions, 'Question');
    }, function(error) {
        response.error(error);
    });
};