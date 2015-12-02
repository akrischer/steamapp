var images = require('cloud/utils/images.js');

module.exports.get = function(urlParams, response) {
    var games = [
        {
            "id": 1,
            "name": "Call of Duty 4: Modern Warfare",
            "game_version": 2,
            "achievements_count": 12,
            "icon_url": images.getSteamGameImageUrl("7940", "b40c43b0b14b7e124553e0220581a1b9ef8e38bf"),
            "box_art_url": images.getSteamGameImageUrl("7940", "a4bd2ef1a993631ca1290a79bd0dd090349ff3e2"),
            "sort_criteria": {
                "id": 1,
                "metacritic_score": 88,
                "price": 50.0
            }
        },
        {
            "id": 3,
            "name": "Dota 2",
            "game_version": 1,
            "achievements_count": 40,
            "icon_url": images.getSteamGameImageUrl("570", "0bbb630d63262dd66d2fdd0f7d37e8661a410075"),
            "box_art_url": images.getSteamGameImageUrl("570", "d4f836839254be08d8e9dd333ecc9a01782c26d2"),
            "sort_criteria": {
                "id": 2,
                "metacritic_score": 94,
                "price": 0
            }
        },
        {
            "id": 12,
            "name": "Saints Row: The Third",
            "game_version": 1,
            "achievements_count": 0,
            "icon_url": images.getSteamGameImageUrl("55230", "ec83645f13643999e7c91da75d418053d6b56529"),
            "box_art_url": images.getSteamGameImageUrl("55230", "1129528455a8b297fb6404cbb90e802a62881b11"),
            "sort_criteria": {
                "id": 1,
                "metacritic_score": null,
                "price": 50.0
            }
        }
    ];
    response.success(games);

};