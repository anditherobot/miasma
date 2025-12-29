import Phaser from 'phaser';

export class CalibrationSystem {
    constructor(guitarState) {
        this.state = guitarState;
    }

    update(time) {
        if (this.state.isCalibrated) return;

        const hand = this.state.handLandmarks;
        if (!hand) {
            this.state.calibrationStableFrames = 0;
            this.state.calibrationProgress = 0;
            return;
        }

        // Get 4 fingertips: Index(8), Middle(12), Ring(16), Pinky(20)
        const fingers = [8, 12, 16, 20];
        const points = fingers.map(id => ({
            x: hand[id].x * 1000,
            y: hand[id].y * 800
        }));

        if (this.checkAlignment(points)) {
            this.state.calibrationStableFrames++;
            this.state.calibrationProgress = Math.min(100, Math.floor((this.state.calibrationStableFrames / 60) * 100));

            if (this.state.calibrationStableFrames >= 60) {
                this.completeCalibration(points);
            }
        } else {
            this.state.calibrationStableFrames = 0;
            this.state.calibrationProgress = 0;
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

    completeCalibration(points) {
        const centerX = (points[0].x + points[3].x) / 2;
        const centerY = (points[0].y + points[3].y) / 2;

        const angle = Phaser.Math.Angle.Between(
            points[0].x, points[0].y,
            points[3].x, points[3].y
        );
        const spacing = Phaser.Math.Distance.Between(
            points[0].x, points[0].y,
            points[1].x, points[1].y
        );

        this.state.setFretboard(centerX, centerY, angle, spacing);
    }
}
