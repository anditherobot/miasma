import { COLORS, DEPTH } from './Constants.js';
import Sentinel from '../entities/Sentinel.js';
import Stabilizer from '../entities/Stabilizer.js';

export default class LevelBuilder {
    constructor(scene) {
        this.scene = scene;
        this.tileSize = 40; // 40x40 pixel tiles
    }

    build(mapData, mapId, entrySide) {
        const height = mapData.length;
        const width = mapData[0].length;
        const floorTexture = mapId === 'OUTSIDE' ? 'grassTexture' : 'metalTexture';
        
        this.gates = [];
        this.defaultSpawn = { x: 400, y: 300 };

        // 1. Collect all entities and gates
        mapData.forEach((row, y) => {
            [...row].forEach((char, x) => {
                const posX = x * this.tileSize + (this.tileSize / 2);
                const posY = y * this.tileSize + (this.tileSize / 2);

                // Always place floor
                this.scene.add.image(posX, posY, floorTexture)
                    .setDepth(DEPTH.BG)
                    .setPipeline('Light2D');

                if (char === 'G') {
                    this.gates.push({ x: posX, y: posY });
                    this.spawnEntity(char, posX, posY);
                } else if (char === 'P') {
                    this.defaultSpawn = { x: posX, y: posY };
                } else if (char !== '.') {
                    this.spawnEntity(char, posX, posY);
                }
            });
        });

        // 2. Place player based on entry logic
        if (entrySide === 'LEFT') {
            // Entered from Right gate of previous room, find the Left gate here
            const leftGate = this.gates.sort((a, b) => a.x - b.x)[0];
            this.scene.player.setPosition(leftGate.x + this.tileSize * 2, leftGate.y);
        } else if (entrySide === 'RIGHT') {
            // Entered from Left gate of previous room, find the Right gate here
            const rightGate = this.gates.sort((a, b) => b.x - a.x)[0];
            this.scene.player.setPosition(rightGate.x - this.tileSize * 2, rightGate.y);
        } else {
            this.scene.player.setPosition(this.defaultSpawn.x, this.defaultSpawn.y);
        }
    }

    spawnEntity(char, x, y) {
        switch (char) {
            case 'W': // Wall
                const wall = this.scene.add.rectangle(x, y, this.tileSize, this.tileSize, COLORS.WALL)
                    .setDepth(DEPTH.WALLS)
                    .setPipeline('Light2D');
                this.scene.physics.add.existing(wall, true); // Static body
                this.scene.walls.add(wall);
                break;

            case 'G': // Gate/Door
                const gate = this.scene.add.sprite(x, y, 'portalTexture')
                    .setDepth(DEPTH.WALLS)
                    .setPipeline('Light2D');
                
                this.scene.gateGroup.add(gate); // Adds to StaticGroup -> Creates Static Body

                // pulsing effect
                this.scene.tweens.add({
                    targets: gate,
                    alpha: 0.5,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1
                });
                break;

            case 'P': // Handled in build loop now
                break;

            case 'S': // Stabilizer
                this.scene.stabilizer.setPosition(x, y);
                break;

            case 'E': // Enemy (Sentinel)
                // We assume 'sentinels' array exists on scene
                const sentinel = new Sentinel(this.scene, x, y, this.scene.player, this.scene.walls, this.scene.missiles);
                this.scene.sentinels.push(sentinel);
                break;
            
            case 'C': // Clean/Safe Zone
                this.scene.cleanWall.setPosition(x, y);
                break;

            case '.': // Empty Floor - Handled in main loop
            default:
                break;
        }
    }
}
