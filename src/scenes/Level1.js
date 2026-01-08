import Phaser from 'phaser';
import AudioManager from '../core/AudioManager.js';
import AssetGenerator from '../core/Assets.js';
import { COLORS, DEPTH, PHYSICS } from '../core/Constants.js';
import { addNavigationButtons } from '../ui/NavigationButtons.js';

export default class Level1 extends Phaser.Scene {
    constructor() { super('Level1'); }

    init(data) {
        this.currentMapId = data.mapId || 'INSIDE';
        this.entrySide = data.entrySide || 'DEFAULT';
        this.isLevelComplete = false;
    }

    create() {
        // Add Navigation Buttons
        addNavigationButtons(this);

        AudioManager.init();
        this.input.once('pointerdown', () => AudioManager.resume());

        AssetGenerator.generate(this);
        
        // --- HAND TRACKING VISUALIZER ---
        this.handGraphics = this.add.graphics().setDepth(DEPTH.UI + 10);

        // --- GROUPS ---
        this.walls = this.physics.add.staticGroup(); 
        this.missiles = this.physics.add.group();
        this.sentinels = []; // Array, not Group
        this.foodGroup = this.physics.add.group();
        this.gateGroup = this.physics.add.staticGroup(); // Separate group for gates

        // --- BACKGROUND & AESTHETICS ---
        const gameContainer = document.getElementById('game-container');
        
        if (this.currentMapId === 'OUTSIDE') {
            gameContainer.classList.add('level-outside');
            this.starfield = new Starfield(this);
            // Hide grid if it exists or just don't create it
        } else {
            gameContainer.classList.remove('level-outside');
            this.createGrid();
            this.starfield = null;
        }

        // --- ENTITIES ---
        this.player = new Player(this, -100, -100);
        this.stabilizer = new Stabilizer(this, -100, -100);
        
        this.cleanWall = this.add.tileSprite(-100, -100, 40, 600, 'cleanTexture').setDepth(DEPTH.GROUND_DECO);
        this.physics.add.existing(this.cleanWall, true);

        // --- LOAD LEVEL ---
        this.loadLevel(this.currentMapId);

        // --- COLLISIONS ---
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.stabilizer, this.walls);
        
        // Gate Transition
        this.physics.add.overlap(this.player, this.gateGroup, (player, gate) => {
            console.log('Gate Hit!');
            const nextMap = this.currentMapId === 'INSIDE' ? 'OUTSIDE' : 'INSIDE';
            const entrySide = gate.x < 400 ? 'RIGHT' : 'LEFT'; // If we hit a left gate, we enter from the right in next room
            this.scene.restart({ mapId: nextMap, entrySide: entrySide });
        });

        // Stabilizer Logic
        this.physics.add.overlap(this.player, this.stabilizer, () => {
            this.player.stabilize();
            // Status update handled in update()
        });

        // Global Missile Logic
        this.physics.add.collider(this.missiles, this.walls, (obj1, obj2) => {
            const missile = this.missiles.contains(obj1) ? obj1 : obj2;
            this.destroyMissile(missile);
        });
        
        this.physics.add.overlap(this.missiles, this.player, (player, missile) => {
            AudioManager.playSound('sizzle');
            player.takeDamage(0.15);
            this.destroyMissile(missile);
        });

        // Safe Zone Interaction
        this.physics.add.overlap(this.player, this.cleanWall, () => this.handleSafeZone());

        // Food System
        this.time.addEvent({ delay: 2000, callback: this.spawnFood, callbackScope: this, loop: true });
        this.physics.add.overlap(this.player, this.foodGroup, (p, f) => this.handleEat(f));

        // --- UI (DOM) ---
        this.uiIntegrityCircle = document.querySelector('.circle.progress');
        this.uiIntegrityText = document.querySelector('.percentage');
        this.uiZoneText = document.querySelector('.zone-info .highlight');
        
        if (this.uiZoneText) this.uiZoneText.innerText = this.currentMapId;
        
        // Events
        this.events.on('player-dead', this.handleGameOver, this);
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    createGrid() {
        const width = 800;
        const height = 600;
        const gridSize = 50;
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        
        graphics.lineStyle(1, 0x00ffff, 0.1); // Cyan, low opacity
        
        for (let x = 0; x <= width; x += gridSize) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSize) {
            graphics.moveTo(0, y);
            graphics.lineTo(width, y);
        }
        
