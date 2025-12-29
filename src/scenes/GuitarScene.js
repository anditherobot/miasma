import Phaser from 'phaser';
import { handTrackingInstance } from '../core/HandTracking.js';
import AudioManager from '../core/AudioManager.js';

// Core & Systems
import { GuitarState } from '../core/GuitarState.js';
import { MusicTheory } from '../core/MusicTheory.js';
import { CalibrationSystem } from '../systems/CalibrationSystem.js';

// UI Renderers
import { FretboardRenderer } from '../ui/components/FretboardRenderer.js';
import { HandOverlayRenderer } from '../ui/components/HandOverlayRenderer.js';
import { TunerRenderer } from '../ui/components/TunerRenderer.js';
import { WaveformRenderer } from '../ui/components/WaveformRenderer.js';
import { HUDOverlay } from '../ui/components/HUDOverlay.js';
import DebugUI from '../DebugUI.js';

export default class GuitarScene extends Phaser.Scene {
    constructor() { super('GuitarScene'); }

    create() {
        // Setup
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        // Audio Initialization
        const startAudio = () => {
            AudioManager.startMicrophone();
            this.input.keyboard.off('keydown', startAudio);
            this.input.off('pointerdown', startAudio);
        };

        this.input.keyboard.once('keydown', startAudio);
        this.input.once('pointerdown', startAudio);

        // Try to start immediately
        AudioManager.startMicrophone();

        // 1. Initialize State
        this.guitarState = new GuitarState();

        // 2. Initialize Systems
        this.calibrationSystem = new CalibrationSystem(this.guitarState);

        // 3. Initialize UI Renderers
        // Order determines draw order (First = Bottom)
        this.fretboardRenderer = new FretboardRenderer(this);
        this.waveformRenderer = new WaveformRenderer(this);
        this.handOverlayRenderer = new HandOverlayRenderer(this);
        this.tunerRenderer = new TunerRenderer(this);
        this.hudOverlay = new HUDOverlay(this);
        this.debugUI = new DebugUI(this);

        // Inputs
        this.input.keyboard.on('keydown-SPACE', () => {
            this.guitarState.resetCalibration();
        });
    }

    update(time, delta) {
        // 1. Get Inputs / Raw Data
        const hz = AudioManager.getPitch();
        // Calculate note using our Logic layer
        const note = MusicTheory.hzToNote(hz);

        const waveform = AudioManager.getWaveform();

        const allLandmarks = handTrackingInstance.getLandmarks();
        const handedness = handTrackingInstance.getHandedness();

        // Filter for left and right hands
        let leftHand = null;
        let rightHand = null;

        if (allLandmarks && allLandmarks.length > 0 && handedness && handedness.length > 0) {
            for (let i = 0; i < handedness.length; i++) {
                const handInfo = handedness[i][0];
                if (handInfo.categoryName === 'Left') {
                    leftHand = allLandmarks[i];
                } else if (handInfo.categoryName === 'Right') {
                    rightHand = allLandmarks[i];
                }
            }
        }

        // 2. Update State
        this.guitarState.updateAudio(hz, note);
        this.guitarState.updateHands(leftHand, rightHand);

        // 3. Run Systems
        this.calibrationSystem.update(time);

        // 4. Render UI
        // We pass 'waveform' separately as it's large transient data
        this.fretboardRenderer.update(this.guitarState, time);
        this.waveformRenderer.update(waveform, this.guitarState);
        this.handOverlayRenderer.update(this.guitarState, time);
        this.tunerRenderer.update(this.guitarState);
        this.hudOverlay.update(this.guitarState);
        this.debugUI.update();
    }
}
