import Phaser from 'phaser';
import { handTrackingInstance } from '../core/HandTracking.js';

export default class SimpleHandScene extends Phaser.Scene {
    constructor() { super('SimpleHandScene'); }

    create() {
        console.log("SimpleHandScene: STARTING");
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        this.handGraphics = this.add.graphics();
        this.handGraphics.setDepth(100);

        // Add Debug Text
        this.debugText = this.add.text(10, 10, 'DEBUG: Scene Loaded', { 
            font: '24px Courier', 
            fill: '#ff0000', 
            backgroundColor: '#ffffff' 
        });
        this.debugText.setDepth(101);
    }

    update(time, delta) {
        this.handGraphics.clear();
        
        // 1. Draw a static Red Box to prove Canvas is visible
        this.handGraphics.lineStyle(4, 0xff0000, 1);
        this.handGraphics.strokeRect(100, 100, 800, 600);
        this.handGraphics.lineBetween(0, 0, 1000, 800);
        this.handGraphics.lineBetween(1000, 0, 0, 800);

        // 2. Draw raw video feed picture-in-picture (Bottom Right)
        const video = handTrackingInstance.getVideoElement();
        if (video && video.readyState >= 2) {
             // We need a texture to draw video in Phaser, but for a quick debug verify we can use the canvas context directly if we were in pure JS.
             // Since we are in Phaser, we can't easily access the 2D context of the main canvas if it's WebGL.
             // Instead, we'll verify by just logging the video size once.
        }

        const allLandmarks = handTrackingInstance.getLandmarks();
        const handCount = allLandmarks ? allLandmarks.length : 0;
        
        // Update status text
        this.debugText.setText(
            `Status: Running\n` +
            `Time: ${Math.floor(time)}\n` +
            `Hands Detected: ${handCount}\n` +
            `Model Loaded: ${handTrackingInstance.isLoaded ? 'YES' : 'LOADING...'}\n` +
            `Video Ready: ${video ? video.readyState : 'No Video'}\n` +
            `Video Size: ${video ? video.videoWidth + 'x' + video.videoHeight : 'N/A'}`
        );

        if (allLandmarks && allLandmarks.length > 0) {
            allLandmarks.forEach((hand) => {
                this.drawARHandVisualization(hand, time);
            });
        }
    }

    drawARHandVisualization(hand, time) {
        if (!hand || hand.length < 21) return;

        const g = this.handGraphics;
        const scaleX = 1000;
        const scaleY = 800;

        // Mirror X coordinates for AR
        const getX = (val) => (1 - val) * scaleX;
        const getY = (val) => val * scaleY;

        const drawBone = (p1, p2) => {
            g.lineStyle(2, 0xffffff, 0.8);
            g.lineBetween(getX(p1.x), getY(p1.y), getX(p2.x), getY(p2.y));
        };

        // Thumb
        drawBone(hand[0], hand[1]);
        drawBone(hand[1], hand[2]);
        drawBone(hand[2], hand[3]);
        drawBone(hand[3], hand[4]);

        // Index
        drawBone(hand[0], hand[5]);
        drawBone(hand[5], hand[6]);
        drawBone(hand[6], hand[7]);
        drawBone(hand[7], hand[8]);

        // Middle
        drawBone(hand[0], hand[9]);
        drawBone(hand[9], hand[10]);
        drawBone(hand[10], hand[11]);
        drawBone(hand[11], hand[12]);

        // Ring
        drawBone(hand[0], hand[13]);
        drawBone(hand[13], hand[14]);
        drawBone(hand[14], hand[15]);
        drawBone(hand[15], hand[16]);

        // Pinky
        drawBone(hand[0], hand[17]);
        drawBone(hand[17], hand[18]);
        drawBone(hand[18], hand[19]);
        drawBone(hand[19], hand[20]);

        // Palm
        drawBone(hand[5], hand[9]);
        drawBone(hand[9], hand[13]);
        drawBone(hand[13], hand[17]);
        drawBone(hand[0], hand[17]);
        drawBone(hand[0], hand[5]);

        // Joints
        hand.forEach((p) => {
            const x = getX(p.x);
            const y = getY(p.y);
            g.fillStyle(0xffffff, 1);
            g.fillCircle(x, y, 4);
        });
    }
}