        graphics.generateTexture('gridTexture', width, height);
        this.add.image(0, 0, 'gridTexture').setOrigin(0).setDepth(DEPTH.BG);
    }

    loadLevel(mapKey) {
        const mapData = MAPS[mapKey];
        
        // Lighting
        this.lights.enable().setAmbientColor(mapData.ambientColor);

        // Background Color (Sky vs Lab)
        // Handled mostly by CSS, but we can tint the grid or add overlay if needed
        // Keeping camera bg transparent or matching
        if (mapKey === 'OUTSIDE') {
            this.cameras.main.setBackgroundColor('#000000'); // Keep dark for neon contrast
        } else {
            this.cameras.main.setBackgroundColor('#000000');
        }

        // Build Map
        const builder = new LevelBuilder(this);
        builder.build(mapData.layout, mapKey, this.entrySide);
        this.gateGroup.refresh();
    }

    update(time, delta) {
        // --- HAND TRACKING DEBUG ---
        this.handGraphics.clear();
        const landmarks = handTrackingInstance.getLandmarks();
        if (landmarks && landmarks.length > 0) {
            this.handGraphics.fillStyle(0x00ff00, 1);
            for (const hand of landmarks) {
                for (const point of hand) {
                    this.handGraphics.fillCircle(point.x * 800, point.y * 600, 5);
                }
            }
        }

        if (this.starfield) this.starfield.update();
        
        this.player.update(this.cursors);
        this.stabilizer.update(time, delta);
        this.sentinels.forEach(s => s.update(time, delta));

        // Global Missile Update (Homing)
        [...this.missiles.getChildren()].forEach(m => {
            if (m.active) {
                this.physics.moveToObject(m, this.player, PHYSICS.MISSILE_SPEED);
                if (m.trail) m.trail.setPosition(m.x, m.y);
                
                // Bounds Check
                if (m.x < 0 || m.x > 800 || m.y < 0 || m.y > 600) {
                    this.destroyMissile(m);
                }
            }
        });

        // UI Updates
        if (this.uiIntegrityText) {
            const integrity = Math.round(this.player.massIntegrity * 100);
            this.uiIntegrityText.innerText = `${integrity}%`;
        }
        
        if (this.uiIntegrityCircle) {
            // 220 is the stroke-dasharray
            const offset = 220 - (220 * Math.max(0, this.player.massIntegrity));
            this.uiIntegrityCircle.style.strokeDashoffset = offset;
            
            // Optional: Change color based on integrity
            if (this.player.massIntegrity < 0.3) {
                this.uiIntegrityCircle.style.stroke = '#ff0000';
            } else {
                this.uiIntegrityCircle.style.stroke = '#00ff88';
            }
        }
    }

    destroyMissile(missile) {
        if (!missile || !missile.active) return;
        if (missile.body) missile.disableBody(true, true);
        if (missile.trail) {
            missile.trail.stop();
            const t = missile.trail;
            this.time.delayedCall(400, () => t.destroy());
        }
        missile.destroy();
    }

    spawnFood() {
        // NEW SPAWN LOGIC: Center Zone (Riskier)
        const x = Phaser.Math.Between(200, 600); // Danger Zone
        const y = Phaser.Math.Between(100, 500);
        if (this.foodGroup.countActive() < 5) { // Fewer food items
            const food = this.physics.add.image(x, y, 'foodParticle').setDepth(DEPTH.FOOD);
            food.setTint(COLORS.FOOD);
            food.setBlendMode(Phaser.BlendModes.ADD); // Bloom effect
            food.setScale(0);
            this.foodGroup.add(food);
            this.tweens.add({ targets: food, scale: 1, duration: 500 });
        }
    }

    handleSafeZone() {
        if (this.player.cleanse()) {
            AudioManager.playSound('splash');
            // Visual feedback for cleansing handled in Player or via particles potentially
        }
        
        if (this.player.massIntegrity >= 1.0 && !this.isLevelComplete) {
            this.isLevelComplete = true;
            this.levelComplete();
        }
    }

    levelComplete() {
        const nextLevel = this.level + 1;
        this.add.text(400, 300, 'PSYCHE STABILIZED', {
            fontSize: '40px', fill: '#00ffcc', backgroundColor: '#000000', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(DEPTH.UI);

        this.add.text(400, 360, 'INITIATING NEXT CYCLE...', {
            fontSize: '20px', fill: '#ffffff'
        }).setOrigin(0.5).setDepth(DEPTH.UI);

        this.time.delayedCall(3000, () => {
            this.scene.restart({ level: nextLevel });
        });
    }

    handleEat(food) {
        if (this.player.heal(0.1)) {
            food.destroy();
        }
    }

    handleGameOver() {
        this.add.text(400, 300, 'CRITICAL FAILURE', {
            fontSize: '32px', fill: '#fff', backgroundColor: '#ff0000', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(DEPTH.UI);
        
        this.add.text(400, 360, 'CLICK TO RESTART', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5).setDepth(DEPTH.UI);

        this.input.once('pointerdown', () => this.scene.restart({ level: 1 }));
    }
}
