import Phaser from 'phaser';
import { handTrackingInstance } from '../core/HandTracking.js';
import { addNavigationButtons } from '../ui/NavigationButtons.js';

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
        
        // Card Visual Settings (TRANSPARENCY CONTROLS)
        this.cardTransparency = {
            background: 0.95,        // Main card background (0.0 - 1.0)
            shadow: 0.08,            // Drop shadow opacity
            border: 0.6,             // Border line opacity
            closeButton: 0.9         // Close button opacity
        };
        
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

        // Create initial VR Cards
        this.createCard(500, 300, 400, 300, "VR Card Demo\n\nThis is a stretchable card.\nGrab with one hand to move.\nGrab with both hands to stretch!");

        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('HandGestures');
        });

        this.input.keyboard.on('keydown-C', () => {
            this.createCard(500, 400, 300, 200, "New Card\n\nPress C to create more cards.");
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

    createCard(x, y, width, height, text) {
        const container = this.add.container(x, y);
        
        // Modern flat card with subtle shadow
        const bg = this.add.graphics();
        
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

        container.add([bg, handles, txt, closeBtn]);
        container.setSize(width, height);
        
        const card = {
            container: container,
            bg: bg,
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
            }
        };

        this.cards.push(card);
        return card;
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

        // 2. Periodic Ghost Spawning
        if (!this.lastGhostSpawn || time - this.lastGhostSpawn > 15000) {
            this.spawnRandomGhost();
            this.lastGhostSpawn = time;
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
                this.updateBlockVisuals(block.bg, block.confidence, block.isGhost, block.isGrabbed);
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
        
        this.debugText.setText(`CARD GRABBED [HAND_${handIndex}]`);
    }

    moveCard(card, x, y) {
        const handIndex = Array.from(card.grabbedByHands)[0];
        // Update movement targets instead of directly setting position
        card.targetX = x + card.grabOffsets[handIndex].x;
        card.targetY = y + card.grabOffsets[handIndex].y;
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
            
            this.debugText.setText('CARD CLOSED');
        }
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
