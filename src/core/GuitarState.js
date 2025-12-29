export class GuitarState {
    constructor() {
        // Audio State
        this.currentNote = '-';
        this.currentHz = 0;

        // Calibration State
        this.isCalibrated = false;
        this.calibrationStableFrames = 0;
        this.calibrationProgress = 0;

        // Fretboard State (Calibrated position)
        this.fretboard = {
            centerX: 0,
            centerY: 0,
            angle: 0,
            spacing: 0
        };

        // Hand State
        this.leftHand = null;
        this.rightHand = null;

        // Legacy accessor for backward compatibility if needed, though we should migrate
        this.handLandmarks = null;
    }

    resetCalibration() {
        this.isCalibrated = false;
        this.calibrationStableFrames = 0;
        this.calibrationProgress = 0;
    }

    setFretboard(centerX, centerY, angle, spacing) {
        this.fretboard = { centerX, centerY, angle, spacing };
        this.isCalibrated = true;
    }

    updateAudio(hz, note) {
        this.currentHz = hz;
        this.currentNote = note;
    }

    updateHands(left, right) {
        this.leftHand = left;
        this.rightHand = right;
        // Keep 'handLandmarks' pointing to left hand for any legacy systems (like calibration) 
        // that expect the main interaction hand.
        this.handLandmarks = left;
    }
}
