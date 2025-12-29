export class HUDOverlay {
    constructor(scene) {
        this.scene = scene;

        // Status Pill
        this.statusPill = scene.add.text(970, 30, 'INITIALIZING', {
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            fill: '#ffaa00',
            backgroundColor: '#000000aa',
            padding: { x: 15, y: 8 }
        }).setOrigin(1, 0).setShadow(0, 0, 8, '#ffaa00', false, true);

        // Note Display
        this.noteText = scene.add.text(500, 60, '-', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '72px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setShadow(0, 0, 20, '#ffffff', false, true);

        // Instruction Text
        this.instructionText = scene.add.text(500, 750, '', {
            fontFamily: 'Courier New, monospace',
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#000000bb',
            padding: { x: 20, y: 12 }
        }).setOrigin(0.5).setShadow(0, 0, 8, '#00ffff', false, true);

        // Info HUD
        this.infoText = scene.add.text(30, 30, '', {
            fontFamily: 'Courier New, monospace',
            fontSize: '13px',
            fill: '#00ff88',
            padding: { x: 12, y: 10 }
        }).setShadow(0, 0, 10, '#00ff88', false, true);
    }

    update(state) {
        // Status Pill
        if (state.isCalibrated) {
            this.statusPill.setText('● ACTIVE');
            this.statusPill.setStyle({ fill: '#00ff88' });
            this.statusPill.setShadow(0, 0, 10, '#00ff88', false, true);
            this.instructionText.setText("◆ PLAY MODE ◆ [SPACE: RECALIBRATE]");
        } else {
            this.statusPill.setText('○ STANDBY');
            this.statusPill.setStyle({ fill: '#ffaa00' });
            this.statusPill.setShadow(0, 0, 8, '#ffaa00', false, true);
            this.instructionText.setText("◆ CALIBRATION ◆ PLACE LEFT HAND - 4 FINGERS ON FRETS 1-4");
        }

        // Note Display
        if (state.currentHz > 50) {
            this.noteText.setText(state.currentNote);
            this.noteText.setTint(0xffffff); // Could use note color here
            this.noteText.setScale(1.1);
        } else {
            this.noteText.setText('--');
            this.noteText.setTint(0x666666);
            this.noteText.setScale(1.0);
        }

        // Info HUD
        const displayHz = state.currentHz > 0 ? Math.floor(state.currentHz) : 0;
        this.infoText.setText(
            `FREQ: ${displayHz} Hz\n` +
            `NOTE: ${state.currentNote}\n` +
            `MODE: ${state.isCalibrated ? 'TRACKING' : 'CALIBRATING'}`
        );
    }
}
