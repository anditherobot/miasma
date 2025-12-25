import Phaser from 'phaser';
import { COLORS, DEPTH, PHYSICS } from '../core/Constants.js';
import AudioManager from '../core/AudioManager.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'redOrb');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setDepth(DEPTH.PLAYER);
        this.setCollideWorldBounds(true);
        this.body.setCircle(PHYSICS.PLAYER_RADIUS);
        this.setPipeline('Light2D');

        // Lighting
        this.light = scene.lights.addLight(x, y, 150).setColor(0xffffff).setIntensity(1.5);

        // State
        this.massIntegrity = 1.0;
        this.isInfected = false;
        this.isStunned = false;
        this.isDead = false;

        // VFX
        this.hitEmitter = scene.add.particles(0, 0, 'miasmaParticle', {
            speed: { min: 50, max: 150 }, scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 },
            tint: COLORS.MIASMA, blendMode: 'ADD', emitting: false, lifespan: 300, quantity: 10
        });
        
        // New: Carrier Cloud (Emits when infected)
        this.carrierCloud = scene.add.particles(0, 0, 'miasmaParticle', {
            speed: { min: 10, max: 20 }, scale: { start: 0.8, end: 0 }, alpha: { start: 0.5, end: 0 },
            tint: COLORS.MIASMA, blendMode: 'ADD', lifespan: 500, frequency: 100, emitting: false,
            follow: this
        }).setDepth(DEPTH.PLAYER - 1);

        this.deathEmitter = scene.add.particles(0, 0, 'redOrb', {
            speed: { min: 50, max: 200 }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 },
            blendMode: 'ADD', emitting: false, lifespan: 600, quantity: 20
        });

        // Audio
        this.setupAudio();
    }

    setupAudio() {
        this.audioCtx = AudioManager.getContext();

        // Resume audio context on first user interaction
        if (this.audioCtx.state === 'suspended') {
            const resumeAudio = () => {
                AudioManager.resume();
                document.removeEventListener('click', resumeAudio);
                document.removeEventListener('keydown', resumeAudio);
            };
            document.addEventListener('click', resumeAudio);
            document.addEventListener('keydown', resumeAudio);
        }
    }

    update(cursors) {
        if (this.isDead) return;

        this.light.setPosition(this.x, this.y);
        this.setVelocity(0);
        let speed = PHYSICS.PLAYER_SPEED;

        // Infection effects
        if (this.isInfected) {
            speed *= 0.75;
            
            // Carrier Cloud Active
            if (!this.carrierCloud.emitting) this.carrierCloud.start();

            // Psychological Jitter (Unless Stabilized)
            if (!this.isStabilized) {
                this.x += Phaser.Math.Between(-1, 1);
                this.y += Phaser.Math.Between(-1, 1);
            }
            
            this.setTint(COLORS.PLAYER_INFECTED);
        } else {
            if (this.carrierCloud.emitting) this.carrierCloud.stop();
            this.clearTint();
        }
        
        // Reset stabilization frame by frame (requires constant contact)
        this.isStabilized = false;

        // Movement
        if (!this.isStunned) {
            if (cursors.left.isDown) this.setVelocityX(-speed);
            if (cursors.right.isDown) this.setVelocityX(speed);
            if (cursors.up.isDown) this.setVelocityY(-speed);
            if (cursors.down.isDown) this.setVelocityY(speed);
        }
    }

    takeDamage(amount) {
        this.updateMass(this.massIntegrity - amount);
        this.isStunned = true;
        this.setTint(COLORS.PLAYER_HURT);
        this.hitEmitter.explode(10, this.x, this.y);
        this.scene.time.delayedCall(200, () => this.isStunned = false);
        this.isInfected = true;
    }

    heal(amount) {
        if (this.massIntegrity < 1.0) {
            this.updateMass(this.massIntegrity + amount);
            this.scene.cameras.main.flash(50, 255, 200, 0, 0.1);
            return true;
        }
        return false;
    }

    cleanse() {
        if (this.isInfected) {
            this.isInfected = false;
            return true;
        }
        return false;
    }
    
    stabilize() {
        this.isStabilized = true;
    }

    updateMass(value) {
        this.massIntegrity = Phaser.Math.Clamp(value, 0, 1.0);
        
        if (this.massIntegrity <= 0.15) {
            this.die();
        } else {
            this.setScale(this.massIntegrity);
            this.body.setCircle(PHYSICS.PLAYER_RADIUS);
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.setVisible(false);
        this.body.enable = false;
        this.deathEmitter.explode(30, this.x, this.y);
        this.scene.events.emit('player-dead');
    }
}
