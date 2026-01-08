import Phaser from 'phaser';
import { handTrackingInstance } from '../core/HandTracking.js';

export default class SoftCanvasScene extends Phaser.Scene {
    constructor() {
        super('SoftCanvasScene');
        this.blocks = [];
        this.grabbedBlocksByHand = {}; // handIndex -> block
        this.pinchHoldTimers = {}; // handIndex -> time
        this.pinchThreshold = 0.05;
        this.magneticThreshold = 20;
        this.wobbleAmount = 0.2;
        this.confidenceDecayRate = 0.005; // Per frame
        this.auraRadius = 40;
    }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        this.graphics = this.add.graphics();
        this.uiGraphics = this.add.graphics();

        // --- THE SHELF (Interface Boxes) ---
        this.shelfHeight = 120;
        this.shelfBoxes = [
            { id: 'BUG FIX', x: 200, y: 60, keywords: ['fix', 'bug', 'error', 'issue'] },
            { id: 'FEATURE', x: 500, y: 60, keywords: ['add', 'feature', 'new', 'create'] },
            { id: 'REFACTOR', x: 800, y: 60, keywords: ['clean', 'refactor', 'optimize'] }
        ];

        this.shelfBoxes.forEach(box => {
            const rect = this.add.rectangle(box.x, box.y, 250, 80, 0xffffff, 0.05)
                .setStrokeStyle(2, 0x00ffcc, 0.3);
            this.add.text(box.x, box.y - 35, box.id, { fontSize: '12px', fill: '#00ffcc', alpha: 0.6 }).setOrigin(0.5);
            box.rect = rect;
        });

        // --- THE FORGE (Generation Zone) ---
        this.forgeZone = { y: 400, height: 400 };
        this.add.text(500, 780, 'THE FORGE :: GENERATION ZONE', { fontSize: '10px', fill: '#aaa', alpha: 0.5 }).setOrigin(0.5);

