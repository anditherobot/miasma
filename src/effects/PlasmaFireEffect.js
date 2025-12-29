/**
 * PlasmaFireEffect - Plasma fire shader applied to face region
 *
 * Extracted from FaceShaderScene.js - the original plasma effect
 * Uses Canvas 2D to render pixel-perfect plasma shader within face contour
 */

import { BaseEffect } from './BaseEffect.js';

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
     * Extracted from FaceShaderScene.js lines 184-231
     */
    renderShaderOnFace(time, faceLandmarks, faceBox, video) {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Create a mask for the face region
        ctx.save();

        // Convert normalized coordinates to canvas coordinates
        const x = faceBox.x * canvas.width;
        const y = faceBox.y * canvas.height;
        const w = faceBox.width * canvas.width;
        const h = faceBox.height * canvas.height;

        // Create face mesh path for masking
        ctx.beginPath();

        // Use face contour landmarks (indices for face outline)
        const contourIndices = [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
        ];

        contourIndices.forEach((idx, i) => {
            if (idx < faceLandmarks.length) {
                const landmark = faceLandmarks[idx];
                const px = landmark.x * canvas.width;
                const py = landmark.y * canvas.height;

                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
        });

        ctx.closePath();
        ctx.clip();

        // Render plasma effect in the face region
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
}
