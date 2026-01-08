import Phaser from 'phaser';
import { handTrackingInstance } from '../core/HandTracking.js';
import { addNavigationButtons } from '../ui/NavigationButtons.js';
import { speechInput } from '../core/SpeechInput.js';
import { BoxManager } from '../systems/BoxManager.js';
import { LayerPanel } from '../ui/LayerPanel.js';
import { GestureDisplay } from '../ui/GestureDisplay.js';

export default class SoftCanvasScene extends Phaser.Scene {
    constructor() {
        super('SoftCanvasScene');
        this.blocks = [];
        this.cards = []; // VR Cards
        this.grabbedBlocksByHand = {}; // handIndex -> block
        this.grabbedCardsByHand = {}; // handIndex -> card
        this.pinchHoldTimers = {}; // handIndex -> time
        this.pinchThreshold = 0.05;
        this.magneticThreshold = 20;
        this.wobbleAmount = 0.2;
        this.confidenceDecayRate = 0.005; // Per frame
        this.auraRadius = 40;
        
        // Visual palette for Soft Canvas (cohesive, modern look)
        this.palette = {
            bgDeep: 0x0b0d14,
            bgMid: 0x10131c,
            grid: 0x1b2030,
            neon: 0x00ffcc,
            accent: 0x2196F3,
            accentAlt: 0x9C27B0,
            cardBase: 0xFAFAFA,
            textPrimary: '#e6f0ff',
            textMuted: '#8aa1b4'
        };
        
        // Card Visual Settings (TRANSPARENCY CONTROLS)
        this.cardTransparency = {
            background: 0.95,        // Main card background (0.0 - 1.0)
            shadow: 0.08,            // Drop shadow opacity
            border: 0.6,             // Border line opacity
            closeButton: 0.9         // Close button opacity
        };
        
        // Holographic FX for cards (Minority Report style)
        this.holoFX = {
            edgeColor: 0x00eaff,
            edgeAlt: 0x47b9ff,
            edgeAlpha: 0.9,
            innerAlpha: 0.06,
            scanlineAlpha: 0.12,
            shimmerSpeed: 0.6,   // cycles/sec
            tiltMax: 0.06,       // radians
            trailColor: 0x00c6ff,
            trailAlpha: 0.35,
            trailWidth: 6,
            trailLengthMs: 220
        };
        
        // Background color cycle
        this.bgColors = [
            0x0b0d14, // deep navy
            0x1a0b2e, // purple-dark
            0x0d1b2a, // teal-dark
            0x2e0b0b, // red-dark
            0x0b2e1b, // green-dark
            0x2e1b0b, // orange-dark
            0x1b0b2e, // violet-dark
            0x0b1b2e  // cyan-dark
        ];
        this.bgColorIndex = 0;
        this.bgColorCycleSpeed = 0.5; // seconds per color
        
        // Card Physics Settings (ELASTICITY/SMOOTHNESS)
        this.cardPhysics = {
            stretchLerp: 0.25,       // Smooth interpolation for size (higher = faster, 0.0-1.0)
            positionLerp: 0.3,       // Base movement interpolation
            accelBoostThreshold: 1500, // px/s^2 threshold to boost responsiveness
            accelBoost: 0.4,          // Additional lerp when sudden acceleration is detected
            maxLerp: 0.9,             // Cap for dynamic lerp
            minWidth: 200,
            maxWidth: 900,
            minHeight: 150,
            maxHeight: 700
        };
    }

