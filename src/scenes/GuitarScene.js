import Phaser from 'phaser';
import { handTrackingInstance } from '../core/HandTracking.js';
import AudioManager from '../core/AudioManager.js';

export default class GuitarScene extends Phaser.Scene {
    constructor() { super('GuitarScene'); }

    create() {
        // Setup
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        AudioManager.startMicrophone();

        // State
        this.currentNote = '-';
        this.currentHz = 0;
        this.isCalibrated = false;
        this.calibrationStableFrames = 0;

        // Graphics Layers
        this.fretGraphics = this.add.graphics();
        this.handGraphics = this.add.graphics();
        this.waveformGraphics = this.add.graphics();

        // Fretboard reference (calibrated position)
        this.fretboard = {
            centerX: 0,
            centerY: 0,
            angle: 0,
            spacing: 0
        };

        // Waveform buffer for visualization
        this.waveformData = [];

        // UI
        this.hudText = this.add.text(20, 20, '', {
            fontFamily: 'monospace',
            fontSize: '14px',
            fill: '#00ff00',
            backgroundColor: '#00000088',
            padding: { x: 10, y: 8 }
        });

        this.noteText = this.add.text(500, 50, '-', {
            fontFamily: 'Arial',
            fontSize: '64px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.instructionText = this.add.text(500, 550, '', {
            fontFamily: 'monospace',
            fontSize: '18px',
            fill: '#ffffff',
            backgroundColor: '#000000cc',
            padding: { x: 15, y: 10 }
        }).setOrigin(0.5);

        // Reset
        this.input.keyboard.on('keydown-SPACE', () => {
            this.isCalibrated = false;
            this.calibrationStableFrames = 0;
        });
    }

    update(time, delta) {
        // Clear graphics
        this.fretGraphics.clear();
        this.handGraphics.clear();
        this.waveformGraphics.clear();

        // Audio processing
        const hz = AudioManager.getPitch();
        if (hz > 50) {
            this.currentHz = hz;
            this.currentNote = this.hzToNote(hz);
            this.noteText.setText(this.currentNote);
            this.noteText.setTint(this.getNoteColor(this.currentNote));
            this.noteText.setScale(1.1 + Math.sin(time / 100) * 0.05);
        } else {
            this.noteText.setScale(1.0);
            this.noteText.setTint(0x666666);
        }

        // Get waveform data for visualization
        this.waveformData = AudioManager.getWaveform();

        // Hand tracking
        const landmarks = handTrackingInstance.getLandmarks();

        if (this.isCalibrated) {
            // PLAY MODE
            this.instructionText.setText("PLAY MODE [SPACE TO RESET]");
            this.drawFretboardOverlay();

            if (landmarks && landmarks.length > 0) {
                this.drawARHandVisualization(landmarks[0], time);
            }

            this.drawWaveform(time);

            this.hudText.setText(
                `PITCH: ${Math.floor(this.currentHz)} Hz\n` +
                `NOTE:  ${this.currentNote}\n` +
                `STATUS: ACTIVE`
            );

        } else {
            // CALIBRATION MODE
            this.instructionText.setText("PLACE 4 FINGERS ON FRETS 1-4 (HORIZONTAL)");

            if (landmarks && landmarks.length > 0) {
                this.tryCalibrate(landmarks[0]);
            } else {
                this.calibrationStableFrames = 0;
                this.hudText.setText("WAITING FOR HAND...");
            }
        }
    }

