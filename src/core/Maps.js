export const MAPS = {
    INSIDE: {
        id: 'inside',
        ambientColor: 0x222222, // Dark
        layout: [
            "WWWWWWWWWWWWWWWWWWWW",
            "W..................W",
            "W..E...............W",
            "W..................W",
            "W.......S..........W",
            "W..................W",
            "W..................W",
            "W..................W",
            "W...........P...C..G", // G = Gate to Outside
            "W..................W",
            "W..E...............W",
            "W..................W",
            "W..................W",
            "W..................W",
            "WWWWWWWWWWWWWWWWWWWW"
        ]
    },
    OUTSIDE: {
        id: 'outside',
        ambientColor: 0xffffff, // Bright Daylight
        layout: [
            "WWWWWWWWWWWWWWWWWWWW",
            "W..................W",
            "G..P...............W", // G = Gate back Inside (Left)
            "W..................W",
            "W...F.......F......W", // F = Fruit/Food
            "W..................W",
            "W..................W",
            "W.........E........W", // Outdoor Enemy
            "W..................W",
            "W.......F..........W",
            "W..................W",
            "W..................W",
            "W..................W",
            "W..................W",
            "WWWWWWWWWWWWWWWWWWWW"
        ]
    }
};