    create() {
        // Add Navigation Buttons
        addNavigationButtons(this);
        // Initialize BoxManager and expose blocks reference
        this.boxManager = new BoxManager(this, this.palette, speechInput);
        this.blocks = this.boxManager.blocks;

        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        // Layered graphics: bg (back), graphics (main), uiGraphics (overlay)
        this.bgGraphics = this.add.graphics();
        this.trailGraphics = this.add.graphics();
        this.graphics = this.add.graphics();
        this.uiGraphics = this.add.graphics();

        // Initialize Layer Panel FIRST (before creating any cards)
        this.layerPanel = new LayerPanel(this, this.palette);
        
        // Initialize Gesture Display (shows current gesture & code path)
        this.gestureDisplay = new GestureDisplay(this);

        // Scene title
        this.add.text(24, 20, 'Soft Canvas', {
            fontSize: '18px',
            color: this.palette.textPrimary,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }).setAlpha(0.85).setDepth(1000);

        // Create initial VR Cards
        this.createCard(500, 300, 400, 300, "VR Card Demo\n\nThis is a stretchable card.\nGrab with one hand to move.\nGrab with both hands to stretch!");

        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('HandGestures');
        });

        this.input.keyboard.on('keydown-C', () => {
            this.createCard(500, 400, 300, 200, "New Card\n\nPress C to create more cards.");
        });

        // Spawn Box button
        this.addSpawnButton();

        this.debugText = this.add.text(10, 770, 'SOFT CANVAS :: READY', { 
            fontSize: '12px', 
            color: this.palette.textMuted,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }).setAlpha(0.8);

        // Register layer objects with panel
        this.layerPanel.registerLayerGroup('cards', this.cards.map(c => c.container));
        this.layerPanel.registerLayerGroup('blocks', this.blocks.map(b => b.container));
        this.layerPanel.registerLayerObject('trails', this.trailGraphics);
    }

    createBlock(x, y, text, confidence = 1.0, isGhost = false) {
        const container = this.add.container(x, y);
        
        const bg = this.add.graphics();
        this.updateBlockVisuals(bg, confidence, isGhost, false);

        const txt = this.add.text(0, 0, text, {
            fontSize: '14px',
            color: '#e6f0ff',
            align: 'center',
            wordWrap: { width: 160 },
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }).setOrigin(0.5);

        container.add([bg, txt]);
        container.setSize(180, 60);
        container.setInteractive(new Phaser.Geom.Rectangle(-90, -30, 180, 60), Phaser.Geom.Rectangle.Contains);
        container.on('pointerdown', () => this.startSpeechForBlock(block));
        
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
            lastInteractionTime: performance.now(),
            listening: false
        };

        this.blocks.push(block);
        return block;
    }

    createCard(x, y, width, height, text) {
        const container = this.add.container(x, y);
        
        // Modern flat card with subtle shadow
        const bg = this.add.graphics();
        const overlay = this.add.graphics();
        
        // Soft shadow for elevation (iOS/Material style)
        bg.fillStyle(0x000000, this.cardTransparency.shadow);
        bg.fillRoundedRect(-width/2 + 2, -height/2 + 3, width, height, 12);
        bg.fillStyle(0x000000, this.cardTransparency.shadow * 0.6);
        bg.fillRoundedRect(-width/2 + 1, -height/2 + 2, width, height, 12);
        
        // Main card - clean white/light background
        bg.fillStyle(0xFAFAFA, this.cardTransparency.background);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 12);
        
        // Subtle border for definition
        bg.lineStyle(1, 0xE0E0E0, this.cardTransparency.border);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 12);

        // Modern close button (top-right corner)
        const closeBtn = this.add.graphics();
        const closeBtnX = width/2 - 25;
        const closeBtnY = -height/2 + 25;
        
        // Circular button with hover-ready styling
        closeBtn.fillStyle(0xF5F5F5, this.cardTransparency.closeButton);
        closeBtn.fillCircle(closeBtnX, closeBtnY, 14);
        closeBtn.lineStyle(1, 0xE0E0E0, this.cardTransparency.border * 0.8);
        closeBtn.strokeCircle(closeBtnX, closeBtnY, 14);
        
        // X icon - clean lines
        closeBtn.lineStyle(2, 0x757575, 1);
        closeBtn.beginPath();
        closeBtn.moveTo(closeBtnX - 5, closeBtnY - 5);
        closeBtn.lineTo(closeBtnX + 5, closeBtnY + 5);
        closeBtn.moveTo(closeBtnX + 5, closeBtnY - 5);
        closeBtn.lineTo(closeBtnX - 5, closeBtnY + 5);
        closeBtn.strokePath();

        // Modern text styling
        const txt = this.add.text(0, 0, text, {
            fontSize: '16px',
            fill: '#333333',
            align: 'center',
            wordWrap: { width: width - 50 },
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            lineSpacing: 4
        }).setOrigin(0.5);

        // Modern resize handles (corners)
        const handles = this.add.graphics();
        const handleSize = 6;
        const corners = [
            { x: -width/2, y: -height/2 },
            { x: width/2, y: -height/2 },
            { x: -width/2, y: height/2 },
            { x: width/2, y: height/2 }
        ];
        corners.forEach(corner => {
            // Clean circular handles
            handles.fillStyle(0xFFFFFF, 0.95);
            handles.fillCircle(corner.x, corner.y, handleSize);
            handles.lineStyle(2, 0x2196F3, 0.7);
            handles.strokeCircle(corner.x, corner.y, handleSize);
        });

        container.add([bg, overlay, handles, txt, closeBtn]);
        container.setSize(width, height);
        
        // Make card clickable for speech input
        container.setInteractive(
            new Phaser.Geom.Rectangle(-width/2, -height/2, width, height),
            Phaser.Geom.Rectangle.Contains
        );
        container.on('pointerdown', (pointer) => {
            // Check if clicking close button (already handled in processHandForCards)
            const localX = pointer.x - container.x;
            const localY = pointer.y - container.y;
            const distToCloseBtn = Phaser.Math.Distance.Between(
                localX, localY,
                closeBtnX, closeBtnY
            );
            if (distToCloseBtn < 12) return; // Don't start speech if clicking close button
            
            // Toggle speech on/off for this card
            if (card.listening) {
                this.stopSpeechForCard(card);
            } else {
                this.startSpeechForCard(card);
            }
        });
        
        const card = {
            container: container,
            bg: bg,
            overlay: overlay,
            handles: handles,
            text: txt,
            closeBtn: closeBtn,
            closeBtnBounds: { x: closeBtnX, y: closeBtnY, radius: 12 },
            width: width,
            height: height,
            targetWidth: width,      // For smooth interpolation
            targetHeight: height,    // For smooth interpolation
            targetX: x,              // For smooth movement interpolation
            targetY: y,              // For smooth movement interpolation
            isGrabbed: false,
            grabbedByHands: new Set(), // Track which hands are grabbing
            grabOffsets: {}, // handIndex -> {x, y}
            stretchMode: false,
            initialStretchDistance: null,
            initialStretchSize: null,
            hand0Pos: null,
            hand1Pos: null,
            moveState: {
                prevTargetX: x,
                prevTargetY: y,
                prevVelX: 0,
                prevVelY: 0
            },
            motionHistory: [],
            edgeGlow: 0,
            shimmerPhase: 0,
            listening: false,
            listeningPhase: null
        };

        this.cards.push(card);
        this.layerPanel.updateCardsList(this.cards);
        return card;
    }

    updateBlockVisuals(bg, confidence, isGhost, isGrabbed) {
        bg.clear();
        const alpha = isGhost ? 0.28 : Math.max(0.5, Math.min(1, confidence));
        const accent = isGrabbed ? 0xffffff : (confidence > 0.8 ? this.palette.neon : 0xffcc00);

        // soft glass base
        bg.fillStyle(0xFFFFFF, alpha * 0.08);
        bg.fillRoundedRect(-90, -30, 180, 60, 10);
        // subtle inner stroke
        bg.lineStyle(1, 0xFFFFFF, 0.12 * alpha);
        bg.strokeRoundedRect(-88, -28, 176, 56, 8);
        // accent outline
        bg.lineStyle(isGrabbed ? 3 : 2, accent, 0.45 + 0.35 * alpha);
        bg.strokeRoundedRect(-90, -30, 180, 60, 10);

        if (confidence > 0.9 && !isGhost) {
            // gentle aura ring
            bg.lineStyle(6, accent, 0.15 * alpha);
            bg.strokeRoundedRect(-95, -35, 190, 70, 12);
        }
    }

    update(time, delta) {
        // Update gesture display
        this.gestureDisplay.update(time);
        
        // Cycle background color
        if (!this.bgColorTimer) this.bgColorTimer = 0;
        this.bgColorTimer += delta / 1000; // Convert to seconds
        
        if (this.bgColorTimer >= this.bgColorCycleSpeed) {
            this.bgColorIndex = (this.bgColorIndex + 1) % this.bgColors.length;
            this.bgColorTimer = 0;
            const color = this.bgColors[this.bgColorIndex];
            this.cameras.main.setBackgroundColor(color);
        }
        
        this.graphics.clear();
        this.uiGraphics.clear(); 
        this.drawBackground();
        this.trailGraphics.clear();
        
        const landmarks = handTrackingInstance.getLandmarks();

        // 1. Connection Threads
        this.drawConnectionThreads();

        if (landmarks && landmarks.length > 0) {
            const activeHandIndices = landmarks.map((_, i) => i.toString());
            landmarks.forEach((hand, index) => {
                this.processHand(hand, index.toString(), time);
                this.processHandForCards(hand, index.toString(), time);
                this.drawHand(hand, index, time);
                this.checkDismissGesture(hand, index.toString());
            });
            
            Object.keys(this.grabbedBlocksByHand).forEach(handIndex => {
                if (!activeHandIndices.includes(handIndex)) {
                    this.releaseBlock(this.grabbedBlocksByHand[handIndex], handIndex);
                }
            });

            Object.keys(this.grabbedCardsByHand).forEach(handIndex => {
                if (!activeHandIndices.includes(handIndex)) {
                    this.releaseCard(this.grabbedCardsByHand[handIndex], handIndex);
                }
            });
        } else {
            this.debugText.setText('SEARCHING_HAND...');
            Object.keys(this.grabbedBlocksByHand).forEach(handIndex => {
                this.releaseBlock(this.grabbedBlocksByHand[handIndex], handIndex);
            });
            Object.keys(this.grabbedCardsByHand).forEach(handIndex => {
                this.releaseCard(this.grabbedCardsByHand[handIndex], handIndex);
            });
        }

        // 3. Block Logic: Movement, Decay, Fading
        this.blocks.forEach((block, index) => {
            // Smooth lerp to target position
            if (!block.isGrabbed) {
                block.container.x = Phaser.Math.Linear(block.container.x, block.targetPos.x, 0.15);
                block.container.y = Phaser.Math.Linear(block.container.y, block.targetPos.y, 0.15);
            }

            // Confidence decay for non-interacted blocks
            const timeSinceInteraction = time - block.lastInteractionTime;
            if (timeSinceInteraction > 30000 && !block.isGrabbed) { // 30 seconds
                block.confidence = Math.max(0, block.confidence - this.confidenceDecayRate);
                if (block.confidence < 0.1) {
                    block.container.destroy();
                    this.blocks.splice(index, 1);
                    return;
                }
                this.boxManager.updateBlockVisuals(block.bg, block.confidence, block.isGhost, block.isGrabbed);
            }
        });
        
        // 4. Card Logic: Smooth elastic size changes
        this.cards.forEach(card => {
            let needsRedraw = false;
            
            // SMOOTH WIDTH INTERPOLATION (Elasticity)
            if (Math.abs(card.width - card.targetWidth) > 0.5) {
                card.width = Phaser.Math.Linear(card.width, card.targetWidth, this.cardPhysics.stretchLerp);
                needsRedraw = true;
            }
            
            // SMOOTH HEIGHT INTERPOLATION (Elasticity)
            if (Math.abs(card.height - card.targetHeight) > 0.5) {
                card.height = Phaser.Math.Linear(card.height, card.targetHeight, this.cardPhysics.stretchLerp);
                needsRedraw = true;
            }
            
            // Redraw only if size changed
            if (needsRedraw && card.isGrabbed) {
                this.redrawCard(card);
            }

            // POSITION SMOOTHING: Apply dynamic lerp based on hand acceleration
            // Skip position updates while in stretch mode (position locked)
            if (!card.stretchMode) {
                const dt = (typeof delta === 'number' && delta > 0) ? (delta / 1000) : 0.016; // seconds
                const ms = card.moveState;
                const baseLerp = this.cardPhysics.positionLerp;

                // Compute target velocity and acceleration from target changes
                const velX = (card.targetX - ms.prevTargetX) / dt;
                const velY = (card.targetY - ms.prevTargetY) / dt;
                const accelX = (velX - ms.prevVelX) / dt;
                const accelY = (velY - ms.prevVelY) / dt;
                const accelMag = Math.hypot(accelX, accelY);

                let dynamicLerp = baseLerp;
                if (accelMag > this.cardPhysics.accelBoostThreshold) {
                    dynamicLerp = Math.min(this.cardPhysics.maxLerp, baseLerp + this.cardPhysics.accelBoost);
                }

                // Smoothly move container toward targets
                card.container.x = Phaser.Math.Linear(card.container.x, card.targetX, dynamicLerp);
                card.container.y = Phaser.Math.Linear(card.container.y, card.targetY, dynamicLerp);

                // Persist motion state for next frame
                ms.prevVelX = velX;
                ms.prevVelY = velY;
                ms.prevTargetX = card.targetX;
                ms.prevTargetY = card.targetY;
            }
        });

        // 5. Card FX: holographic overlays, trails, tilt/shimmer
        this.cards.forEach(card => this.updateCardFX(card, time, typeof delta === 'number' ? delta : 16));

        // 6. Block FX: listening pulse animation
        this.blocks.forEach(block => this.boxManager.updateBlockFX(block, typeof delta === 'number' ? delta : 16));
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
        this.boxManager.createBlock(x, y, `Ghost: ${text}`, 0.5, true);
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
                 // Find nearest block to start speech
                 let nearest = null; let nearestDist = Infinity;
                 this.blocks.forEach(b => {
                     const d = Phaser.Math.Distance.Between(midX, midY, b.container.x, b.container.y);
                     if (d < 120 && d < nearestDist) { nearest = b; nearestDist = d; }
                 });
                 if (nearest && !nearest.listening) {
                     this.boxManager.startSpeechForBlock(nearest);
                     this.debugText.setText(`SPEECH_ENGINE :: ACTIVE [HAND_${handIndex}]`);
                 }
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
        const base = this.palette.neon;
        g.lineStyle(2, base, 0.9);
        if (isHovering) {
            // Crosshair
            g.strokeCircle(x, y, 10);
            g.moveTo(x - 14, y); g.lineTo(x + 14, y);
            g.moveTo(x, y - 14); g.lineTo(x, y + 14);
        } else {
            // Simple Dot
            g.strokeCircle(x, y, 5);
        }
        g.strokePath();
    }

    drawAura(x, y, progress) {
        const g = this.uiGraphics;
        const radius = 32;
        // outer soft ring
        g.lineStyle(2, 0xffffff, 0.25);
        g.strokeCircle(x, y, radius);
        
        if (progress > 0) {
            const pct = Math.min(progress, 1);
            g.lineStyle(5, this.palette.neon, 0.95);
            g.beginPath();
            g.arc(x, y, radius, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * pct));
            g.strokePath();
            // inner faint ring
            g.lineStyle(1, this.palette.neon, 0.35);
            g.strokeCircle(x, y, radius - 8);
        }

        if (progress >= 1.0) {
            // subtle animated border glow
            g.lineStyle(8, this.palette.neon, 0.08 * Math.sin(performance.now() / 240) + 0.12);
            g.strokeRect(8, 8, 984, 784);
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
        this.boxManager.updateBlockVisuals(block.bg, block.confidence, block.isGhost, true);
    }

    moveBlock(block, x, y) {
        this.boxManager.moveBlock(block, x, y, this.wobbleAmount);
    }

    releaseBlock(block, handIndex) {
        if (!block) return;
        block.isGrabbed = false;
        delete this.grabbedBlocksByHand[handIndex];
        // Stop speech if tied to this block
        if (block.listening) {
            this.boxManager.stopSpeechForBlock(block);
        }

        this.boxManager.updateBlockVisuals(block.bg, block.confidence, block.isGhost, false);
    }

    processHandForCards(hand, handIndex, time) {
        const thumb = hand[4];
        const index = hand[8];
        const distance = Phaser.Math.Distance.Between(thumb.x, thumb.y, index.x, index.y);
        
        const midX = (1 - (thumb.x + index.x) / 2) * 1000;
        const midY = (thumb.y + index.y) / 2 * 800;
        const isPinching = distance < this.pinchThreshold;

        const grabbedCard = this.grabbedCardsByHand[handIndex];

        if (isPinching) {
            if (!grabbedCard) {
                // Try to grab a card
                for (let i = this.cards.length - 1; i >= 0; i--) {
                    const card = this.cards[i];
                    const distToCard = Phaser.Math.Distance.Between(
                        midX, midY, 
                        card.container.x, card.container.y
                    );
                    
                    // Check if clicking close button
                    const localX = midX - card.container.x;
                    const localY = midY - card.container.y;
                    const distToCloseBtn = Phaser.Math.Distance.Between(
                        localX, localY,
                        card.closeBtnBounds.x, card.closeBtnBounds.y
                    );
                    
                    if (distToCloseBtn < card.closeBtnBounds.radius) {
                        this.closeCard(card);
                        break;
                    }
                    
                    if (distToCard < Math.max(card.width, card.height) / 2) {
                        this.grabCard(card, midX, midY, handIndex);
                        break;
                    }
                }
            } else {
                // Check for two-hand stretch mode
                const otherHandIndex = handIndex === "0" ? "1" : "0";
                const otherGrabbedCard = this.grabbedCardsByHand[otherHandIndex];
                
                if (otherGrabbedCard === grabbedCard) {
                    // Both hands grabbing same card - activate/continue stretch mode
                    if (!grabbedCard.stretchMode) {
                        // Initialize stretch mode
                        grabbedCard.stretchMode = true;
                        grabbedCard.initialStretchSize = {
                            width: grabbedCard.width,
                            height: grabbedCard.height
                        };
                        // Lock position when stretch mode starts
                        grabbedCard.lockedPosition = {
                            x: grabbedCard.container.x,
                            y: grabbedCard.container.y
                        };
                        this.debugText.setText(`STRETCH MODE ACTIVATED`);
                    }
                    
                    // Update hand positions
                    if (handIndex === "0") {
                        grabbedCard.hand0Pos = { x: midX, y: midY };
                    } else {
                        grabbedCard.hand1Pos = { x: midX, y: midY };
                    }
                    
                    // If both hand positions are set, stretch the card
                    if (grabbedCard.hand0Pos && grabbedCard.hand1Pos) {
                        this.stretchCard(grabbedCard);
                    }
                } else {
                    // Single hand - move card
                    grabbedCard.stretchMode = false;
                    this.moveCard(grabbedCard, midX, midY);
                }
            }
        } else {
            if (grabbedCard) {
                this.releaseCard(grabbedCard, handIndex);
            }
        }
    }

    grabCard(card, x, y, handIndex) {
        this.grabbedCardsByHand[handIndex] = card;
        card.isGrabbed = true;
        card.grabbedByHands.add(handIndex);
        card.grabOffsets[handIndex] = {
            x: card.container.x - x,
            y: card.container.y - y
        };
        
        // Update visual - modern elevated effect when grabbed
        card.bg.clear();
        
        // Elevated shadow (stronger when lifted)
        card.bg.fillStyle(0x000000, 0.15);
        card.bg.fillRoundedRect(-card.width/2 + 3, -card.height/2 + 5, card.width, card.height, 12);
        card.bg.fillStyle(0x000000, 0.08);
        card.bg.fillRoundedRect(-card.width/2 + 2, -card.height/2 + 3, card.width, card.height, 12);
        
        // Main card - brighter when active
        card.bg.fillStyle(0xFFFFFF, 0.98);
        card.bg.fillRoundedRect(-card.width/2, -card.height/2, card.width, card.height, 12);
        
        // Active state border (blue accent)
        card.bg.lineStyle(2, 0x2196F3, 0.8);
        card.bg.strokeRoundedRect(-card.width/2, -card.height/2, card.width, card.height, 12);
        card.edgeGlow = 1.0;
        
        this.debugText.setText(`CARD GRABBED [HAND_${handIndex}]`);
    }

    moveCard(card, x, y) {
        const handIndex = Array.from(card.grabbedByHands)[0];
        // Update movement targets instead of directly setting position
        card.targetX = x + card.grabOffsets[handIndex].x;
        card.targetY = y + card.grabOffsets[handIndex].y;
        // Track motion for trails (world-space)
        card.motionHistory.push({ x: card.container.x, y: card.container.y, t: performance.now() });
        const cutoff = performance.now() - this.holoFX.trailLengthMs;
        while (card.motionHistory.length && card.motionHistory[0].t < cutoff) {
            card.motionHistory.shift();
        }
    }

    stretchCard(card) {
        const pos0 = card.hand0Pos;
        const pos1 = card.hand1Pos;
        
        // Calculate distance between hands
        const dx = Math.abs(pos1.x - pos0.x);
        const dy = Math.abs(pos1.y - pos0.y);
        
        // Initialize stretch baseline if needed
        if (!card.initialStretchDistance) {
            card.initialStretchDistance = { x: dx, y: dy };
        }
        
        // Determine primary axis based on hand movement
        const isHorizontal = dx > dy;
        
        if (isHorizontal) {
            // Calculate target width based on hand distance
            const scaleFactor = dx / card.initialStretchDistance.x;
            const targetWidth = Math.max(
                this.cardPhysics.minWidth, 
                Math.min(this.cardPhysics.maxWidth, card.initialStretchSize.width * scaleFactor)
            );
            
            // ELASTIC SMOOTH INTERPOLATION
            card.targetWidth = targetWidth;
            this.debugText.setText(`STRETCH X: ${Math.floor(card.targetWidth)}px`);
        } else {
            // Calculate target height based on hand distance
            const scaleFactor = dy / card.initialStretchDistance.y;
            const targetHeight = Math.max(
                this.cardPhysics.minHeight, 
                Math.min(this.cardPhysics.maxHeight, card.initialStretchSize.height * scaleFactor)
            );
            
            // ELASTIC SMOOTH INTERPOLATION
            card.targetHeight = targetHeight;
            this.debugText.setText(`STRETCH Y: ${Math.floor(card.targetHeight)}px`);
        }

        // Keep card position LOCKED during stretch (no motion)
        if (card.lockedPosition) {
            card.container.x = card.lockedPosition.x;
            card.container.y = card.lockedPosition.y;
        }
    }

    redrawCard(card) {
        // Redraw with modern flat design
        card.bg.clear();
        
        // Elevated shadow
        card.bg.fillStyle(0x000000, 0.15);
        card.bg.fillRoundedRect(-card.width/2 + 3, -card.height/2 + 5, card.width, card.height, 12);
        card.bg.fillStyle(0x000000, 0.08);
        card.bg.fillRoundedRect(-card.width/2 + 2, -card.height/2 + 3, card.width, card.height, 12);
        
        if (card.stretchMode) {
            // Stretch mode - purple accent
            card.bg.fillStyle(0xFFFFFF, 0.98);
            card.bg.fillRoundedRect(-card.width/2, -card.height/2, card.width, card.height, 12);
            
            // Animated border for stretch feedback
            card.bg.lineStyle(2, 0x9C27B0, 1.0);
            card.bg.strokeRoundedRect(-card.width/2, -card.height/2, card.width, card.height, 12);
            
            // Inner accent line
            card.bg.lineStyle(1, 0x9C27B0, 0.3);
            card.bg.strokeRoundedRect(-card.width/2 + 4, -card.height/2 + 4, card.width - 8, card.height - 8, 10);
        } else {
            // Normal grabbed state - blue accent
            card.bg.fillStyle(0xFFFFFF, 0.98);
            card.bg.fillRoundedRect(-card.width/2, -card.height/2, card.width, card.height, 12);
            
            card.bg.lineStyle(2, 0x2196F3, 0.8);
            card.bg.strokeRoundedRect(-card.width/2, -card.height/2, card.width, card.height, 12);
        }

        // Redraw handles - modern style
        card.handles.clear();
        const handleSize = 6;
        const handleColor = card.stretchMode ? 0x9C27B0 : 0x2196F3;
        const corners = [
            { x: -card.width/2, y: -card.height/2 },
            { x: card.width/2, y: -card.height/2 },
            { x: -card.width/2, y: card.height/2 },
            { x: card.width/2, y: card.height/2 }
        ];
        corners.forEach(corner => {
            card.handles.fillStyle(0xFFFFFF, 0.95);
            card.handles.fillCircle(corner.x, corner.y, handleSize);
            card.handles.lineStyle(2, handleColor, 0.8);
            card.handles.strokeCircle(corner.x, corner.y, handleSize);
        });

        // Update text wrapping
        card.text.setWordWrapWidth(card.width - 40);

        // Redraw close button - modern style
        card.closeBtn.clear();
        const closeBtnX = card.width/2 - 25;
        const closeBtnY = -card.height/2 + 25;
        
        card.closeBtn.fillStyle(0xF5F5F5, 0.9);
        card.closeBtn.fillCircle(closeBtnX, closeBtnY, 14);
        card.closeBtn.lineStyle(1, 0xE0E0E0, 0.5);
        card.closeBtn.strokeCircle(closeBtnX, closeBtnY, 14);
        
        card.closeBtn.lineStyle(2, 0x757575, 1);
        card.closeBtn.beginPath();
        card.closeBtn.moveTo(closeBtnX - 5, closeBtnY - 5);
        card.closeBtn.lineTo(closeBtnX + 5, closeBtnY + 5);
        card.closeBtn.moveTo(closeBtnX + 5, closeBtnY - 5);
        card.closeBtn.lineTo(closeBtnX - 5, closeBtnY + 5);
        card.closeBtn.strokePath();

        // Update close button bounds
        card.closeBtnBounds.x = closeBtnX;
        card.closeBtnBounds.y = closeBtnY;
    }

    releaseCard(card, handIndex) {
        if (!card) return;
        
        card.grabbedByHands.delete(handIndex);
        delete card.grabOffsets[handIndex];
        delete this.grabbedCardsByHand[handIndex];

        // Clear hand position for this hand
        if (handIndex === "0") {
            card.hand0Pos = null;
        } else {
            card.hand1Pos = null;
        }

        if (card.grabbedByHands.size === 0) {
            card.isGrabbed = false;
            card.stretchMode = false;
            card.initialStretchDistance = null;
            card.initialStretchSize = null;
            card.lockedPosition = null; // Clear locked position
            card.motionHistory = [];
            
            // Reset visual - modern default state
            card.bg.clear();
            
            // Soft shadow
            card.bg.fillStyle(0x000000, 0.08);
            card.bg.fillRoundedRect(-card.width/2 + 2, -card.height/2 + 3, card.width, card.height, 12);
            card.bg.fillStyle(0x000000, 0.05);
            card.bg.fillRoundedRect(-card.width/2 + 1, -card.height/2 + 2, card.width, card.height, 12);
            
            // Main card
            card.bg.fillStyle(0xFAFAFA, 0.95);
            card.bg.fillRoundedRect(-card.width/2, -card.height/2, card.width, card.height, 12);
            
            // Subtle border
            card.bg.lineStyle(1, 0xE0E0E0, 0.6);
            card.bg.strokeRoundedRect(-card.width/2, -card.height/2, card.width, card.height, 12);
            
            this.debugText.setText('CARD RELEASED');
        } else if (card.grabbedByHands.size === 1) {
            // Only one hand left - exit stretch mode
            card.stretchMode = false;
            card.initialStretchDistance = null;
            card.initialStretchSize = null;
            card.lockedPosition = null; // Clear locked position
            this.debugText.setText('STRETCH MODE ENDED');
        }
    }

    closeCard(card) {
        const index = this.cards.indexOf(card);
        if (index > -1) {
            card.container.destroy();
            this.cards.splice(index, 1);
            
            // Release from all hands
            Object.keys(this.grabbedCardsByHand).forEach(handIndex => {
                if (this.grabbedCardsByHand[handIndex] === card) {
                    delete this.grabbedCardsByHand[handIndex];
                }
            });
            
            // Update layer panel
            this.layerPanel.updateCardsList(this.cards);
            this.debugText.setText('CARD CLOSED');
        }
    }

    drawHand(hand, handIndex, time) {
        const g = this.graphics;
        const color = handIndex === "0" ? this.palette.neon : 0x00aaff;
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

    drawBackground() {
        const g = this.bgGraphics;
        g.clear();
        // Base layers
        g.fillStyle(this.palette.bgDeep, 1);
        g.fillRect(0, 0, 1000, 800);
        g.fillStyle(this.palette.bgMid, 1);
        g.fillRect(0, 0, 1000, 800);

        // Soft grid
        g.lineStyle(1, this.palette.grid, 0.35);
        const gridSize = 80;
        for (let x = 0; x <= 1000; x += gridSize) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, 800);
            g.strokePath();
        }
        for (let y = 0; y <= 800; y += gridSize) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(1000, y);
            g.strokePath();
        }

        // Vignette
        g.lineStyle(40, 0x000000, 0.25);
        g.strokeRect(0, 0, 1000, 800);
    }

    updateCardFX(card, time, delta) {
        // Velocity-based tilt
        const vx = card.container.x - (card._prevX ?? card.container.x);
        const vy = card.container.y - (card._prevY ?? card.container.y);
        card._prevX = card.container.x;
        card._prevY = card.container.y;
        const speed = Math.hypot(vx, vy);
        const maxTilt = this.holoFX.tiltMax;
        const rot = Phaser.Math.Clamp((vx / 60) * maxTilt, -maxTilt, maxTilt);
        card.container.rotation = Phaser.Math.Linear(card.container.rotation, rot, 0.2);

        // Edge glow decay
        card.edgeGlow = Math.max(0, card.edgeGlow - (delta / 1000) * 1.5);

        // Listening pulse animation (cyan glow)
        if (card.listening && card.listeningPhase !== null) {
            card.listeningPhase += delta / 1000 * this.listeningPulse.speed;
            const pulseAlpha = Phaser.Math.Linear(
                this.listeningPulse.minAlpha,
                this.listeningPulse.maxAlpha,
                0.5 + 0.5 * Math.sin(card.listeningPhase)
            );
            // Override edge glow with listening pulse
            card.edgeGlow = pulseAlpha;
        }

        // Holographic overlay (scanlines, edges, arcs)
        const o = card.overlay;
        if (!o) return;
        o.clear();
        const w = card.width, h = card.height;
        // faint inner fill
        o.fillStyle(0xFFFFFF, this.holoFX.innerAlpha);
        o.fillRoundedRect(-w/2, -h/2, w, h, 12);
        // scanlines moving
        const phase = (card.shimmerPhase = (card.shimmerPhase + (delta/1000) * this.holoFX.shimmerSpeed) % 1);
        o.lineStyle(1, this.holoFX.edgeAlt, this.holoFX.scanlineAlpha);
        const lineGap = 10;
        const offset = Math.floor(phase * lineGap);
        for (let yy = -h/2 + offset; yy < h/2; yy += lineGap) {
            o.beginPath();
            o.moveTo(-w/2 + 6, yy);
            o.lineTo(w/2 - 6, yy);
            o.strokePath();
        }
        // dynamic edge (cyan if listening, normal if not)
        const edgeColor = card.listening ? 0x00FFFF : this.holoFX.edgeColor;
        const edgeAlpha = 0.45 + 0.4 * Math.min(1, speed / 40) + 0.35 * card.edgeGlow;
        o.lineStyle(2, edgeColor, Math.min(1, edgeAlpha));
        o.strokeRoundedRect(-w/2, -h/2, w, h, 12);
        // corner arcs accents
        o.lineStyle(2, this.holoFX.edgeAlt, 0.6);
        const r = 12; const arcLen = Math.PI/6;
        o.beginPath(); o.arc(-w/2 + r, -h/2 + r, r+3, Math.PI, Math.PI + arcLen); o.strokePath();
        o.beginPath(); o.arc(w/2 - r, -h/2 + r, r+3, -arcLen, 0); o.strokePath();
        o.beginPath(); o.arc(-w/2 + r, h/2 - r, r+3, Math.PI + Math.PI/2 - arcLen, Math.PI + Math.PI/2); o.strokePath();
        o.beginPath(); o.arc(w/2 - r, h/2 - r, r+3, Math.PI + 2*Math.PI - arcLen, 2*Math.PI); o.strokePath();

        // Trails (world-space) when moving/dragging
        if (card.isGrabbed && card.motionHistory && card.motionHistory.length > 1) {
            const tg = this.trailGraphics;
            for (let i = 1; i < card.motionHistory.length; i++) {
                const a = card.motionHistory[i-1];
                const b = card.motionHistory[i];
                const age = (performance.now() - a.t) / this.holoFX.trailLengthMs;
                const alpha = Phaser.Math.Clamp(1 - age, 0, 1) * this.holoFX.trailAlpha;
                tg.lineStyle(this.holoFX.trailWidth * alpha, this.holoFX.trailColor, alpha);
                tg.beginPath();
                tg.moveTo(a.x, a.y);
                tg.lineTo(b.x, b.y);
                tg.strokePath();
            }
        }
    }

    startSpeechForCard(card) {
        if (card.listening) return;
        if (!speechInput.isSupported()) {
            this.debugText.setText('Speech not supported');
            return;
        }
        card.listening = true;
        const originalText = card.text.text || '';
        
        speechInput.startListening({
            onInterim: (interim) => {
                card.text.setText((originalText ? originalText + '\n' : '') + interim);
            },
            onFinal: (finalText) => {
                const current = card.text.text || '';
                const nl = current.endsWith('\n') ? '' : '\n';
                card.text.setText(current + nl + finalText);
            },
            onError: (e) => {
                this.debugText.setText('Speech error');
                card.listening = false;
            }
        });
        
        // Add listening indicator to card (similar to box pulse)
        card.listeningPhase = 0;
    }

    stopSpeechForCard(card) {
        speechInput.stopListening();
        card.listening = false;
        card.listeningPhase = null;
    }

    addSpawnButton() {
        const padding = 10; 
        const w = 140; 
        const h = 44;
        const x = padding + w/2; 
        const y = 60; // under title
        
        // Create button with larger hit area
        const btn = this.add.rectangle(x, y, w, h, 0x0d2230, 0.8)
            .setStrokeStyle(2, this.palette.neon, 0.8)
            .setDepth(1001);
        
        btn.setInteractive({ useHandCursor: true });
        
        btn.on('pointerover', () => {
            btn.setFillStyle(0x1a4a5a, 0.9);
            btn.setStrokeStyle(2, this.palette.neon, 1.0);
        });
        
        btn.on('pointerout', () => {
            btn.setFillStyle(0x0d2230, 0.8);
            btn.setStrokeStyle(2, this.palette.neon, 0.8);
        });
        
        btn.on('pointerdown', () => {
            this.debugText.setText('Adding new card...');
            // Spawn a new holographic card
            const card = this.createCard(500, 400, 400, 300, "Speak to write…");
            // Auto-start speech capture
            this.startSpeechForCard(card);
            this.debugText.setText('Card created - speak now!');
        });
        
        // Add text label
        this.add.text(x, y, 'Add', {
            fontSize: '13px',
            fontStyle: 'bold',
            color: this.palette.textPrimary,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }).setOrigin(0.5).setDepth(1002);
    }

    startSpeechForBlock(block) {
        if (block.listening) return;
        if (!speechInput.isSupported()) {
            this.debugText.setText('Speech not supported');
            return;
        }
        block.listening = true;
        const originalText = block.text.text || '';
        speechInput.startListening({
            onInterim: (interim) => {
                block.text.setText((originalText ? originalText + '\n' : '') + interim);
            },
            onFinal: (finalText) => {
                const current = block.text.text || '';
                const nl = current.endsWith('\n') ? '' : '\n';
                block.text.setText(current + nl + finalText);
            },
            onError: (e) => {
                this.debugText.setText('Speech error');
                block.listening = false;
            }
        });
        this.updateBlockVisuals(block.bg, block.confidence, block.isGhost, true);
    }

    stopSpeechForBlock(block) {
        speechInput.stopListening();
        block.listening = false;
        this.updateBlockVisuals(block.bg, block.confidence, block.isGhost, false);
    }
}