    tryCalibrate(hand) {
        // Get 4 fingertips: Index(8), Middle(12), Ring(16), Pinky(20)
        const fingers = [
            { id: 8, name: 'INDEX' },
            { id: 12, name: 'MIDDLE' },
            { id: 16, name: 'RING' },
            { id: 20, name: 'PINKY' }
        ];

        const points = fingers.map(f => ({
            x: hand[f.id].x * 1000,
            y: hand[f.id].y * 800,
            name: f.name
        }));

        // Draw the finger positions
        const g = this.fretGraphics;
        g.lineStyle(3, 0x00ff00, 1);

        // Connect the dots
        for (let i = 0; i < points.length - 1; i++) {
            g.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
        }

        // Draw circles on fingertips
        points.forEach((p, i) => {
            g.fillStyle(0x00ff00, 0.3);
            g.fillCircle(p.x, p.y, 20);
            g.lineStyle(2, 0x00ff00, 1);
            g.strokeCircle(p.x, p.y, 20);
        });

        // Check if fingers are roughly horizontal (aligned)
        const isAligned = this.checkAlignment(points);

        if (isAligned) {
            this.calibrationStableFrames++;
            const progress = Math.min(100, Math.floor((this.calibrationStableFrames / 60) * 100));

            this.hudText.setText(`CALIBRATING... ${progress}%\nHOLD STEADY!`);

            // Draw progress indicator
            g.lineStyle(6, 0x00ff00, 0.3 + (progress / 100) * 0.7);
            const centerX = (points[0].x + points[3].x) / 2;
            const centerY = (points[0].y + points[3].y) / 2;
            g.strokeCircle(centerX, centerY, 40 + (progress / 100) * 20);

            if (this.calibrationStableFrames >= 60) { // 1 second hold
                // Calculate fretboard parameters
                const angle = Phaser.Math.Angle.Between(
                    points[0].x, points[0].y,
                    points[3].x, points[3].y
                );
                const spacing = Phaser.Math.Distance.Between(
                    points[0].x, points[0].y,
                    points[1].x, points[1].y
                );

                this.fretboard = {
                    centerX: centerX,
                    centerY: centerY,
                    angle: angle,
                    spacing: spacing
                };

                this.isCalibrated = true;
            }
        } else {
            this.calibrationStableFrames = 0;
            this.hudText.setText("ALIGN FINGERS HORIZONTALLY\nON FRETS 1-4");
        }
    }

    checkAlignment(points) {
        // Check if points form roughly a horizontal line
        // Calculate variance in Y positions
        const avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        const variance = points.reduce((sum, p) => sum + Math.abs(p.y - avgY), 0) / points.length;

        // Check spacing between fingers is reasonable
        const spacing1 = Phaser.Math.Distance.Between(points[0].x, points[0].y, points[1].x, points[1].y);
        const spacing2 = Phaser.Math.Distance.Between(points[1].x, points[1].y, points[2].x, points[2].y);
        const spacing3 = Phaser.Math.Distance.Between(points[2].x, points[2].y, points[3].x, points[3].y);

        const avgSpacing = (spacing1 + spacing2 + spacing3) / 3;
        const spacingVariance = (
            Math.abs(spacing1 - avgSpacing) +
            Math.abs(spacing2 - avgSpacing) +
            Math.abs(spacing3 - avgSpacing)
        ) / 3;

        // Alignment is good if Y variance is low and spacing is consistent
        return variance < 30 && spacingVariance < avgSpacing * 0.4 && avgSpacing > 20 && avgSpacing < 200;
    }

    drawFretboardOverlay() {
        const g = this.fretGraphics;
        const { centerX, centerY, angle, spacing } = this.fretboard;

        // Draw fret lines
        g.lineStyle(1, 0x00ffff, 0.3);

        for (let i = 0; i < 12; i++) {
            const dist = i * spacing;
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            const perpAngle = angle + Math.PI / 2;
            const lineLength = 100;
            const x1 = x + Math.cos(perpAngle) * lineLength;
            const y1 = y + Math.sin(perpAngle) * lineLength;
            const x2 = x - Math.cos(perpAngle) * lineLength;
            const y2 = y - Math.sin(perpAngle) * lineLength;

            g.lineBetween(x1, y1, x2, y2);
        }
    }

