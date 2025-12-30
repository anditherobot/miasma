/**
 * PlasmaFireEffect - Plasma fire shader applied to face region
 *
 * Extracted from FaceShaderScene.js - the original plasma effect
 * Uses Canvas 2D to render pixel-perfect plasma shader within face contour
 */

import { BaseEffect } from './BaseEffect.js';
import AudioManager from '../core/AudioManager.js';

export class PlasmaFireEffect extends BaseEffect {
    constructor() {
        super({
            id: 'plasma-fire',
            name: 'Plasma Fire',
            target: 'face',
            requiresFace: true,
            requiresHands: false
        });

        this.canvas = null;
        this.ctx = null;
        this.audioLevel = 0.5;        // Current audio level (0.3-1.3 range)
        this.audioSmoothing = 0.15;   // Exponential smoothing factor
    }

    /**
     * Create canvas and append to DOM
     */
    activate(context) {
        super.activate(context);

        // Create an offscreen canvas for shader rendering
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1280;
        this.canvas.height = 720;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '10';

        const container = document.getElementById('game-container');
        if (container) {
            container.appendChild(this.canvas);
        } else {
            document.body.appendChild(this.canvas);
        }

        this.ctx = this.canvas.getContext('2d');

        // Start microphone for audio reactivity
        if (!AudioManager.analyser) {
            AudioManager.startMicrophone().catch(err => {
                console.warn('Microphone not available:', err);
            });
        }
    }

    /**
     * Render plasma effect on face region
     */
    render({ time, trackingData, context }) {
        const { faceLandmarks, faceBox, video } = trackingData.face;

        if (!this.ctx || !faceLandmarks || !faceBox) {
            // Clear if no face detected
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
            return;
        }

        // Clear previous frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Create face mask and render plasma
        this.renderShaderOnFace(time, faceLandmarks, faceBox, video);
    }

    /**
     * Render plasma shader within face contour mask
     * Enhanced with glow, jitter, and audio reactivity
     */
    renderShaderOnFace(time, faceLandmarks, faceBox, video) {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Update audio level with smoothing
        const currentAudioLevel = this.calculateAudioLevel();
        this.audioLevel += (currentAudioLevel - this.audioLevel) * this.audioSmoothing;

        // Calculate pulse animation
        const pulse = Math.sin(time / 100) * 0.3 + 0.7;

        // Create contour path with jitter
        const contourPath = this.createJitteredContourPath(faceLandmarks, time);

        // Render multi-layer glow BEFORE clipping
        this.renderContourGlow(ctx, contourPath, time, pulse, this.audioLevel);

        // Create clip mask and render plasma (existing logic)
        ctx.save();
        ctx.clip(contourPath);

        const x = faceBox.x * canvas.width;
        const y = faceBox.y * canvas.height;
        const w = faceBox.width * canvas.width;
        const h = faceBox.height * canvas.height;

        this.renderPlasmaEffect(ctx, time / 1000, x, y, w, h);
        ctx.restore();
    }

