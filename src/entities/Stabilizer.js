import Phaser from 'phaser';
import { DEPTH, COLORS } from '../core/Constants.js';

export default class Stabilizer extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'blueOrb'); // Re-using orb shape but tinted green
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setTint(0x00ffcc); // Cyan/Green tint
        this.setDepth(DEPTH.PLAYER);
        this.setCollideWorldBounds(true);
        this.body.setCircle(20);
        this.setPipeline('Light2D');

        // Lighting
        this.light = scene.lights.addLight(x, y, 120).setColor(0x00ffcc).setIntensity(1);
        
        // Random Movement
        this.scene = scene;
        this.moveTimer = 0;
        this.chooseNewTarget();
    }

    update(time, delta) {
        this.light.setPosition(this.x, this.y);
        this.moveTimer -= delta;
        if (this.moveTimer <= 0) {
            this.chooseNewTarget();
        }
    }

    chooseNewTarget() {
        const x = Phaser.Math.Between(300, 500); // Stay near center
        const y = Phaser.Math.Between(200, 400);
        this.scene.physics.moveTo(this, x, y, 50); // Slow movement
        this.moveTimer = Phaser.Math.Between(2000, 4000);
    }
}
