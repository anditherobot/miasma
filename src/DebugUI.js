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

        this.addButton('Toggle Infection', () => {
            if (this.scene.player.isInfected) this.scene.player.cleanse();
            else this.scene.player.isInfected = true;
        });

        this.addButton('Reset Level', () => this.scene.scene.restart());
        
        this.addButton('Kill Player', () => this.scene.player.die());
        
        this.addButton('Toggle Physics', () => {
             if (this.scene.physics.world.drawDebug) {
                 this.scene.physics.world.debugGraphic.clear();
                 this.scene.physics.world.drawDebug = false;
             } else {
                 this.scene.physics.world.createDebugGraphic();
                 this.scene.physics.world.drawDebug = true;
             }
        });
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

        const player = this.scene.player;
        const sentinel = this.scene.sentinel;
        
        const dist = Phaser.Math.Distance.Between(player.x, player.y, sentinel.x, sentinel.y);

        this.statsDiv.innerText = [
            `FPS: ${Math.round(this.scene.game.loop.actualFps)}`,
            `Player Pos: (${Math.round(player.x)}, ${Math.round(player.y)})`,
            `Status: ${player.isInfected ? 'INFECTED' : 'NORMAL'}`,
            `Mass: ${Math.floor(player.massIntegrity * 100)}%`,
            `Awareness: ${Math.floor(sentinel.awareness * 100)}%`,
            `Sentinel Dist: ${Math.round(dist)}`,
            `Critical Timer: ${Math.round(sentinel.criticalTimer)}`,
            `Missiles: ${sentinel.missiles.countActive()}`
        ].join('\n');
    }

    destroy() {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}