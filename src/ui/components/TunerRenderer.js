import Phaser from 'phaser'; // Needed for Math.Clamp
import { MusicTheory } from '../../core/MusicTheory.js';

export class TunerRenderer {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
        this.text = null;
    }

    update(state) {
        this.graphics.clear();
        if (this.text) this.text.destroy();

        if (state.currentHz < 50) return;

        const g = this.graphics;
        const centerX = 500;
        const centerY = 150;
        const barWidth = 300;
        const barHeight = 15;

        // Background
        g.fillStyle(0x000000, 0.6);
        g.fillRoundedRect(centerX - barWidth / 2 - 5, centerY - barHeight / 2 - 5, barWidth + 10, barHeight + 10, 8);

        const targetHz = MusicTheory.noteToHz(state.currentNote);
        const cents = 1200 * Math.log2(state.currentHz / targetHz);
        const normalizedPos = Phaser.Math.Clamp(cents / 50, -1, 1);

        // Ticks
        g.lineStyle(2, 0xffffff, 0.5);
        g.lineBetween(centerX, centerY - barHeight, centerX, centerY + barHeight);

        // Needle
        const needleX = centerX + (normalizedPos * barWidth / 2);
        const isInTune = Math.abs(cents) < 5;
        const needleColor = isInTune ? 0x00ff88 : 0xff5500;

        g.fillStyle(needleColor, 1);
        g.fillCircle(needleX, centerY, 8);
        g.lineStyle(3, needleColor, 1);
        g.lineBetween(needleX, centerY - barHeight, needleX, centerY + barHeight);

        // Text
        const centsText = (cents > 0 ? '+' : '') + Math.floor(cents);
        this.text = this.scene.add.text(centerX, centerY + 30, centsText + '¢', {
            fontFamily: 'Courier New, monospace',
            fontSize: '14px',
            fill: isInTune ? '#00ff88' : '#ff5500'
        }).setOrigin(0.5);
    }
}
