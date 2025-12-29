import Phaser from 'phaser';

export class HandOverlayRenderer {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();

        // "Terminator" Aesthetics
        this.styles = {
            plateColor: 0x606060,    // Dark Grey Steel
            plateAlpha: 0.7,
            wireframeColor: 0x00FF88, // Cyber Green for "Glitch" look (or use 0xC0C0C0 for pure steel)
            wireframeAlpha: 1.0,
            pistonColor: 0x444444,
            ledColor: 0xFF0000,      // Red Eyes/Sensor logic
            ledGlowAlpha: 0.6
        };
    }

    clear() {
        this.graphics.clear();
    }

    update(guitarState, time) {
        this.clear();

        // 1. Render LEFT HAND (Mechanical / Terminator)
        if (guitarState.leftHand) {
            const leftPoints = guitarState.leftHand.map(p => this.mapToScreen(p));
            this.drawMechanicalHand(leftPoints);
            this.drawHUD(leftPoints, time);
        }

        // 2. Render RIGHT HAND (Miasma Fire)
        if (guitarState.rightHand) {
            const rightPoints = guitarState.rightHand.map(p => this.mapToScreen(p));
            this.drawMiasmaHand(rightPoints, time);
        }
    }

    mapToScreen(normalizedPoint) {
        // Video Source Dimensions (from HandTracking.js constraints)
        const vidW = 1280;
        const vidH = 720;

        // Canvas Dimensions (from main.js config)
        const canW = 1000;
        const canH = 800;

        // "Cover" logic: Scale to fill the container, then center crop
        const scale = Math.max(canW / vidW, canH / vidH);

        const scaledW = vidW * scale;
        const scaledH = vidH * scale;

        const offsetX = (canW - scaledW) / 2;
        const offsetY = (canH - scaledH) / 2;

        return {
            x: (normalizedPoint.x * vidW * scale) + offsetX,
            y: (normalizedPoint.y * vidH * scale) + offsetY
        };
    }

    drawMechanicalHand(points) {
        const g = this.graphics;

        // 1. Draw "Hydraulics" (Wiring/Pistons underneath)
        // Simple lines connecting all joints first
        g.lineStyle(4, this.styles.pistonColor, 1.0);
        this.drawSkeletonLines(g, points);

        // 2. Draw The "Chassis" (Palm Plate)
        // Connect Wrist -> Index -> Middle -> Ring -> Pinky -> Wrist
        const palmIndices = [0, 5, 9, 13, 17];
        const palmPoly = palmIndices.map(i => points[i]);
        this.drawPlate(g, palmPoly);

        // 3. Draw Finger Plates (Armor Segments)
        // Fingers: Thumb(1-4), Index(5-8), Middle(9-12), Ring(13-16), Pinky(17-20)
        const fingers = [
            [1, 2, 3, 4],       // Thumb
            [5, 6, 7, 8],       // Index
            [9, 10, 11, 12],    // Middle
            [13, 14, 15, 16],   // Ring
            [17, 18, 19, 20]    // Pinky
        ];

        fingers.forEach(finger => {
            // Proximal Phalanx (Knuckle to Mid)
            // We create a "Bone Plate" by thickening the line
            this.drawSegmentPlate(g, points[finger[0]], points[finger[1]], 10, 8);

            // Middle Phalanx (Mid to Tip-base)
            // Thumb only has 3 joints in this list, handled broadly
            if (finger.length > 3) {
                this.drawSegmentPlate(g, points[finger[1]], points[finger[2]], 8, 6);
                this.drawSegmentPlate(g, points[finger[2]], points[finger[3]], 6, 4);
            } else {
                // Thumb special case
                this.drawSegmentPlate(g, points[finger[1]], points[finger[2]], 8, 5);
            }
        });

        // 4. Draw "Optics" (LED Fingertips)
        const tips = [4, 8, 12, 16, 20];
        tips.forEach(i => {
            const p = points[i];

            // Glow
            g.fillStyle(this.styles.ledColor, 0.4);
            g.fillCircle(p.x, p.y, 8);

            // Core
            g.fillStyle(0xFFFFFF, 1.0);
            g.fillCircle(p.x, p.y, 3);

            // Rim
            g.lineStyle(2, this.styles.ledColor, 1);
            g.strokeCircle(p.x, p.y, 8);
        });
    }

    drawMiasmaHand(points, time) {
        const g = this.graphics;
        const tips = [4, 8, 12, 16, 20];

        tips.forEach(i => {
            const p = points[i];

            // Per-finger random jitter
            const jitterX = (Math.random() - 0.5) * 4;
            const jitterY = (Math.random() - 0.5) * 4;

            // 3-Layer Miasma Fire
            // 1. Toxic Outer Haze
            g.fillStyle(0x00FF00, 0.15); // Toxic Green
            g.fillCircle(p.x + jitterX, p.y + jitterY, 15 + Math.sin(time / 100) * 2);

            // 2. Mystic Middle
            g.fillStyle(0xA020F0, 0.5); // Purple
            g.fillCircle(p.x + jitterX * 0.5, p.y + jitterY * 0.5, 8);

            // 3. Hot Core
            g.fillStyle(0xFFFFFF, 0.9);
            g.fillCircle(p.x, p.y, 3);
        });
    }

    drawSkeletonLines(g, points) {
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17], [0, 17]
        ];
        connections.forEach(pair => {
            const p1 = points[pair[0]];
            const p2 = points[pair[1]];
            g.lineBetween(p1.x, p1.y, p2.x, p2.y);
        });
    }

    drawPlate(g, polyPoints) {
        g.fillStyle(this.styles.plateColor, this.styles.plateAlpha);
        g.fillPoints(polyPoints, true, true);

        g.lineStyle(2, 0xAAAAAA, 1.0); // Edges
        g.strokePoints(polyPoints, true, true);
    }

    drawSegmentPlate(g, pStart, pEnd, widthStart, widthEnd) {
        // Calculate perpendicular vector for width
        const angle = Phaser.Math.Angle.Between(pStart.x, pStart.y, pEnd.x, pEnd.y);
        const perp = angle + Math.PI / 2;

        const wS = widthStart * 0.5;
        const wE = widthEnd * 0.5;

        // 4 corners of the segment plate
        const p1 = {
            x: pStart.x + Math.cos(perp) * wS,
            y: pStart.y + Math.sin(perp) * wS
        };
        const p2 = {
            x: pEnd.x + Math.cos(perp) * wE,
            y: pEnd.y + Math.sin(perp) * wE
        };
        const p3 = {
            x: pEnd.x - Math.cos(perp) * wE,
            y: pEnd.y - Math.sin(perp) * wE
        };
        const p4 = {
            x: pStart.x - Math.cos(perp) * wS,
            y: pStart.y - Math.sin(perp) * wS
        };

        const poly = [p1, p2, p3, p4];

        g.fillStyle(this.styles.plateColor, this.styles.plateAlpha);
        g.fillPoints(poly, true);

        g.lineStyle(1, 0xDDDDDD, 0.8);
        g.strokePoints(poly, true);

        // "Highlight" line for metallic sheen
        g.lineStyle(1, 0xFFFFFF, 0.4);
        g.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }

    drawHUD(points, time) {
        const g = this.graphics;
        // Draw a target reticle over the palm center
        const wrist = points[0];
        const middle = points[9];
        const cx = (wrist.x + middle.x) / 2;
        const cy = (wrist.y + middle.y) / 2;

        // Rotating bracket
        const size = 40;
        const angle = time / 1000;

        g.lineStyle(2, this.styles.wireframeColor, 0.6);

        // Convert polar to cartesian for corners relative to center
        const corners = [0, 90, 180, 270].map(deg => {
            const rad = Phaser.Math.DegToRad(deg) + angle;
            return {
                x: cx + Math.cos(rad) * size,
                y: cy + Math.sin(rad) * size
            };
        });

        // Draw brackets (not full circle)
        const len = 10;
        corners.forEach(c => {
            // Not doing complex bracket math, just simple circle cues for now
            g.strokeCircle(c.x, c.y, 2);
        });
        g.strokeRect(cx - size, cy - size, size * 2, size * 2);

        // Connect palm to wrist with "Data Stream"
        g.lineStyle(1, this.styles.wireframeColor, 0.3);
        for (let i = 0; i < 3; i++) {
            g.lineBetween(wrist.x + (i * 5), wrist.y, cx + (i * 5), cy);
        }
    }
}
