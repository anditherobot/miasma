import { MusicTheory } from '../../core/MusicTheory.js';

export class WaveformRenderer {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
    }

    update(waveformData, state) {
        this.graphics.clear();
        if (!waveformData || waveformData.length === 0) return;

        const g = this.graphics;
        const width = 900;
        const height = 80;
        const x = 50;
        const y = 680;

        const color = state.currentHz > 50
            ? MusicTheory.getNoteColor(state.currentNote)
            : 0x00ffff;

        const step = width / waveformData.length;
        const sampleRate = Math.max(1, Math.floor(waveformData.length / 500));

        g.lineStyle(3, color, 0.8);
        g.beginPath();
        for (let i = 0; i < waveformData.length; i += sampleRate) {
            const px = x + i * step;
            const py = y + height / 2 + (waveformData[i] * height / 2);
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.strokePath();
    }
}