    drawARHandVisualization(hand, time) {
        const g = this.handGraphics;

        // Get fingertip positions
        const tips = [4, 8, 12, 16, 20]; // Thumb to Pinky
        const knuckles = [2, 5, 9, 13, 17]; // Knuckle positions
        const palm = hand[0]; // Wrist/palm center

        const palmX = palm.x * 1000;
        const palmY = palm.y * 800;

        // Draw palm center with rotating HUD
        g.lineStyle(2, 0x00ffff, 0.8);
        const pulseSize = 30 + Math.sin(time / 200) * 5;
        g.strokeCircle(palmX, palmY, pulseSize);

        // Draw rotating arc around palm
        const arcAngle = (time / 1000) % (Math.PI * 2);
        g.lineStyle(3, 0xff00ff, 1);
        g.arc(palmX, palmY, 45, arcAngle, arcAngle + Math.PI / 2);
        g.arc(palmX, palmY, 45, arcAngle + Math.PI, arcAngle + Math.PI * 1.5);

        // Draw connection lines from palm to knuckles
        knuckles.forEach(idx => {
            const p = hand[idx];
            const x = p.x * 1000;
            const y = p.y * 800;

            g.lineStyle(1, 0x00ffff, 0.3);
            g.lineBetween(palmX, palmY, x, y);
        });

        // Draw fingertips with circular HUD elements
        tips.forEach((tipIdx, i) => {
            const p = hand[tipIdx];
            const x = p.x * 1000;
            const y = p.y * 800;

            // Pulsing circle
            const phase = time / 300 + i * 0.5;
            const size = 8 + Math.sin(phase) * 2;

            g.fillStyle(0x00ff88, 0.6);
            g.fillCircle(x, y, size);

            g.lineStyle(2, 0x00ff88, 1);
            g.strokeCircle(x, y, size + 5);

            // Orbital rings
            g.lineStyle(1, 0xffffff, 0.4);
            g.strokeCircle(x, y, 15);

            // Draw connection between finger joints
            if (tipIdx > 4) { // Not thumb
                const mcp = tipIdx - 3; // Knuckle
                const pip = tipIdx - 2; // Middle joint
                const dip = tipIdx - 1; // Top joint

                g.lineStyle(2, 0x00ffff, 0.6);
                const joints = [mcp, pip, dip, tipIdx].map(j => ({
                    x: hand[j].x * 1000,
                    y: hand[j].y * 800
                }));

                for (let j = 0; j < joints.length - 1; j++) {
                    g.lineBetween(joints[j].x, joints[j].y, joints[j + 1].x, joints[j + 1].y);

                    // Draw small circles at joints
                    g.fillStyle(0xffffff, 0.8);
                    g.fillCircle(joints[j].x, joints[j].y, 3);
                }
            }
        });

        // Draw hand skeleton overlay (connections)
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8], // Index
            [0, 9], [9, 10], [10, 11], [11, 12], // Middle
            [0, 13], [13, 14], [14, 15], [15, 16], // Ring
            [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
            [5, 9], [9, 13], [13, 17] // Palm
        ];

        g.lineStyle(1, 0xffffff, 0.2);
        connections.forEach(([a, b]) => {
            const p1 = hand[a];
            const p2 = hand[b];
            g.lineBetween(p1.x * 1000, p1.y * 800, p2.x * 1000, p2.y * 800);
        });
    }

    drawWaveform(time) {
        if (!this.waveformData || this.waveformData.length === 0) return;

        const g = this.waveformGraphics;
        const waveX = 50;
        const waveY = 650;
        const waveWidth = 900;
        const waveHeight = 100;

        // Background box
        g.fillStyle(0x000000, 0.5);
        g.fillRect(waveX - 10, waveY - 10, waveWidth + 20, waveHeight + 20);

        // Get color based on current note
        const color = this.getNoteColor(this.currentNote);

        // Draw waveform
        g.lineStyle(2, color, 0.8);

        const step = waveWidth / this.waveformData.length;

        for (let i = 0; i < this.waveformData.length - 1; i++) {
            const x1 = waveX + i * step;
            const y1 = waveY + waveHeight / 2 + (this.waveformData[i] * waveHeight / 2);
            const x2 = waveX + (i + 1) * step;
            const y2 = waveY + waveHeight / 2 + (this.waveformData[i + 1] * waveHeight / 2);

            g.lineBetween(x1, y1, x2, y2);
        }

        // Draw center line
        g.lineStyle(1, 0x444444, 0.5);
        g.lineBetween(waveX, waveY + waveHeight / 2, waveX + waveWidth, waveY + waveHeight / 2);
    }

    hzToNote(frequency) {
        const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const pitchVal = 12 * (Math.log(frequency / 440) / Math.log(2));
        const noteIndex = Math.round(pitchVal) + 69;
        const noteVal = noteIndex % 12;
        if (noteVal < 0 || noteVal >= noteStrings.length) return '-';
        return noteStrings[noteVal];
    }

    getNoteColor(note) {
        const colorMap = {
            'C': 0xff0000,   // Red
            'C#': 0xff4400,  // Orange-Red
            'D': 0xff8800,   // Orange
            'D#': 0xffcc00,  // Yellow-Orange
            'E': 0xffff00,   // Yellow
            'F': 0x88ff00,   // Yellow-Green
            'F#': 0x00ff00,  // Green
            'G': 0x00ff88,   // Cyan-Green
            'G#': 0x00ffff,  // Cyan
            'A': 0x0088ff,   // Blue
            'A#': 0x4400ff,  // Purple-Blue
            'B': 0x8800ff    // Purple
        };
        return colorMap[note] || 0xffffff;
    }
}
