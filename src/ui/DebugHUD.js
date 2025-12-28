export default class DebugHUD {
    constructor(scene) {
        this.scene = scene;
        this.visible = false;

        // Base style
        this.style = {
            fontFamily: 'Consolas, monospace',
            fontSize: '11px',
            fill: '#00ff00',
            backgroundColor: '#000000cc',
            padding: { x: 10, y: 10 },
            fixedWidth: 250
        };

        // Create main text container
        this.text = this.scene.add.text(10, 100, '', this.style);
        this.text.setScrollFactor(0);
        this.text.setDepth(1000); // Always on top
        this.text.setVisible(this.visible);

        // Toggle Key (~)
        this.toggleKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACK_TICK);

        // Frame counter for FPS averaging
        this.frameCount = 0;
        this.lastTime = 0;
    }

    update(time, data = {}) {
        // Handle Toggle
        if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
            this.visible = !this.visible;
            this.text.setVisible(this.visible);
        }

        if (!this.visible) return;

        // Collect stats
        const fps = Math.round(this.scene.game.loop.actualFps);

        // Format Output
        let output = `[SYSTEM]\n`;
        output += `FPS: ${fps}\n`;
        output += `Time: ${(time / 1000).toFixed(1)}s\n\n`;

        output += `[VISION]\n`;
        if (data.hand) {
            output += `Hands Detected: ${data.handCount || 1}\n`;
            // Add safe check for landmarks
            const wr = data.hand[0]; // Wrist
            if (wr) {
                output += `Wrist: (${wr.x.toFixed(2)}, ${wr.y.toFixed(2)}, ${wr.z.toFixed(2)})\n`;
            }
        } else {
            output += `NO HAND DETECTED\n`;
        }
        output += `\n`;

        output += `[AUDIO]\n`;
        output += `Freq: ${data.hz ? data.hz.toFixed(1) : 0} Hz\n`;
        output += `Note: ${data.note || '-'}\n`;
        output += `RMS: ${data.volume ? data.volume.toFixed(4) : 0}\n\n`;

        output += `[GAME STATE]\n`;
        output += `Mode: ${data.isCalibrated ? 'TRACKING' : 'CALIBRATING'}\n`;
        if (data.fretboard) {
            output += `Fret Center: (${Math.floor(data.fretboard.centerX)}, ${Math.floor(data.fretboard.centerY)})\n`;
            output += `Fret Angle: ${(data.fretboard.angle * 57.29).toFixed(1)}°\n`;
        }

        this.text.setText(output);
    }
}
