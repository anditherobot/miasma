export default class DebugUI {
    constructor(scene) {
        this.scene = scene;
        this.container = document.createElement('div');
        this.setupStyles();
        this.createElements();
        document.body.appendChild(this.container);

        this.visible = true;
        this.toggleKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKTICK); // ` key to toggle
    }

    setupStyles() {
        Object.assign(this.container.style, {
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '300px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#0f0',
            fontFamily: 'monospace',
            padding: '10px',
            borderRadius: '5px',
            pointerEvents: 'auto', // Allow clicking buttons
            zIndex: '1000',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            border: '1px solid #333'
        });
    }

    createElements() {
        // Title
        const title = document.createElement('h3');
        title.innerText = 'Miasma Debugger (~)';
        title.style.margin = '0 0 10px 0';
        title.style.borderBottom = '1px solid #333';
        this.container.appendChild(title);

        // Stats Area
        this.statsDiv = document.createElement('div');
        this.statsDiv.style.whiteSpace = 'pre-wrap';
        this.statsDiv.style.fontSize = '12px';
        this.container.appendChild(this.statsDiv);

        // Actions Area
        this.actionsDiv = document.createElement('div');
        this.actionsDiv.style.display = 'grid';
        this.actionsDiv.style.gridTemplateColumns = '1fr 1fr';
        this.actionsDiv.style.gap = '5px';
        this.container.appendChild(this.actionsDiv);

        this.addButton('Reset Calibration', () => this.scene.guitarState.resetCalibration());
        this.addButton('Restart Scene', () => this.scene.scene.restart());
    }

    addButton(label, onClick) {
        const btn = document.createElement('button');
        btn.innerText = label;
        Object.assign(btn.style, {
            background: '#333',
            color: '#fff',
            border: '1px solid #555',
            padding: '5px',
            cursor: 'pointer',
            fontSize: '11px'
        });
        btn.onmouseover = () => btn.style.background = '#444';
        btn.onmouseout = () => btn.style.background = '#333';
        btn.onclick = onClick;
        this.actionsDiv.appendChild(btn);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
            this.visible = !this.visible;
            this.container.style.display = this.visible ? 'flex' : 'none';
        }

        if (!this.visible) return;

        const state = this.scene.guitarState;
        const landmarks = state.handLandmarks;

        let stats = [
            `FPS: ${Math.round(this.scene.game.loop.actualFps)}`,
            `-------------------`,
            `HAND TRACKING:`
        ];

        if (landmarks && landmarks.length > 0) {
            // Display specific key landmarks (Wrist, Thumb tip, Index tip)
            const wrist = landmarks[0];
            const thumb = landmarks[4];
            const index = landmarks[8];

            stats.push(`Wrist: [${wrist.x.toFixed(2)}, ${wrist.y.toFixed(2)}]`);
            stats.push(`Index: [${index.x.toFixed(2)}, ${index.y.toFixed(2)}]`);

            // Interaction Logic: Pinch Detection
            const dist = Phaser.Math.Distance.Between(
                thumb.x, thumb.y,
                index.x, index.y
            );

            const isPinching = dist < 0.08;
            stats.push(`-------------------`);
            stats.push(`ACTION: ${isPinching ? '● PINCHING' : '○ OPEN'}`);
            stats.push(`PINCH DIST: ${dist.toFixed(3)}`);
            stats.push(`-------------------`);
            stats.push(`CALIBRATED: ${state.isCalibrated ? 'YES' : 'NO'}`);
            if (state.isCalibrated) {
                stats.push(`FRET SPACING: ${state.fretboard.spacing.toFixed(1)}`);
            }
        } else {
            stats.push(`(NO HAND DETECTED)`);
        }

        this.statsDiv.innerText = stats.join('\n');
    }

    destroy() {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}