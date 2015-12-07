var SteamAppError = function(code, message){
    this.code = code;
    this.message = message;
};

module.exports.USER_NOT_INITIALIZED = new SteamAppError(1, 'User\'s data has not yet been initialized.');