        // Create initial blocks
        this.createBlock(300, 600, "fix css layout", 1.0);
        this.createBlock(500, 650, "add hand tracking", 1.0);
        this.createBlock(700, 600, "clean up code", 1.0);
        this.createBlock(500, 700, "Ghost: Optimize Shaders", 0.5, true);

        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('HandGestures');
        });

        this.debugText = this.add.text(10, 770, 'SOFT CANVAS :: READY', { fontSize: '14px', fill: '#00ffcc' });
    }

    createBlock(x, y, text, confidence = 1.0, isGhost = false) {
        const container = this.add.container(x, y);
        
        const bg = this.add.graphics();
        this.updateBlockVisuals(bg, confidence, isGhost, false);

        const txt = this.add.text(0, 0, text, {
            fontSize: '16px',
            fill: '#ffffff',
            align: 'center',
            wordWrap: { width: 160 }
        }).setOrigin(0.5);

        container.add([bg, txt]);
        container.setSize(180, 60);
        
        const block = {
            container: container,
            bg: bg,
            text: txt,
            originalPos: { x: x, y: y },
            targetPos: { x: x, y: y },
            isGrabbed: false,
            confidence: confidence,
            isGhost: isGhost,
            isExpanded: false,
            lastInteractionTime: performance.now()
        };

        this.blocks.push(block);
        return block;
    }

    updateBlockVisuals(bg, confidence, isGhost, isGrabbed) {
        bg.clear();
        const alpha = isGhost ? 0.3 : confidence;
        const color = isGrabbed ? 0xffffff : (confidence > 0.8 ? 0x00ffcc : 0xffcc00);
        
        bg.fillStyle(0x333333, alpha * 0.8);
        bg.fillRoundedRect(-90, -30, 180, 60, 10);
        
        if (isGhost) {
            bg.lineStyle(1, 0xffffff, 0.4);
        } else {
            bg.lineStyle(isGrabbed ? 3 : 2, color, alpha);
        }
        bg.strokeRoundedRect(-90, -30, 180, 60, 10);

        if (confidence > 0.9 && !isGhost) {
            // Glow effect
            bg.lineStyle(4, color, alpha * 0.3);
            bg.strokeRoundedRect(-95, -35, 190, 70, 12);
        }
    }

    update(time, delta) {
        this.graphics.clear();
        this.uiGraphics.clear(); 
        
        const landmarks = handTrackingInstance.getLandmarks();

        // 1. Connection Threads
        this.drawConnectionThreads();

        if (landmarks && landmarks.length > 0) {
            const activeHandIndices = landmarks.map((_, i) => i.toString());
            landmarks.forEach((hand, index) => {
                this.processHand(hand, index.toString(), time);
                this.drawHand(hand, index, time);
                this.checkDismissGesture(hand, index.toString());
            });
            
            Object.keys(this.grabbedBlocksByHand).forEach(handIndex => {
                if (!activeHandIndices.includes(handIndex)) {
                    this.releaseBlock(this.grabbedBlocksByHand[handIndex], handIndex);
                }
            });
        } else {
            this.debugText.setText('SEARCHING_HAND...');
            Object.keys(this.grabbedBlocksByHand).forEach(handIndex => {
                this.releaseBlock(this.grabbedBlocksByHand[handIndex], handIndex);
            });
        }

        // 2. Periodic Ghost Spawning
        if (!this.lastGhostSpawn || time - this.lastGhostSpawn > 15000) {
            this.spawnRandomGhost();
            this.lastGhostSpawn = time;
        }

        // 3. Block Logic: Movement, Decay, Fading
// ...
    }

    checkDismissGesture(hand, handIndex) {
        // Simple Dismiss: Open palm moving UP fast
        const wrist = hand[0];
        const fingertips = [8, 12, 16, 20].map(i => hand[i]);
        const isPalmOpen = fingertips.every(f => f.y < wrist.y - 0.1);

        if (isPalmOpen) {
            const currentY = wrist.y * 800;
            if (this.lastWristY && this.lastWristY[handIndex]) {
                const velocityY = currentY - this.lastWristY[handIndex];
                if (velocityY < -15) { // Moving UP fast
                    this.dismissAllGhosts();
                }
            }
            if (!this.lastWristY) this.lastWristY = {};
            this.lastWristY[handIndex] = currentY;
        }
    }

    spawnRandomGhost() {
        const ideas = ["Improve Performance", "New UI Theme", "Fix Audio Bug", "Add Multiplayer", "Refactor Assets"];
        const text = ideas[Math.floor(Math.random() * ideas.length)];
        const x = 200 + Math.random() * 600;
        const y = 500 + Math.random() * 200;
        this.createBlock(x, y, `Ghost: ${text}`, 0.5, true);
    }

    dismissAllGhosts() {
        this.blocks.forEach(block => {
            if (block.isGhost) {
                block.confidence = 0.05; // Trigger immediate removal
            }
        });
        this.debugText.setText("GESTURE :: UNIVERSAL DISMISS");
    }

    drawConnectionThreads() {
        const g = this.graphics;
        g.lineStyle(1, 0x00ffcc, 0.2);
        
        for (let i = 0; i < this.blocks.length; i++) {
            for (let j = i + 1; j < this.blocks.length; j++) {
                const b1 = this.blocks[i];
                const b2 = this.blocks[j];
                const dist = Phaser.Math.Distance.Between(b1.container.x, b1.container.y, b2.container.x, b2.container.y);
                
                if (dist < 300) {
                    g.beginPath();
                    g.moveTo(b1.container.x, b1.container.y);
                    g.lineTo(b2.container.x, b2.container.y);
                    g.strokePath();
                }
            }
        }
    }

    processHand(hand, handIndex, time) {
        const thumb = hand[4];
        const index = hand[8];
        const distance = Phaser.Math.Distance.Between(thumb.x, thumb.y, index.x, index.y);
        
        const midX = (1 - (thumb.x + index.x) / 2) * 1000;
        const midY = (thumb.y + index.y) / 2 * 800;
        const ix = (1 - index.x) * 1000;
        const iy = index.y * 800;

        const isPinching = distance < this.pinchThreshold;
        const grabbedBlock = this.grabbedBlocksByHand[handIndex];

        // --- RETICLE LOGIC ---
        let isHovering = false;
        this.blocks.forEach(block => {
            const distToBlock = Phaser.Math.Distance.Between(ix, iy, block.container.x, block.container.y);
            if (distToBlock < 100) isHovering = true;
        });
        this.drawReticle(ix, iy, isHovering);

        if (isPinching) {
            // Initiate Speech Hold Logic
            if (!this.pinchHoldTimers[handIndex]) {
                this.pinchHoldTimers[handIndex] = time;
            }
            const holdDuration = time - this.pinchHoldTimers[handIndex];
            this.drawAura(midX, midY, holdDuration / 1000);

            if (holdDuration > 1000 && !grabbedBlock) {
                 this.debugText.setText(`SPEECH_ENGINE :: ACTIVE [HAND_${handIndex}]`);
            }

            if (!grabbedBlock) {
                // Try to grab a block
                this.blocks.forEach(block => {
                    if (!block.isGrabbed) { 
                        const distToBlock = Phaser.Math.Distance.Between(midX, midY, block.container.x, block.container.y);
                        if (distToBlock < 100) {
                            if (block.isGhost) {
                                block.isGhost = false;
                                block.confidence = 1.0;
                            }
                            this.grabBlock(block, midX, midY, handIndex);
                        }
                    }
                });
            } else {
                this.moveBlock(grabbedBlock, midX, midY);
            }
        } else {
            if (grabbedBlock) {
                this.releaseBlock(grabbedBlock, handIndex);
            }
            this.pinchHoldTimers[handIndex] = null;
        }
    }

    drawReticle(x, y, isHovering) {
        const g = this.uiGraphics;
        g.lineStyle(2, 0x00ffcc, 0.8);
        if (isHovering) {
            // Crosshair
            g.strokeCircle(x, y, 8);
            g.moveTo(x - 12, y); g.lineTo(x + 12, y);
            g.moveTo(x, y - 12); g.lineTo(x, y + 12);
        } else {
            // Simple Dot
            g.strokeCircle(x, y, 4);
        }
        g.strokePath();
    }

    drawAura(x, y, progress) {
        const g = this.uiGraphics;
        const radius = 30;
        g.lineStyle(2, 0xffffff, 0.3);
        g.strokeCircle(x, y, radius);
        
        if (progress > 0) {
            g.lineStyle(4, 0x00ffcc, 1);
            g.beginPath();
            g.arc(x, y, radius, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * Math.min(progress, 1)));
            g.strokePath();
        }

        if (progress >= 1.0) {
            // Border glow
            g.lineStyle(10, 0x00ffcc, 0.1 * Math.sin(performance.now() / 200) + 0.1);
            g.strokeRect(0, 0, 1000, 800);
        }
    }

    grabBlock(block, x, y, handIndex) {
        this.grabbedBlocksByHand[handIndex] = block;
        block.isGrabbed = true;
        block.lastInteractionTime = performance.now();
        block.grabOffset = {
            x: block.container.x - x,
            y: block.container.y - y
        };
        block.originalGrabPos = { x: x, y: y };
        this.updateBlockVisuals(block.bg, block.confidence, block.isGhost, true);
    }

    moveBlock(block, x, y) {
        let targetX = x + block.grabOffset.x;
        let targetY = y + block.grabOffset.y;

        // --- MAGNETIC AXIS SNAPPING ---
        const dx = Math.abs(x - block.originalGrabPos.x);
        const dy = Math.abs(y - block.originalGrabPos.y);

        if (dx > 20 || dy > 20) { // Min threshold to start snapping logic
            if (dx > dy * 2) {
                // Mostly horizontal movement
                const snappedY = block.originalGrabPos.y + block.grabOffset.y;
                targetY = targetY + (snappedY - targetY) * (1 - this.wobbleAmount);
            } else if (dy > dx * 2) {
                // Mostly vertical movement
                const snappedX = block.originalGrabPos.x + block.grabOffset.x;
                targetX = targetX + (snappedX - targetX) * (1 - this.wobbleAmount);
            }
        }

        block.container.x = targetX;
        block.container.y = targetY;
        block.targetPos.x = targetX;
        block.targetPos.y = targetY;
    }

    releaseBlock(block, handIndex) {
        if (!block) return;
        block.isGrabbed = false;
        delete this.grabbedBlocksByHand[handIndex];
        
        // --- KEYWORD ROUTING & SHELF SNAPPING ---
        if (block.container.y < this.shelfHeight + 50) {
            let snapped = false;
            const text = block.text.text.toLowerCase();

            for (const box of this.shelfBoxes) {
                // Check keywords or proximity
                const matchesKeyword = box.keywords.some(k => text.includes(k));
                const isNear = Phaser.Math.Distance.Between(block.container.x, block.container.y, box.x, box.y) < 150;

                if (matchesKeyword || isNear) {
                    block.targetPos.x = box.x;
                    block.targetPos.y = box.y;
                    snapped = true;
                    this.debugText.setText(`ROUTED :: ${box.id}`);
                    break;
                }
            }

            if (!snapped) {
                block.targetPos.y = this.shelfHeight / 2;
            }
        }

        this.updateBlockVisuals(block.bg, block.confidence, block.isGhost, false);
    }

    drawHand(hand, handIndex, time) {
        const g = this.graphics;
        const color = handIndex === "0" ? 0x00ffcc : 0x00aaff;
        g.lineStyle(2, color, 0.5);
        
        const points = hand.map(p => ({
            x: (1 - p.x) * 1000,
            y: p.y * 800
        }));

        // Helper to draw a finger
        const drawFinger = (indices) => {
            for (let i = 0; i < indices.length - 1; i++) {
                g.moveTo(points[indices[i]].x, points[indices[i]].y);
                g.lineTo(points[indices[i+1]].x, points[indices[i+1]].y);
            }
        };

        // Palm & Fingers
        drawFinger([0, 1, 2, 3, 4]);    // Thumb
        drawFinger([0, 5, 6, 7, 8]);    // Index
        drawFinger([9, 10, 11, 12]);    // Middle
        drawFinger([13, 14, 15, 16]);   // Ring
        drawFinger([0, 17, 18, 19, 20]); // Pinky
        
        // Palm connections
        drawFinger([5, 9, 13, 17]);
        g.moveTo(points[0].x, points[0].y);
        g.lineTo(points[17].x, points[17].y);
        g.strokePath();

        // Joint Nodes
        points.forEach((p, i) => {
            g.fillStyle(color, 0.8);
            g.fillCircle(p.x, p.y, 3);
            if ([4, 8, 12, 16, 20].includes(i)) {
                g.lineStyle(1, color, 1);
                g.strokeCircle(p.x, p.y, 6);
            }
        });
    }
}