    /**
     * Pixel-by-pixel plasma shader implementation
     * Extracted from FaceShaderScene.js lines 233-295
     */
    renderPlasmaEffect(ctx, time, x, y, width, height) {
        // Create ImageData for shader output
        const imageData = ctx.createImageData(Math.ceil(width), Math.ceil(height));
        const data = imageData.data;

        const centerX = width / 2;
        const centerY = height / 2;

        // Render plasma shader effect
        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                const idx = (py * Math.ceil(width) + px) * 4;

                // Normalized coordinates
                const nx = (px - centerX) / (width / 2);
                const ny = (py - centerY) / (width / 2);

                // Distance from center
                const dist = nx * nx + ny * ny;

                // Time modulation
                const t = time + Math.abs(7.0 - dist);

                // Initial velocity
                let vx = nx * (1.0 - t) / 2.0;
                let vy = ny * (1.0 - t) / 2.0;

                // Accumulated color
                let r = 0, g = 0, b = 0;

                // Iterative plasma generation
                for (let i = 1; i < 8; i++) {
                    const sinX = Math.sin(vx) + 1.0;
                    const sinY = Math.sin(vy) + 1.0;
                    const variation = Math.abs(vx - vy);
                    const contrib = sinX * sinY * Math.pow(variation, 0.2);

                    r += contrib;
                    g += contrib * 0.5;
                    b += contrib * 0.3;

                    // Update velocity
                    const cosVy = Math.cos(vy * i + r + t);
                    const cosVx = Math.cos(vx * i + r + t);
                    vx += cosVy / i + 0.7;
                    vy += cosVx / i + 0.7;
                }

                // Final color with exponential mapping
                const expY = Math.exp(ny);
                r = Math.tanh(expY / (r + 0.1)) * 255;
                g = Math.tanh(expY / (g + 0.1)) * 128;
                b = Math.tanh(expY * 2 / (b + 0.1)) * 64;

                data[idx] = Math.max(0, Math.min(255, r));
                data[idx + 1] = Math.max(0, Math.min(255, g));
                data[idx + 2] = Math.max(0, Math.min(255, b));
                data[idx + 3] = 200; // Alpha
            }
        }

        ctx.putImageData(imageData, x, y);
    }

    /**
     * Clear canvas when deactivating
     */
    deactivate() {
        super.deactivate();

        // Clear canvas when deactivating
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Remove canvas from DOM
     */
    dispose() {
        super.dispose();

        // Remove canvas from DOM
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.canvas = null;
        this.ctx = null;
    }

    /**
     * Calculate audio level from microphone
     */
    calculateAudioLevel() {
        if (!AudioManager.analyser) {
            return 0.5; // Neutral if no audio
        }

        const bufferLength = AudioManager.analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);
        AudioManager.analyser.getFloatTimeDomainData(dataArray);

        // Calculate RMS (root mean square)
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);

        // Normalize and scale (0.3-1.3 range for always-visible effect)
        return 0.3 + Math.min(1.0, rms * 10);
    }

    /**
     * Convert HSL to RGB color
     */
    hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        const r = Math.round(255 * f(0));
        const g = Math.round(255 * f(8));
        const b = Math.round(255 * f(4));
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Generate dynamic fire color based on time and temperature
     */
    getFireColor(time, temperature = 0.5) {
        // Base hue oscillates red-orange (5-25 degrees)
        const baseHue = 15 + Math.sin(time / 500) * 10;

        // Temperature affects saturation and lightness
        // Hot (loud) = brighter/whiter, Cool (quiet) = deeper red
        const saturation = 80 - (temperature * 20); // 60-80%
        const lightness = 40 + (temperature * 20);  // 40-60%

        return this.hslToRgb(baseHue, saturation, lightness);
    }

    /**
     * Create face contour path with organic jitter
     */
    createJitteredContourPath(faceLandmarks, time) {
        const canvas = this.canvas;
        const path = new Path2D();

        const contourIndices = [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
        ];

        contourIndices.forEach((idx, i) => {
            if (idx < faceLandmarks.length) {
                const landmark = faceLandmarks[idx];

                // Add organic jitter (3 pixels, smooth over 50ms intervals)
                const jitterSeed = Math.floor(time / 50) + idx;
                const jitterX = (Math.sin(jitterSeed * 12.9898) * 0.5 + 0.5 - 0.5) * 3;
                const jitterY = (Math.sin(jitterSeed * 78.233) * 0.5 + 0.5 - 0.5) * 3;

                const px = landmark.x * canvas.width + jitterX;
                const py = landmark.y * canvas.height + jitterY;

                if (i === 0) {
                    path.moveTo(px, py);
                } else {
                    path.lineTo(px, py);
                }
            }
        });

        path.closePath();
        return path;
    }

    /**
     * Render multi-layer glow around face contour
     */
    renderContourGlow(ctx, contourPath, time, pulse, audioLevel) {
        // Calculate color temperature from audio (louder = hotter/brighter)
        const colorTemp = 0.5 + (audioLevel - 0.5) * 0.5; // 0.25-1.0 range
        const glowColor = this.getFireColor(time, colorTemp);

        // Intensity modulated by pulse and audio
        const intensity = pulse * audioLevel;

        // Render 3 glow layers (outer to inner)
        const layers = [
            { width: 12, alpha: 0.15 },  // Outer soft glow
            { width: 8,  alpha: 0.35 },  // Middle glow
            { width: 4,  alpha: 0.7  }   // Inner bright edge
        ];

        ctx.save();
        ctx.strokeStyle = glowColor;

        layers.forEach(layer => {
            ctx.globalAlpha = layer.alpha * intensity;
            ctx.lineWidth = layer.width;
            ctx.stroke(contourPath);
        });

        ctx.restore();
    }
}
