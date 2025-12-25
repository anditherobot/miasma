import Phaser from 'phaser';
import Level1 from './scenes/Level1.js';

const config = {
    type: Phaser.WEBGL,
    canvas: document.getElementById('gameCanvas'),
    width: 800,
    height: 600,
    backgroundColor: '#050505',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true // Set to false to hide collision boxes
        }
    },
    scene: [Level1]
};

const game = new Phaser.Game(config);