/**
 * FaceShaderScene - Orchestrates visual effects rendering
 *
 * Delegates effect rendering to EffectManager
 * Manages keyboard controls for effect switching
 * Gathers tracking data from MediaPipe singletons
 */

import Phaser from 'phaser';
import { faceTrackingInstance } from '../core/FaceTracking.js';
import { handTrackingInstance } from '../core/HandTracking.js';
import { effectManager } from '../core/EffectManager.js';

export default class FaceShaderScene extends Phaser.Scene {
    constructor() {
        super('FaceShaderScene');
        this.effectActivated = false;
    }

    create() {
        console.log("FaceShaderScene: Starting");

        // Set transparent background to see through to video
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        // Create graphics for debug visualization
        this.debugGraphics = this.add.graphics();
        this.debugGraphics.setDepth(200);

        // Debug text
        this.debugText = this.add.text(10, 10, 'Effects System: Initializing', {
            font: '20px Courier',
            fill: '#00ff00',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: { x: 10, y: 5 }
        });
        this.debugText.setDepth(201);

        // Setup keyboard controls for effect switching
        this.setupKeyboardControls();

        // Activate first effect (Plasma Fire)
        const activated = effectManager.activateEffect('plasma-fire', { scene: this });
        if (activated) {
            this.effectActivated = true;
        } else {
            console.error('Failed to activate initial effect');
        }
    }

    setupKeyboardControls() {
        // Arrow Right: Next effect
        this.input.keyboard.on('keydown-RIGHT', () => {
            effectManager.nextEffect({ scene: this });
            this.showEffectNotification();
        });

        // Arrow Left: Previous effect
        this.input.keyboard.on('keydown-LEFT', () => {
            effectManager.previousEffect({ scene: this });
            this.showEffectNotification();
        });

        // E key: Toggle effect on/off (optional)
        this.input.keyboard.on('keydown-E', () => {
            this.toggleEffect();
        });

        console.log('Keyboard controls: [←/→] Switch Effect | [E] Toggle');
    }

    showEffectNotification() {
        const info = effectManager.getActiveEffectInfo();
        if (info) {
            console.log(`Effect: ${info.name} (${info.index + 1}/${info.total})`);
        }
    }

    toggleEffect() {
        if (this.effectActivated) {
            if (effectManager.activeEffect) {
                effectManager.activeEffect.deactivate();
            }
            this.effectActivated = false;
            console.log('Effects disabled');
        } else {
            effectManager.activateEffect('plasma-fire', { scene: this });
            this.effectActivated = true;
            console.log('Effects enabled');
        }
    }

    update(time, delta) {
        // Clear debug graphics
        this.debugGraphics.clear();

        // Gather tracking data from MediaPipe
        const trackingData = this.gatherTrackingData();

        // Get active effect info
        const info = effectManager.getActiveEffectInfo();

        // Update debug text
        this.debugText.setText(
            `Effects System\n` +
            `Active: ${info ? info.name : 'None'} (${info ? info.index + 1 : 0}/${info ? info.total : 0})\n` +
            `Face: ${trackingData.face.faceLandmarks ? 'Detected' : 'Waiting...'}\n` +
            `Hands: L=${trackingData.hands.left ? 'Y' : 'N'} R=${trackingData.hands.right ? 'Y' : 'N'}\n` +
            `[←/→] Switch | [E] Toggle`
        );

        // Render active effect
        if (this.effectActivated) {
            effectManager.render({
                time,
                trackingData,
                context: { scene: this }
            });
        }

        // Draw face mesh for debugging (optional)
        if (trackingData.face.faceLandmarks) {
            this.drawFaceMesh(trackingData.face.faceLandmarks);
        }
    }

    /**
     * Gather tracking data from MediaPipe singletons
     * @returns {Object} Standardized tracking data
     */
    gatherTrackingData() {
        // Get face tracking data
        const video = faceTrackingInstance.getVideoElement();
        const faceLandmarks = faceTrackingInstance.getLandmarks();
        const faceBox = faceTrackingInstance.getFaceBoundingBox();

        // Get hand tracking data
        const handLandmarks = handTrackingInstance.getLandmarks();
        const handedness = handTrackingInstance.getHandedness();

        // Parse left and right hands
        let leftHand = null;
        let rightHand = null;

        if (handLandmarks && handLandmarks.length > 0 && handedness && handedness.length > 0) {
            for (let i = 0; i < handedness.length; i++) {
                const handInfo = handedness[i][0];
                if (handInfo.categoryName === 'Left') {
                    leftHand = handLandmarks[i];
                } else if (handInfo.categoryName === 'Right') {
                    rightHand = handLandmarks[i];
                }
            }
        }

        // Return standardized format
        return {
            face: {
                faceLandmarks: faceLandmarks.length > 0 ? faceLandmarks[0] : null,
                faceBox,
                video
            },
            hands: {
                left: leftHand,
                right: rightHand
            }
        };
    }

    /**
     * Draw face mesh debug visualization (green outline)
     */
    drawFaceMesh(faceLandmarks) {
        const g = this.debugGraphics;
        const scaleX = 1000;
        const scaleY = 800;

        // Mirror X for AR view
        const getX = (val) => (1 - val) * scaleX;
        const getY = (val) => val * scaleY;

        // Draw face contour
        g.lineStyle(2, 0x00ff00, 0.5);

        const contourIndices = [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
        ];

        for (let i = 0; i < contourIndices.length; i++) {
            const idx1 = contourIndices[i];
            const idx2 = contourIndices[(i + 1) % contourIndices.length];

            if (idx1 < faceLandmarks.length && idx2 < faceLandmarks.length) {
                const p1 = faceLandmarks[idx1];
                const p2 = faceLandmarks[idx2];
                g.lineBetween(getX(p1.x), getY(p1.y), getX(p2.x), getY(p2.y));
            }
        }

        // Draw key landmarks
        [
            1,   // Nose tip
            33,  // Left eye
            263, // Right eye
            61,  // Left mouth corner
            291  // Right mouth corner
        ].forEach(idx => {
            if (idx < faceLandmarks.length) {
                const p = faceLandmarks[idx];
                g.fillStyle(0xff0000, 1);
                g.fillCircle(getX(p.x), getY(p.y), 5);
            }
        });
    }

    /**
     * Cleanup when scene shuts down
     */
    shutdown() {
        console.log('FaceShaderScene: Shutting down');
        // Don't dispose all effects, just deactivate current one
        // Other scenes might use effects too
        if (effectManager.activeEffect) {
            effectManager.activeEffect.deactivate();
        }
    }
}
