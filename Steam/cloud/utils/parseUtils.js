/**
 Various utils for Parse-specific problems
 */

module.exports.createPointer = function(className, objectId) {
    var ptr = new Parse.Object.extend(className);
    ptr.id = objectId;
    return ptr;
};

module.exports.createListOfPointers = function(className, objectIdList) {
    var pointers = [];
    for (var i = 0; i < objectIdList.length; i++) {
        pointers.push(this.createPointer(className, objectIdList[i]));
    }
    return pointers;
};