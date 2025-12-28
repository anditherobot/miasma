import Phaser from 'phaser';
import { handTrackingInstance } from '../core/HandTracking.js';
import AudioManager from '../core/AudioManager.js';
import DebugHUD from '../ui/DebugHUD.js';

export default class GuitarScene extends Phaser.Scene {
    constructor() { super('GuitarScene'); }

    create() {
        // Setup
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        // Initialize Debug HUD
        this.debugHUD = new DebugHUD(this);

        // Start audio on first user interaction
        const startAudio = () => {
            AudioManager.startMicrophone();
            this.input.keyboard.off('keydown', startAudio);
            this.input.off('pointerdown', startAudio);
        };

        this.input.keyboard.once('keydown', startAudio);
        this.input.once('pointerdown', startAudio);

        // Try to start immediately (may be blocked by browser)
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
        this.tunerGraphics = this.add.graphics();

        // Fretboard reference (calibrated position)
        this.fretboard = {
            centerX: 0,
            centerY: 0,
            angle: 0,
            spacing: 0
        };

        // Waveform buffer for visualization
        this.waveformData = [];

        // UI - Status HUD (Top Left)
        this.hudText = this.add.text(30, 30, '', {
            fontFamily: 'Courier New, monospace',
            fontSize: '13px',
            fill: '#00ff88',
            padding: { x: 12, y: 10 }
        }).setShadow(0, 0, 10, '#00ff88', false, true);

        // Large Note Display (Top Center)
        this.noteText = this.add.text(500, 60, '-', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '72px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5)
            .setShadow(0, 0, 20, '#ffffff', false, true);

        // Instruction Text (Center Bottom)
        this.instructionText = this.add.text(500, 750, '', {
            fontFamily: 'Courier New, monospace',
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#000000bb',
            padding: { x: 20, y: 12 }
        }).setOrigin(0.5)
            .setShadow(0, 0, 8, '#00ffff', false, true);

        // System Status (Top Right)
        this.statusPill = this.add.text(970, 30, 'INITIALIZING', {
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            fill: '#ffaa00',
            backgroundColor: '#000000aa',
            padding: { x: 15, y: 8 }
        }).setOrigin(1, 0)
            .setShadow(0, 0, 8, '#ffaa00', false, true);

        // --- HAND VISUALIZATION LABELS (Dynamic) ---
        this.rotationLabel = this.add.text(0, 0, '▲ rotation 0', {
            fontFamily: 'Courier New, monospace',
            fontSize: '14px',
            fill: '#ffffff',
        }).setShadow(0, 0, 5, '#ffffff', false, true);

        this.palmLabel = this.add.text(0, 0, 'palm locked\n:: 0.0', {
            fontFamily: 'Courier New, monospace',
            fontSize: '16px',
            fill: '#ff5500',
            align: 'left'
        }).setShadow(0, 0, 5, '#ff5500', false, true);

        this.rotationLabel.setVisible(false);
        this.palmLabel.setVisible(false);

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
        this.tunerGraphics.clear();

        // Audio processing
        const hz = AudioManager.getPitch();

        // Debug: Log to console (removed - too much spam, check AudioManager logs instead)

        if (hz > 50) {
            this.currentHz = hz;
            this.currentNote = this.hzToNote(hz);
            this.noteText.setText(this.currentNote);
            this.noteText.setVisible(true);
            const noteColor = this.getNoteColor(this.currentNote);
            this.noteText.setTint(noteColor);

            // Pulsing glow effect
            const glowColor = Phaser.Display.Color.IntegerToColor(noteColor);
            this.noteText.setShadow(0, 0, 20 + Math.sin(time / 100) * 10,
                `rgb(${glowColor.red},${glowColor.green},${glowColor.blue})`, false, true);
            this.noteText.setScale(1.0 + Math.sin(time / 100) * 0.03);
        } else {
            this.noteText.setText('--');
            this.noteText.setVisible(true);
            this.noteText.setScale(1.0);
            this.noteText.setTint(0x666666);
            this.noteText.setShadow(0, 0, 5, '#666666', false, true);
        }

        // Get waveform data for visualization
        this.waveformData = AudioManager.getWaveform();

        // Hand tracking - Only use LEFT hand
        const allLandmarks = handTrackingInstance.getLandmarks();
        const handedness = handTrackingInstance.getHandedness();

        // Filter for left hand only
        let landmarks = null;
        let leftHandIndex = -1;
        if (allLandmarks && allLandmarks.length > 0 && handedness && handedness.length > 0) {
            for (let i = 0; i < handedness.length; i++) {
                if (handedness[i][0].categoryName === 'Left') {
                    landmarks = allLandmarks[i];
                    leftHandIndex = i;
                    break;
                }
            }
        }

        // UPDATE DEBUG HUD
        this.debugHUD.update(time, {
            hand: landmarks,
            handCount: allLandmarks ? allLandmarks.length : 0,
            hz: this.currentHz,
            note: this.currentNote,
            volume: 0, // Need to expose volume from AudioManager if needed
            isCalibrated: this.isCalibrated,
            fretboard: this.fretboard
        });

        if (this.isCalibrated) {
            // PLAY MODE
            this.instructionText.setText("◆ PLAY MODE ◆ [SPACE: RECALIBRATE]");
            this.statusPill.setText('● ACTIVE');
            this.statusPill.setStyle({ fill: '#00ff88' });
            this.statusPill.setShadow(0, 0, 10, '#00ff88', false, true);

            if (landmarks) {
                this.updateFretboardPosition(landmarks);
                this.drawStringLines(time);
                this.drawARHandVisualization(landmarks, time);
            } else {
                this.drawStringLines(time);
            }

            this.drawVisualTuner(time);
            this.drawWaveform(time);

            const displayHz = this.currentHz > 0 ? Math.floor(this.currentHz) : 0;
            const displayNote = this.currentNote || '--';

            this.hudText.setText(
                `FREQ: ${displayHz} Hz\n` +
                `NOTE: ${displayNote}\n` +
                `MODE: TRACKING`
            );
            this.hudText.setVisible(true);

        } else {
            // CALIBRATION MODE
            this.instructionText.setText("◆ CALIBRATION ◆ PLACE LEFT HAND - 4 FINGERS ON FRETS 1-4");
            this.statusPill.setText('○ STANDBY');
            this.statusPill.setStyle({ fill: '#ffaa00' });
            this.statusPill.setShadow(0, 0, 8, '#ffaa00', false, true);

            // Show audio feedback even during calibration
            this.drawWaveform(time);

            const displayHz = this.currentHz > 0 ? Math.floor(this.currentHz) : 0;
            const displayNote = this.currentNote || '--';

            this.hudText.setText(
                `FREQ: ${displayHz} Hz\n` +
                `NOTE: ${displayNote}\n` +
                `MODE: CALIBRATING`
            );
            this.hudText.setVisible(true);

            if (landmarks) {
                this.tryCalibrate(landmarks, time);
            } else {
                this.calibrationStableFrames = 0;
            }
        }
    }

    tryCalibrate(hand, time) {
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

        // Always draw the alignment line to show finger positions
        // Calculate best-fit line through the 4 points
        const startX = points[0].x;
        const startY = points[0].y;
        const endX = points[3].x;
        const endY = points[3].y;

        // Check if fingers are roughly horizontal (aligned)
        const isAligned = this.checkAlignment(points);

        if (isAligned) {
            this.calibrationStableFrames++;
            const progress = Math.min(100, Math.floor((this.calibrationStableFrames / 60) * 100));

            this.hudText.setText(
                `CALIBRATING\n` +
                `${progress}%\n` +
                `HOLD STEADY`
            );

            // Draw thick glowing alignment line through all 4 fingers
            // Outer glow (widest)
            g.lineStyle(20, 0x00ff88, 0.1);
            g.lineBetween(startX, startY, endX, endY);

            // Middle glow
            g.lineStyle(12, 0x00ff88, 0.3);
            g.lineBetween(startX, startY, endX, endY);

            // Inner glow
            g.lineStyle(6, 0x00ff88, 0.6);
            g.lineBetween(startX, startY, endX, endY);

            // Core line
            g.lineStyle(3, 0x00ff88, 1);
            g.lineBetween(startX, startY, endX, endY);

            // Draw circles on fingertips with pulse
            const pulseSize = 2 + Math.sin(time / 100) * 1;
            points.forEach((p, i) => {
                // Outer glow
                g.fillStyle(0x00ff88, 0.1);
                g.fillCircle(p.x, p.y, 30 + pulseSize);

                // Middle ring
                g.fillStyle(0x00ff88, 0.3);
                g.fillCircle(p.x, p.y, 20 + pulseSize);

                // Inner bright circle
                g.fillStyle(0x00ff88, 0.8);
                g.fillCircle(p.x, p.y, 10 + pulseSize);

                // Stroke
                g.lineStyle(2, 0x00ff88, 1);
                g.strokeCircle(p.x, p.y, 18 + pulseSize);
            });

            // Draw progress indicator at center
            const centerX = (points[0].x + points[3].x) / 2;
            const centerY = (points[0].y + points[3].y) / 2;

            const progressArc = (progress / 100) * (Math.PI * 2);
            g.lineStyle(6, 0x00ff88, 0.8);
            g.beginPath();
            g.arc(centerX, centerY, 50, -Math.PI / 2, -Math.PI / 2 + progressArc);
            g.strokePath();

            // Outer ring
            g.lineStyle(2, 0x00ff88, 0.3);
            g.strokeCircle(centerX, centerY, 60);

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
            this.hudText.setText(
                `ALIGN\n` +
                `FINGERS\n` +
                `HORIZONTAL`
            );

            // Draw alignment line in orange/red to show current alignment (not correct yet)
            // Outer glow
            g.lineStyle(16, 0xff5500, 0.15);
            g.lineBetween(startX, startY, endX, endY);

            // Middle glow
            g.lineStyle(10, 0xff5500, 0.3);
            g.lineBetween(startX, startY, endX, endY);

            // Core line
            g.lineStyle(3, 0xff5500, 0.8);
            g.lineBetween(startX, startY, endX, endY);

            // Show dimmer circles on fingertips
            points.forEach((p, i) => {
                g.fillStyle(0xff5500, 0.2);
                g.fillCircle(p.x, p.y, 15);
                g.lineStyle(2, 0xff5500, 0.6);
                g.strokeCircle(p.x, p.y, 15);
            });
        }
    }

    checkAlignment(points) {
        // Check if points form roughly a horizontal line
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

        return variance < 30 && spacingVariance < avgSpacing * 0.4 && avgSpacing > 20 && avgSpacing < 200;
    }

    updateFretboardPosition(hand) {
        // Update fretboard position based on current finger positions
        const fingers = [
            { id: 8, name: 'INDEX' },
            { id: 12, name: 'MIDDLE' },
            { id: 16, name: 'RING' },
            { id: 20, name: 'PINKY' }
        ];

        const points = fingers.map(f => ({
            x: hand[f.id].x * 1000,
            y: hand[f.id].y * 800
        }));

        // Update center position
        const centerX = (points[0].x + points[3].x) / 2;
        const centerY = (points[0].y + points[3].y) / 2;

        // Update angle
        const angle = Phaser.Math.Angle.Between(
            points[0].x, points[0].y,
            points[3].x, points[3].y
        );

        // Smooth interpolation for less jittery movement
        const smoothing = 0.3;
        this.fretboard.centerX += (centerX - this.fretboard.centerX) * smoothing;
        this.fretboard.centerY += (centerY - this.fretboard.centerY) * smoothing;
        this.fretboard.angle += (angle - this.fretboard.angle) * smoothing;
    }

    getActiveString() {
        // Map frequency to guitar string (standard tuning)
        // E2 = 82.41 Hz (6th string)
        // A2 = 110.00 Hz (5th string)
        // D3 = 146.83 Hz (4th string)
        // G3 = 196.00 Hz (3rd string)
        // B3 = 246.94 Hz (2nd string)
        // E4 = 329.63 Hz (1st string)

        if (this.currentHz < 50) return -1;

        const stringFreqs = [
            { string: 5, freq: 82.41, name: 'E2' },   // 6th string (lowest)
            { string: 4, freq: 110.00, name: 'A2' },  // 5th string
            { string: 3, freq: 146.83, name: 'D3' },  // 4th string
            { string: 2, freq: 196.00, name: 'G3' },  // 3rd string
            { string: 1, freq: 246.94, name: 'B3' },  // 2nd string
            { string: 0, freq: 329.63, name: 'E4' }   // 1st string (highest)
        ];

        // Find closest string based on frequency
        let closestString = -1;
        let minDiff = Infinity;

        stringFreqs.forEach(s => {
            // Check fundamental and harmonics
            for (let harmonic = 1; harmonic <= 3; harmonic++) {
                const harmonicFreq = s.freq * harmonic;
                const diff = Math.abs(this.currentHz - harmonicFreq);

                // Allow ±50 Hz tolerance for string matching
                if (diff < minDiff && diff < 50) {
                    minDiff = diff;
                    closestString = s.string;
                }
            }
        });

        return closestString;
    }

    drawStringLines(time) {
        const g = this.fretGraphics;
        const { centerX, centerY, angle, spacing } = this.fretboard;
        const activeString = this.getActiveString();

        const perpAngle = angle + Math.PI / 2;
        const stringSpacing = 20; // Space between strings

        // Draw 6 guitar strings
        for (let i = 0; i < 6; i++) {
            // Calculate offset perpendicular to neck
            const offset = (i - 2.5) * stringSpacing;
            const offsetX = Math.cos(perpAngle) * offset;
            const offsetY = Math.sin(perpAngle) * offset;

            // Calculate string start and end points (extend along the neck)
            const neckLength = 500;
            const startX = centerX + offsetX - Math.cos(angle) * 100;
            const startY = centerY + offsetY - Math.sin(angle) * 100;
            const endX = centerX + offsetX + Math.cos(angle) * neckLength;
            const endY = centerY + offsetY + Math.sin(angle) * neckLength;

            // Check if this is the active string
            const isActive = i === activeString;

            if (isActive && this.currentHz > 50) {
                // Active string - bright glowing with note color
                const noteColor = this.getNoteColor(this.currentNote);
                const pulse = Math.sin(time / 100) * 0.3 + 0.7;

                // Outer glow
                g.lineStyle(10, noteColor, 0.2 * pulse);
                g.lineBetween(startX, startY, endX, endY);

                // Middle glow
                g.lineStyle(6, noteColor, 0.5 * pulse);
                g.lineBetween(startX, startY, endX, endY);

                // Core bright line
                g.lineStyle(3, noteColor, pulse);
                g.lineBetween(startX, startY, endX, endY);
            } else {
                // Inactive string - subtle cyan
                // Outer glow
                g.lineStyle(4, 0x00ffff, 0.1);
                g.lineBetween(startX, startY, endX, endY);

                // Core line
                g.lineStyle(2, 0x00ffff, 0.3);
                g.lineBetween(startX, startY, endX, endY);
            }
        }
    }

    drawARHandVisualization(hand, time) {
        const g = this.handGraphics;

        // Scale factors for canvas
        const scaleX = 1000;
        const scaleY = 800;

        // Draw bones (connections) - Use exact same structure as HandGestures
        const drawBone = (p1, p2, color = 0x00ffff, alpha = 0.5, width = 2) => {
            g.lineStyle(width, color, alpha);
            g.lineBetween(p1.x * scaleX, p1.y * scaleY, p2.x * scaleX, p2.y * scaleY);
        };

        // Thumb
        drawBone(hand[0], hand[1], 0xaaffff, 0.4, 1);
        drawBone(hand[1], hand[2], 0xaaffff, 0.5, 1);
        drawBone(hand[2], hand[3], 0xaaffff, 0.6, 2);
        drawBone(hand[3], hand[4], 0xaaffff, 0.7, 2);

        // Index
        drawBone(hand[0], hand[5], 0xaaffff, 0.4, 1);
        drawBone(hand[5], hand[6], 0xaaffff, 0.5, 1);
        drawBone(hand[6], hand[7], 0xaaffff, 0.6, 2);
        drawBone(hand[7], hand[8], 0xaaffff, 0.7, 2);

        // Middle
        drawBone(hand[0], hand[9], 0xaaffff, 0.4, 1);
        drawBone(hand[9], hand[10], 0xaaffff, 0.5, 1);
        drawBone(hand[10], hand[11], 0xaaffff, 0.6, 2);
        drawBone(hand[11], hand[12], 0xaaffff, 0.7, 2);

        // Ring
        drawBone(hand[0], hand[13], 0xaaffff, 0.4, 1);
        drawBone(hand[13], hand[14], 0xaaffff, 0.5, 1);
        drawBone(hand[14], hand[15], 0xaaffff, 0.6, 2);
        drawBone(hand[15], hand[16], 0xaaffff, 0.7, 2);

        // Pinky
        drawBone(hand[0], hand[17], 0xaaffff, 0.4, 1);
        drawBone(hand[17], hand[18], 0xaaffff, 0.5, 1);
        drawBone(hand[18], hand[19], 0xaaffff, 0.6, 2);
        drawBone(hand[19], hand[20], 0xaaffff, 0.7, 2);

        // Palm connections
        drawBone(hand[5], hand[9], 0xaaffff, 0.3, 1);
        drawBone(hand[9], hand[13], 0xaaffff, 0.3, 1);
        drawBone(hand[13], hand[17], 0xaaffff, 0.3, 1);

        // Draw joints (all 21 landmarks)
        hand.forEach((p, index) => {
            const x = p.x * scaleX;
            const y = p.y * scaleY;

            // Fingertips get special treatment
            if ([4, 8, 12, 16, 20].includes(index)) {
                this.drawTechGear(g, x, y, 12, time / 1000 + index * 0.5, 0x00ff88);
            } else {
                // Regular joints - small glowing dots
                g.fillStyle(0xffffff, 0.8);
                g.fillCircle(x, y, 3);

                g.lineStyle(1, 0xffffff, 0.6);
                g.strokeCircle(x, y, 5);
            }
        });

        // Palm center with rotating HUD
        const wrist = hand[0];
        const middle = hand[9];
        const palmX = ((wrist.x + middle.x) / 2) * scaleX;
        const palmY = ((wrist.y + middle.y) / 2) * scaleY;

        // Large rotating gear at palm (White)
        this.drawTechGear(g, palmX, palmY, 45, -time / 500, 0xffffff);
        this.drawTechGear(g, palmX, palmY, 30, time / 400, 0xffffff); // Inner counter-rotating ring

        // Calculate Rotation from hand tilt
        let angleRad = Phaser.Math.Angle.Between(
            wrist.x * scaleX, wrist.y * scaleY,
            middle.x * scaleX, middle.y * scaleY
        );
        let dialAngle = -(angleRad + (Math.PI / 2));
        const rotationDeg = Math.floor(dialAngle * 57.2958);

        // Position Cube & Grid relative to Palm (Offset: Left and Down)
        const cubeX = palmX - 120;
        const cubeY = palmY + 60;
        const cubeSize = 50;

        // Draw Grid (Blue/Purple)
        this.drawHeightmapGrid(g, cubeX, cubeY + 50, cubeSize * 1.5);

        // Draw Cube (Orange Wireframe)
        this.drawWireframeCube(g, cubeX, cubeY, cubeSize, time / 1000, 0xff5500);

        // Line from Palm to Cube
        g.lineStyle(1, 0xffffff, 0.5);
        g.lineBetween(palmX, palmY + 45, cubeX + 30, cubeY);

        // Update Text Labels
        // "palm locked" label near the cube
        if (this.palmLabel) {
            this.palmLabel.setPosition(cubeX + 60, cubeY - 20);
            this.palmLabel.setText(`palm locked\n:: ${Math.floor(wrist.z * -10000) / 10}`); // Mock data from Z depth
            this.palmLabel.setVisible(true);
        }

        // "rotation" label near the palm/wrist
        if (this.rotationLabel) {
            this.rotationLabel.setPosition(palmX - 60, palmY + 60);
            this.rotationLabel.setText(`▲ rotation ${rotationDeg}`);
            this.rotationLabel.setVisible(true);
        }
    }

    drawTechGear(g, x, y, radius, rotation, color) {
        // Outer interrupted circle (segmented arc)
        const segments = 4;
        const arcLen = (Math.PI * 2) / segments;
        const gap = 0.2;

        g.lineStyle(2, color, 1);
        for (let i = 0; i < segments; i++) {
            const start = rotation + (i * arcLen) + gap;
            const end = rotation + ((i + 1) * arcLen) - gap;
            g.beginPath();
            g.arc(x, y, radius, start, end);
            g.strokePath();
        }

        // Inner detail circle
        g.lineStyle(1, color, 0.5);
        g.strokeCircle(x, y, radius * 0.5);

        // Crosshair in center
        const r2 = radius * 0.3;
        g.lineStyle(1, color, 0.7);
        g.lineBetween(x - r2, y, x + r2, y);
        g.lineBetween(x, y - r2, x, y + r2);
    }

    drawWireframeCube(g, cx, cy, size, rotX, color) {
        g.lineStyle(2, color, 1);
        const r = size;
        const project = (x, y, z) => {
            const px = x * Math.cos(rotX) - z * Math.sin(rotX);
            const pz = x * Math.sin(rotX) + z * Math.cos(rotX);
            const py = y;
            const scale = 300 / (300 + pz * r);
            return { x: cx + px * r * scale, y: cy + py * r * scale };
        }
        const v = [];
        for (let z of [-1, 1]) for (let y of [-1, 1]) for (let x of [-1, 1]) v.push(project(x, y, z));
        const edges = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        edges.forEach(e => {
            g.beginPath();
            g.moveTo(v[e[0]].x, v[e[0]].y);
            g.lineTo(v[e[1]].x, v[e[1]].y);
            g.strokePath();
        });
    }

    drawHeightmapGrid(g, cx, cy, size) {
        g.lineStyle(1, 0x0044ff, 0.8); // Blue grid
        const divisions = 4;
        const step = size / divisions;
        for (let i = 0; i <= divisions; i++) {
            // Horizontal
            g.moveTo(cx - size / 2, cy - size / 2 + i * step);
            g.lineTo(cx + size / 2, cy - size / 2 + i * step);
            // Vertical
            g.moveTo(cx - size / 2 + i * step, cy - size / 2);
            g.lineTo(cx - size / 2 + i * step, cy + size / 2);
        }
        g.strokePath();

        // Border
        g.lineStyle(2, 0x0044ff, 1);
        g.strokeRect(cx - size / 2, cy - size / 2, size, size);
    }

    drawVisualTuner(time) {
        if (this.currentHz < 50) return;

        const g = this.tunerGraphics;
        const centerX = 500;
        const centerY = 150;
        const barWidth = 300;
        const barHeight = 15;

        // Background bar
        g.fillStyle(0x000000, 0.6);
        g.fillRoundedRect(centerX - barWidth / 2 - 5, centerY - barHeight / 2 - 5,
            barWidth + 10, barHeight + 10, 8);

        // Get the target frequency for the detected note
        const targetHz = this.noteToHz(this.currentNote);
        const diff = this.currentHz - targetHz;

        // Map difference to position (-50 cents to +50 cents)
        const cents = 1200 * Math.log2(this.currentHz / targetHz);
        const normalizedPos = Phaser.Math.Clamp(cents / 50, -1, 1);

        // Draw center target line
        g.lineStyle(2, 0xffffff, 0.5);
        g.lineBetween(centerX, centerY - barHeight, centerX, centerY + barHeight);

        // Draw tick marks
        for (let i = -2; i <= 2; i++) {
            if (i === 0) continue;
            const tickX = centerX + (i * barWidth / 4);
            g.lineStyle(1, 0x888888, 0.4);
            g.lineBetween(tickX, centerY - barHeight / 2, tickX, centerY + barHeight / 2);
        }

        // Draw needle
        const needleX = centerX + (normalizedPos * barWidth / 2);
        const isInTune = Math.abs(cents) < 5;
        const needleColor = isInTune ? 0x00ff88 : 0xff5500;

        // Needle glow
        g.fillStyle(needleColor, 0.3);
        g.fillCircle(needleX, centerY, 15);

        // Needle
        g.fillStyle(needleColor, 1);
        g.fillCircle(needleX, centerY, 8);

        // Needle line
        g.lineStyle(3, needleColor, 1);
        g.lineBetween(needleX, centerY - barHeight, needleX, centerY + barHeight);

        // Cent display
        const centsText = (cents > 0 ? '+' : '') + Math.floor(cents);
        const tunerText = this.add.text(centerX, centerY + 30, centsText + '¢', {
            fontFamily: 'Courier New, monospace',
            fontSize: '14px',
            fill: isInTune ? '#00ff88' : '#ff5500'
        }).setOrigin(0.5);

        tunerText.setShadow(0, 0, 10, isInTune ? '#00ff88' : '#ff5500', false, true);

        // Destroy after drawing (will redraw next frame)
        this.time.delayedCall(16, () => tunerText.destroy());
    }

    drawWaveform(time) {
        if (!this.waveformData || this.waveformData.length === 0) {
            return;
        }

        const g = this.waveformGraphics;
        const waveX = 50;
        const waveY = 680;
        const waveWidth = 900;
        const waveHeight = 80;

        // Get color based on current note
        const color = this.currentNote && this.currentHz > 50
            ? this.getNoteColor(this.currentNote)
            : 0x00ffff;

        // Draw waveform with glow effect
        const step = waveWidth / this.waveformData.length;

        // Sample every nth point for performance
        const sampleRate = Math.max(1, Math.floor(this.waveformData.length / 500));

        // Outer glow
        g.lineStyle(6, color, 0.15);
        for (let i = 0; i < this.waveformData.length - sampleRate; i += sampleRate) {
            const x1 = waveX + i * step;
            const y1 = waveY + waveHeight / 2 + (this.waveformData[i] * waveHeight / 2);
            const x2 = waveX + (i + sampleRate) * step;
            const y2 = waveY + waveHeight / 2 + (this.waveformData[i + sampleRate] * waveHeight / 2);
            g.lineBetween(x1, y1, x2, y2);
        }

        // Main waveform
        g.lineStyle(3, color, 0.8);
        for (let i = 0; i < this.waveformData.length - sampleRate; i += sampleRate) {
            const x1 = waveX + i * step;
            const y1 = waveY + waveHeight / 2 + (this.waveformData[i] * waveHeight / 2);
            const x2 = waveX + (i + sampleRate) * step;
            const y2 = waveY + waveHeight / 2 + (this.waveformData[i + sampleRate] * waveHeight / 2);
            g.lineBetween(x1, y1, x2, y2);
        }

        // Center line
        g.lineStyle(1, 0x444444, 0.4);
        g.lineBetween(waveX, waveY + waveHeight / 2, waveX + waveWidth, waveY + waveHeight / 2);
    }

    noteToHz(note) {
        const noteMap = {
            'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
            'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
            'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
        };
        return noteMap[note] || 440;
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
            'C': 0xff0000, 'C#': 0xff4400, 'D': 0xff8800, 'D#': 0xffcc00,
            'E': 0xffff00, 'F': 0x88ff00, 'F#': 0x00ff00, 'G': 0x00ff88,
            'G#': 0x00ffff, 'A': 0x0088ff, 'A#': 0x4400ff, 'B': 0x8800ff
        };
        return colorMap[note] || 0xffffff;
    }
}
