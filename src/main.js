import Phaser from 'phaser';
import Level1 from './scenes/Level1.js';
import HandGestures from './scenes/HandGestures.js';
import { handTrackingInstance } from './core/HandTracking.js';

// Initialize Hand Tracking
handTrackingInstance.initialize();

const config = {
    type: Phaser.WEBGL,
    canvas: document.getElementById('gameCanvas'),
    width: 800,
    height: 600,
    transparent: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true // Set to false to hide collision boxes
        }
    },
    scene: [HandGestures, Level1]
};

const game = new Phaser.Game(config);