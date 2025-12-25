import Phaser from 'phaser';
import { COLORS, DEPTH, PHYSICS } from '../core/Constants.js';
import AudioManager from '../core/AudioManager.js';

export default class Sentinel extends Phaser.Physics.Arcade.Image {
    constructor(scene, x, y, player, walls, missileGroup) {
        super(scene, x, y, 'blueOrb');
        scene.add.existing(this);
        scene.physics.add.existing(this, true); // Static body
        
        this.setDepth(DEPTH.SENTINEL);
        this.setPipeline('Light2D');
        this.target = player;
        this.walls = walls;
        this.missiles = missileGroup; // Use shared group

        // Lighting
        this.light = scene.lights.addLight(x, y, 100).setColor(0x0000ff).setIntensity(1);

        // Visual Components
        this.spikes = scene.add.image(x, y, 'spikeRing').setScale(0).setDepth(DEPTH.BG);
        
        // Range Indicator (Danger Zone)
        this.rangeCircle = scene.add.arc(x, y, PHYSICS.SENTINEL_RADIUS, 0, 360, false)
            .setStrokeStyle(1, COLORS.SENTINEL_RING, 0.1)
            .setDepth(DEPTH.BG);

        this.aura = scene.add.particles(x, y, 'miasmaParticle', {
            speed: { min: 20, max: 40 }, 
            scale: { start: 2.5, end: 0 }, 
            alpha: { start: 0.5, end: 0 },
            tint: COLORS.MIASMA, 
            blendMode: 'ADD', 
            lifespan: 1500, 
            frequency: 50, 
            emitting: true,
            emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 60) }
        }).setDepth(DEPTH.BG);

        // State
        this.awareness = 0.0;
        this.criticalTimer = 0;

        // Audio System (Arpeggiator)
        this.setupAudio();
    }

    setupAudio() {
        this.audioCtx = AudioManager.getContext();
        this.osc = null;
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.connect(this.audioCtx.destination);
        this.gainNode.gain.value = 0;

        // A Minor Arpeggio Notes (A3, C4, E4)
        this.notes = [220.00, 261.63, 329.63]; 
        this.noteIndex = 0;
        this.arpTimer = 0;
        this.isPlaying = false;
    }

    update(time, delta) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        
        // --- AUDIO LOGIC (Arpeggio) ---
        if (this.awareness > 0.1) {
            this.gainNode.gain.setTargetAtTime(this.awareness * 0.1, this.audioCtx.currentTime, 0.1);
            
            // Speed increases with awareness (500ms -> 100ms)
            const interval = 500 - (this.awareness * 400); 
            this.arpTimer += delta;
            
            if (this.arpTimer > interval) {
                this.playNextNote();
                this.arpTimer = 0;
            }
        } else {
            this.gainNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
        }

        // --- AWARENESS LOGIC ---
        if (dist < PHYSICS.SENTINEL_RADIUS) {
            const urgency = 1 - (dist / PHYSICS.SENTINEL_RADIUS);
            
            // Ramp awareness
            if (this.awareness < urgency) this.awareness += 0.01;
            else this.awareness -= 0.005;

            // Passive Infection
            if (this.awareness > 0.4 && dist < PHYSICS.SENTINEL_CRITICAL_DIST) {
                if (!this.target.isInfected) this.target.isInfected = true;
            }

            // Critical State (Firing)
            if (this.awareness > 0.75) {
                this.criticalTimer += delta;
                this.setTint(COLORS.SENTINEL_ALERT);
                this.light.setColor(0xff0000).setIntensity(2);
                if (this.criticalTimer > 1500) {
                    this.fireStrand();
                    this.criticalTimer = 0;
                }
            } else {
                this.clearTint();
                this.light.setColor(0x0000ff).setIntensity(1);
                this.criticalTimer = 0;
            }
        } else {
            // Decay
            if (this.awareness > 0) this.awareness -= 0.01;
            this.clearTint();
            this.light.setColor(0x0000ff).setIntensity(0.5);
        }

        // --- VISUAL UPDATE ---
        this.spikes.scale = this.awareness;
        this.spikes.rotation += 0.05 * this.awareness;

        // Animate Danger Zone
        const pulse = Math.sin(time * 0.005) * 0.02;
        this.rangeCircle.setScale(1 + pulse);
        this.rangeCircle.setAlpha(0.1 + (this.awareness * 0.3));
        if (this.awareness > 0.75) {
            this.rangeCircle.setStrokeStyle(2, COLORS.SENTINEL_ALERT, 0.4);
        } else {
            this.rangeCircle.setStrokeStyle(1, COLORS.SENTINEL_RING, 0.1 + (this.awareness * 0.2));
        }
        
        const cloudAlpha = Phaser.Math.Clamp((this.awareness - 0.1) * 0.8, 0, 0.8);
        this.aura.setAlpha(cloudAlpha);
        this.aura.setScale(1 + (this.awareness * 1.5));
    }

    playNextNote() {
        // Stop previous note slightly before next to create separation
        if (this.osc) {
            this.osc.stop();
            this.osc.disconnect();
        }

        this.osc = this.audioCtx.createOscillator();
        this.osc.type = 'triangle';
        this.osc.frequency.setValueAtTime(this.notes[this.noteIndex], this.audioCtx.currentTime);
        this.osc.connect(this.gainNode);
        this.osc.start();
        this.osc.stop(this.audioCtx.currentTime + 0.1); // Short blip

        // Cycle notes
        this.noteIndex = (this.noteIndex + 1) % this.notes.length;
    }

    fireStrand() {
        const missile = this.missiles.create(this.x, this.y, 'miasmaParticle');
        missile.setAlpha(0).setCircle(5);
        
        missile.trail = this.scene.add.particles(this.x, this.y, 'miasmaParticle', {
            scale: { start: 1.2, end: 0 }, tint: COLORS.MIASMA, blendMode: 'ADD', lifespan: 400, frequency: 10
        });
    }

    destroyMissile(missile) {
        if (!missile.active) return; // Prevent double-destroy crash

        if (missile.trail) {
            missile.trail.stop();
            const t = missile.trail; // Capture reference
            this.scene.time.delayedCall(400, () => t.destroy());
        }
        missile.destroy();
    }
}
