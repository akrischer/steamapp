module.exports.saveAll = function(objects) {
    Parse.Object.saveAll(objects, {
        success: function(list) {
            return true;
        },
        error: function(error) {
            console.log("Error saving objects:\nCode " + error.code + "\nMessage: " + error.message);
            return false;
        }
    });
};

module.exports.save = function(object) {
    object.save({
        success: function(obj) {
            return true;
        },
        error: function(error) {
            console.log("Error saving object:\nCode " + error.code + "\nMessage: " + error.message);
            return false;
        }
    });
};