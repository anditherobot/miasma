import Phaser from 'phaser';
import MenuScene from './scenes/MenuScene.js';
import GuitarScene from './scenes/GuitarScene.js';
import Level1 from './scenes/Level1.js';
import HandGestures from './scenes/HandGestures.js';
import FaceShaderScene from './scenes/FaceShaderScene.js';
import SoftCanvasScene from './scenes/SoftCanvasScene.js';
import { handTrackingInstance } from './core/HandTracking.js';
import { faceTrackingInstance } from './core/FaceTracking.js';
import { initializeEffects } from './effects/effects-library.js';

// Initialize Hand Tracking
handTrackingInstance.initialize();

// Initialize Face Tracking
faceTrackingInstance.initialize();

// Initialize Effects Library
initializeEffects();

const config = {
    type: Phaser.WEBGL,
    canvas: document.getElementById('gameCanvas'),
    width: 1000,
    height: 800,
    transparent: true,
    
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true // Set to false to hide collision boxes
        }
    },
    scene: [MenuScene, SoftCanvasScene, FaceShaderScene, GuitarScene, HandGestures, Level1]
};

const game = new Phaser.Game(config);