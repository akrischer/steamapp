/**
 Various utils for Parse-specific problems
 */

module.exports.createPointer = function(className, objectId) {
    var ptr = new Parse.Object.extend(className);
    ptr.id = objectId;
    return ptr;
};

module.exports.createListOfPointers = function(className, objectIdList) {
    return objectIdList.map(function(id) {
        return this.createPointer(className, id);
    });
};