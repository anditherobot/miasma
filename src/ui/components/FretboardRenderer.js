import Phaser from 'phaser';
import { MusicTheory } from '../../core/MusicTheory.js';

export class FretboardRenderer {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
    }

    clear() {
        this.graphics.clear();
    }

    update(guitarState, time) {
        this.clear();

        // Even if not fully calibrated, if we have fretboard data we can try to draw?
        // Actually, only draw if calibrated or if we want to show phantom lines.
        // For now, let's follow original logic: Only draw lines if isCalibrated (PLAY MODE) 
        // OR we can draw them based on the stable fretboard data.

        if (!guitarState.isCalibrated) return;

        // Update Position interpolation (Logic from GuitarScene.updateFretboardPosition)
        if (guitarState.handLandmarks) {
            this.updateFretboardPosition(guitarState.handLandmarks, guitarState);
        }

        this.drawStrings(guitarState, time);
    }

    updateFretboardPosition(hand, state) {
        const fingers = [8, 12, 16, 20];
        const points = fingers.map(id => ({
            x: hand[id].x * 1000,
            y: hand[id].y * 800
        }));

        const centerX = (points[0].x + points[3].x) / 2;
        const centerY = (points[0].y + points[3].y) / 2;

        const angle = Phaser.Math.Angle.Between(
            points[0].x, points[0].y,
            points[3].x, points[3].y
        );

        const smoothing = 0.3;
        state.fretboard.centerX += (centerX - state.fretboard.centerX) * smoothing;
        state.fretboard.centerY += (centerY - state.fretboard.centerY) * smoothing;
        state.fretboard.angle += (angle - state.fretboard.angle) * smoothing;
    }

    drawStrings(state, time) {
        const g = this.graphics;
        const { centerX, centerY, angle } = state.fretboard;
        // activeString calc should strictly be in MusicTheory or State? 
        // Let's use MusicTheory helper here.
        const activeString = MusicTheory.getActiveString(state.currentHz);

        const perpAngle = angle + Math.PI / 2;
        const stringSpacing = 20;

        for (let i = 0; i < 6; i++) {
            const offset = (i - 2.5) * stringSpacing;
            const offsetX = Math.cos(perpAngle) * offset;
            const offsetY = Math.sin(perpAngle) * offset;

            const neckLength = 500;
            const startX = centerX + offsetX - Math.cos(angle) * 100;
            const startY = centerY + offsetY - Math.sin(angle) * 100;
            const endX = centerX + offsetX + Math.cos(angle) * neckLength;
            const endY = centerY + offsetY + Math.sin(angle) * neckLength;

            const isActive = i === activeString;

            if (isActive && state.currentHz > 50) {
                const noteColor = MusicTheory.getNoteColor(state.currentNote);
                const pulse = Math.sin(time / 100) * 0.3 + 0.7;

                g.lineStyle(10, noteColor, 0.2 * pulse);
                g.lineBetween(startX, startY, endX, endY);

                g.lineStyle(6, noteColor, 0.5 * pulse);
                g.lineBetween(startX, startY, endX, endY);

                g.lineStyle(3, noteColor, pulse);
                g.lineBetween(startX, startY, endX, endY);
            } else {
                g.lineStyle(4, 0x00ffff, 0.1);
                g.lineBetween(startX, startY, endX, endY);

                g.lineStyle(2, 0x00ffff, 0.3);
                g.lineBetween(startX, startY, endX, endY);
            }
        }
    }
}
