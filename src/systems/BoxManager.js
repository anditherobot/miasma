import Phaser from 'phaser';

export class BoxManager {
    constructor(scene, palette, speechInput) {
        this.scene = scene;
        this.palette = palette;
        this.speechInput = speechInput;
        this.blocks = [];
        // Listening indicator config
        this.listeningPulse = { speed: 3.0, minAlpha: 0.3, maxAlpha: 0.9 };
    }

    createBlock(x, y, text, confidence = 1.0, isGhost = false) {
        const s = this.scene;
        const container = s.add.container(x, y);

        const bg = s.add.graphics();
        this.updateBlockVisuals(bg, confidence, isGhost, false);

        const txt = s.add.text(0, 0, text, {
            fontSize: '14px',
            color: '#e6f0ff',
            align: 'center',
            wordWrap: { width: 160 },
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }).setOrigin(0.5);

        // Stop icon (hidden by default, shown when listening)
        const stopIcon = s.add.graphics();

        container.add([bg, stopIcon, txt]);
        container.setSize(180, 60);
        container.setInteractive(new Phaser.Geom.Rectangle(-90, -30, 180, 60), Phaser.Geom.Rectangle.Contains);

        const block = {
            container,
            bg,
            stopIcon,
            text: txt,
            originalPos: { x, y },
            targetPos: { x, y },
            isGrabbed: false,
            confidence,
            isGhost,
            isExpanded: false,
            lastInteractionTime: performance.now(),
            listening: false,
            listeningPhase: 0
        };

        // Click to start speech
        container.on('pointerdown', () => this.startSpeechForBlock(block));

        this.blocks.push(block);
        return block;
    }

    updateBlockVisuals(bg, confidence, isGhost, isGrabbed, listeningAlpha = 0) {
        bg.clear();
        const alpha = isGhost ? 0.28 : Math.max(0.5, Math.min(1, confidence));
        const accent = isGrabbed ? 0xffffff : (confidence > 0.8 ? this.palette.neon : 0xffcc00);

        bg.fillStyle(0xFFFFFF, alpha * 0.08);
        bg.fillRoundedRect(-90, -30, 180, 60, 10);
        bg.lineStyle(1, 0xFFFFFF, 0.12 * alpha);
        bg.strokeRoundedRect(-88, -28, 176, 56, 8);
        bg.lineStyle(isGrabbed ? 3 : 2, accent, 0.45 + 0.35 * alpha);
        bg.strokeRoundedRect(-90, -30, 180, 60, 10);

        if (listeningAlpha > 0) {
            bg.lineStyle(4, 0x00ffcc, listeningAlpha * 0.8);
            bg.strokeRoundedRect(-92, -32, 184, 64, 11);
        }

        if (confidence > 0.9 && !isGhost) {
            bg.lineStyle(6, accent, 0.15 * alpha);
            bg.strokeRoundedRect(-95, -35, 190, 70, 12);
        }
    }

    grabBlock(block, x, y, handIndex) {
        block.isGrabbed = true;
        block.lastInteractionTime = performance.now();
        block.grabOffset = { x: block.container.x - x, y: block.container.y - y };
        block.originalGrabPos = { x, y };
        this.updateBlockVisuals(block.bg, block.confidence, block.isGhost, true);
    }

    moveBlock(block, x, y, wobbleAmount = 0.2) {
        let targetX = x + block.grabOffset.x;
        let targetY = y + block.grabOffset.y;

        const dx = Math.abs(x - block.originalGrabPos.x);
        const dy = Math.abs(y - block.originalGrabPos.y);

        if (dx > 20 || dy > 20) {
            if (dx > dy * 2) {
                const snappedY = block.originalGrabPos.y + block.grabOffset.y;
                targetY = targetY + (snappedY - targetY) * (1 - wobbleAmount);
            } else if (dy > dx * 2) {
                const snappedX = block.originalGrabPos.x + block.grabOffset.x;
                targetX = targetX + (snappedX - targetX) * (1 - wobbleAmount);
            }
        }

        block.container.x = targetX;
        block.container.y = targetY;
        block.targetPos.x = targetX;
        block.targetPos.y = targetY;
    }

    startSpeechForBlock(block) {
        if (block.listening) return;
        const s = this.scene;
        if (!this.speechInput || !this.speechInput.isSupported()) {
            if (s.debugText) s.debugText.setText('Speech not supported');
            return;
        }
        block.listening = true;
        const originalText = block.text.text || '';
        this.speechInput.startListening({
            onInterim: (interim) => {
                block.text.setText((originalText ? originalText + '\n' : '') + interim);
            },
            onFinal: (finalText) => {
                const current = block.text.text || '';
                const nl = current.endsWith('\n') ? '' : '\n';
                block.text.setText(current + nl + finalText);
            },
            onError: () => {
                if (s.debugText) s.debugText.setText('Speech error');
                block.listening = false;
            }
        });
        this.updateBlockVisuals(block.bg, block.confidence, block.isGhost, true);
    }

    stopSpeechForBlock(block) {
        if (this.speechInput) this.speechInput.stopListening();
        block.listening = false;
        block.stopIcon.clear();
        this.updateBlockVisuals(block.bg, block.confidence, block.isGhost, false);
    }

    updateBlockFX(block, delta) {
        // Update listening pulse animation
        if (block.listening) {
            block.listeningPhase = (block.listeningPhase + (delta / 1000) * this.listeningPulse.speed) % 1;
            const pulseAlpha = this.listeningPulse.minAlpha + 
                (this.listeningPulse.maxAlpha - this.listeningPulse.minAlpha) * 
                (0.5 + 0.5 * Math.sin(block.listeningPhase * Math.PI * 2));
            this.updateBlockVisuals(block.bg, block.confidence, block.isGhost, block.isGrabbed, pulseAlpha);
            this.drawStopIcon(block.stopIcon, pulseAlpha);
        } else {
            block.stopIcon.clear();
        }
    }

    drawStopIcon(g, alpha) {
        g.clear();
        const x = 75, y = -25; // top-right corner
        const size = 8;
        g.fillStyle(0xFF6B6B, alpha);
        g.fillRect(x - size/2, y - size/2, size, size);
    }
}
