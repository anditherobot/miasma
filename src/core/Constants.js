export const COLORS = {
    PLAYER_CORE: 0xffffff,
    PLAYER_SKIN: 0xff0000,
    PLAYER_INFECTED: 0x00ff00,
    PLAYER_HURT: 0xff0000,
    SENTINEL_CORE: 0x0000ff,
    SENTINEL_RING: 0x00ffff,
    SENTINEL_ALERT: 0xff0000,
    MIASMA: 0x00ff00,
    FOOD: 0xffaa00,
    WALL: 0x555555,
    GATE: 0x444444,
    SAFE_ZONE: 0x00ffcc,
    TEXT: 0xffffff,
    TEXT_ALERT: 0xff0000,
    TEXT_SAFE: 0x00ffcc
};

export const DEPTH = {
    BG: 0,
    GROUND_DECO: 1,
    WALLS: 5,
    FOOD: 6,
    SENTINEL: 10,
    PLAYER: 20,
    UI: 100
};

export const PHYSICS = {
    PLAYER_SPEED: 220,
    PLAYER_RADIUS: 20,
    SENTINEL_RADIUS: 400,
    SENTINEL_CRITICAL_DIST: 250,
    MISSILE_SPEED: 250
};
