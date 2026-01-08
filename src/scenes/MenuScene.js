import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a2e');

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        // Title
        this.add.text(centerX, 100, 'AR Trainer', {
            font: 'bold 48px Arial',
            fill: '#00ff00'
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(centerX, 150, 'Select a Scene', {
            font: '24px Arial',
            fill: '#cccccc'
        }).setOrigin(0.5);

        // Scene buttons
        const scenes = [
            { name: 'Guitar', key: 'GuitarScene', y: 250 },
            { name: 'Hand Gestures', key: 'HandGestures', y: 320 },
            { name: 'Face Shader', key: 'FaceShaderScene', y: 390 },
            { name: 'Level 1', key: 'Level1', y: 460 },
            { name: 'Soft Canvas', key: 'SoftCanvasScene', y: 530 }
        ];

        scenes.forEach(scene => {
            const button = this.add.rectangle(centerX, scene.y, 300, 50, 0x0088ff);
            button.setInteractive();
            button.on('pointerover', () => {
                button.setFillStyle(0x00ccff);
            });
            button.on('pointerout', () => {
                button.setFillStyle(0x0088ff);
            });
            button.on('pointerdown', () => {
                this.scene.start(scene.key);
            });

            this.add.text(centerX, scene.y, scene.name, {
                font: 'bold 20px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
        });

        // Instructions
        this.add.text(centerX, 650, 'Press ESC in any scene to return to menu', {
            font: '14px Arial',
            fill: '#888888'
        }).setOrigin(0.5);

        // ESC key to return
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.stop();
            this.scene.start('MenuScene');
        });
    }
}
