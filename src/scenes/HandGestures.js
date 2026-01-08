import Phaser from 'phaser';
import { handTrackingInstance } from '../core/HandTracking.js';
import { addNavigationButtons } from '../ui/NavigationButtons.js';
import { GestureDisplay } from '../ui/GestureDisplay.js';

export default class HandGestures extends Phaser.Scene {
    constructor() { super('HandGestures'); }

    create() {
        // Add Navigation Buttons
        addNavigationButtons(this);
        
        // Initialize Gesture Display
        this.gestureDisplay = new GestureDisplay(this);

        // --- ASSETS & STYLES ---
        this.styles = {
            jointColor: 0xffffff,
            boneColor: 0xaaffff,
            hudColor: 0xff5500, // Orange for the cube
            gridColor: 0x0044ff,
            textStyle: { fontFamily: 'monospace', fontSize: '12px', fill: '#ffffff' }
        };

        // --- SCENE SETUP ---
        // Transparent background to show video feed
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        // 1. Grid Floor (Perspective illusion)
        this.gridGraphics = this.add.graphics();
        this.drawPerspectiveGrid();

        // 2. The 3D Cube (Wireframe)
        this.cubeGraphics = this.add.graphics();
        this.cubeRotation = 0;
        this.cubeScale = 1;

        // 3. Hand Overlay Layer
        this.mechGraphics = this.add.graphics();
        
        // 4. UI / HUD Text
        this.hudText = this.add.text(50, 50, 'SYSTEM_READY', { 
            fontFamily: 'Courier New', fontSize: '16px', fill: '#00ffcc' 
        });
        
        this.palmLabel = this.add.text(0, 0, 'PALM_TRACKER', this.styles.textStyle).setAlpha(0);

        // Return instruction
        this.add.text(400, 580, '[ SPACE ] :: DISENGAGE', {
            fontSize: '12px', fill: '#444'
        }).setOrigin(0.5);

        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('Level1');
        });
    }

    update(time, delta) {
        // Update gesture display
        this.gestureDisplay.update(time);
        
        this.mechGraphics.clear();
        this.cubeGraphics.clear();
        
        // Rotate Cube Idle
        this.cubeRotation += 0.01;

        const landmarks = handTrackingInstance.getLandmarks();

        if (landmarks && landmarks.length > 0) {
            const hand = landmarks[0];
            this.drawCyberHand(hand, time);
            this.updateCubeInteraction(hand);
        } else {
            this.hudText.setText("SEARCHING_SIGNAL...");
            this.palmLabel.setAlpha(0);
            this.drawWireframeCube(600, 300, 50, this.cubeRotation, 0xff5500); // Idle state
        }
    }

    drawPerspectiveGrid() {
        this.gridGraphics.lineStyle(1, this.styles.gridColor, 0.12);
        // Horizontal lines getting closer
        for(let i=0; i<10; i++) {
            let y = 300 + (i * i * 3);
            this.gridGraphics.moveTo(0, y);
            this.gridGraphics.lineTo(800, y);
        }
        // Vertical lines fanning out
        for(let i=-5; i<=15; i++) {
            this.gridGraphics.moveTo(400, 300);
            this.gridGraphics.lineTo(i * 80, 600);
        }
    }

    drawCyberHand(hand, time) {
        const g = this.mechGraphics;
        
        // --- 1. Draw Bones (Connectors) ---
        // Wrist to fingers
        this.drawBone(hand[0], hand[1]);
        this.drawBone(hand[1], hand[2]);
        this.drawBone(hand[2], hand[3]);
        this.drawBone(hand[3], hand[4]); // Thumb

        this.drawBone(hand[0], hand[5]);
        this.drawBone(hand[5], hand[6]);
        this.drawBone(hand[6], hand[7]);
        this.drawBone(hand[7], hand[8]); // Index

        this.drawBone(hand[0], hand[17]); // Wrist to Pinky Base
        this.drawBone(hand[5], hand[9]); // Palm cross connections
        this.drawBone(hand[9], hand[13]);
        this.drawBone(hand[13], hand[17]);
        
        this.drawBone(hand[9], hand[10]);
        this.drawBone(hand[10], hand[11]);
        this.drawBone(hand[11], hand[12]); // Middle
        
        this.drawBone(hand[13], hand[14]);
        this.drawBone(hand[14], hand[15]);
        this.drawBone(hand[15], hand[16]); // Ring
        
        this.drawBone(hand[17], hand[18]);
        this.drawBone(hand[18], hand[19]);
        this.drawBone(hand[19], hand[20]); // Pinky

        // --- 2. Draw Joints (Tech Circles) ---
        hand.forEach((p, index) => {
            const x = p.x * 800;
            const y = p.y * 600;
            
            // Fingertips get rotating gears
            if ([4, 8, 12, 16, 20].includes(index)) {
                this.drawTechGear(x, y, 12, time / 1000, 0xffffff);
            } else {
                // Normal joints get small tech nodes
                g.lineStyle(1, this.styles.jointColor, 0.8);
                g.strokeCircle(x, y, 4);
                g.fillCircle(x, y, 1);
            }
        });

        // --- 3. Palm Center Tech ---
        const wrist = hand[0];
        const middleBase = hand[9];
        const centerX = (wrist.x + middleBase.x) / 2 * 800;
        const centerY = (wrist.y + middleBase.y) / 2 * 600;

        // Big rotating ring at palm
        this.drawTechGear(centerX, centerY, 30, -time / 500, 0x00ffcc);
        
        // Update Palm Label
        this.palmLabel.setPosition(centerX + 40, centerY);
        this.palmLabel.setText(`PALM_BASE :: ${Math.floor(centerY)}\nROT :: ${Math.floor(this.cubeRotation * 57)}`);
        this.palmLabel.setAlpha(1);
    }

    drawBone(p1, p2) {
        const g = this.mechGraphics;
        g.lineStyle(1, this.styles.boneColor, 0.5);
        g.moveTo(p1.x * 800, p1.y * 600);
        g.lineTo(p2.x * 800, p2.y * 600);
        
        // Add a "second wire" for mech look if distance is long enough
        // (Simplified for performance, just single clean lines looks good too)
    }

    drawTechGear(x, y, radius, rotation, color) {
        const g = this.mechGraphics;
        g.lineStyle(2, color, 1);
        
        // Outer interrupted circle
        const segments = 4;
        const arcLen = (Math.PI * 2) / segments;
        const gap = 0.2;
        
        for(let i=0; i<segments; i++) {
            const start = rotation + (i * arcLen) + gap;
            const end = rotation + ((i+1) * arcLen) - gap;
            g.beginPath();
            g.arc(x, y, radius, start, end);
            g.strokePath();
        }

        // Inner detail
        g.lineStyle(1, color, 0.5);
        g.strokeCircle(x, y, radius * 0.5);
        
        // Crosshair
        const r2 = radius * 0.3;
        g.beginPath();
        g.moveTo(x - r2, y);
        g.lineTo(x + r2, y);
        g.moveTo(x, y - r2);
        g.lineTo(x, y + r2);
        g.strokePath();
    }

    updateCubeInteraction(hand) {
        // Calculate palm base position
        const wrist = hand[0];
        const middle = hand[9];
        const palmX = (wrist.x + middle.x) / 2 * 800;
        const palmY = (wrist.y + middle.y) / 2 * 600;

        // Calculate Rotation from hand tilt
        let angleRad = Phaser.Math.Angle.Between(
            wrist.x * 800, wrist.y * 600,
            middle.x * 800, middle.y * 600
        );
        let dialAngle = -(angleRad + (Math.PI / 2));

        const scaleFactor = 1 + (dialAngle * 2.0);
        const targetScale = Phaser.Math.Clamp(scaleFactor * 50, 20, 150);

        // Smooth lerp
        this.cubeScale += (targetScale - this.cubeScale) * 0.1;

        this.hudText.setText(`
> TRACKING_ACTIVE
> TARGET_LOCK: [${Math.floor(this.cubeScale)}]
> ANGLE: ${dialAngle.toFixed(2)} rad
        `);

        // Position cube relative to palm base (offset below and to the left)
        const cubeX = palmX - 100;
        const cubeY = palmY + 80;

        // Draw heightmap grid at palm base
        this.drawHeightmapGrid(cubeX, cubeY + 40, this.cubeScale);

        // Draw the 3D Cube above the heightmap
        this.drawWireframeCube(cubeX, cubeY, this.cubeScale, this.cubeRotation, this.styles.hudColor);
    }

    drawWireframeCube(cx, cy, size, rotX, color) {
        const g = this.cubeGraphics;
        g.lineStyle(2, color, 1);

        // Simple 3D projection
        const points = [];
        const r = size;
        
        // 8 corners of a cube
        // We'll rotate around Y axis (horizontal spin)
        for (let z = -1; z <= 1; z += 2) {
            for (let y = -1; y <= 1; y += 2) {
                for (let x = -1; x <= 1; x += 2) {
                    // Rotate X/Z
                    const px = x * Math.cos(rotX) - z * Math.sin(rotX);
                    const pz = x * Math.sin(rotX) + z * Math.cos(rotX);
                    
                    // Project (Fake perspective: scale based on Z)
                    const depth = 4; // camera depth
                    const scale = depth / (depth - pz);
                    
                    points.push({
                        x: cx + px * r * scale,
                        y: cy + y * r * scale
                    });
                }
            }
        }

        // Draw edges connecting corners
        // 0-1, 2-3, 0-2, 1-3 (Front/Back faces constructed differently in loop, manual mapping is safer)
        
        // It's easier to just hardcode lines for a cube than generic mesh for this snippet
        // Vertices:
        // 0: -1,-1,-1  | 1:  1,-1,-1
        // 2: -1, 1,-1  | 3:  1, 1,-1
        // 4: -1,-1, 1  | 5:  1,-1, 1
        // 6: -1, 1, 1  | 7:  1, 1, 1
        
        const project = (x, y, z) => {
             const px = x * Math.cos(rotX) - z * Math.sin(rotX);
             const pz = x * Math.sin(rotX) + z * Math.cos(rotX);
             // Tilt slightly for 3D look
             const py = y; 
             
             const scale = 300 / (300 + pz * r); // Perspective division
             return { x: cx + px * r * scale, y: cy + py * r * scale };
        }

        const v = [];
        for(let z of [-1, 1])
            for(let y of [-1, 1])
                for(let x of [-1, 1]) v.push(project(x,y,z));
        
        // Connections
        const edges = [
            [0,1], [1,3], [3,2], [2,0], // Front face (relative)
            [4,5], [5,7], [7,6], [6,4], // Back face
            [0,4], [1,5], [2,6], [3,7]  // Connecting pillars
        ];

        edges.forEach(e => {
            g.beginPath();
            g.moveTo(v[e[0]].x, v[e[0]].y);
            g.lineTo(v[e[1]].x, v[e[1]].y);
            g.strokePath();
        });
    }

    drawHeightmapGrid(cx, cy, size) {
        const g = this.cubeGraphics;
        g.lineStyle(1, this.styles.gridColor, 0.8);

        const gridSize = size * 0.8;
        const divisions = 5;
        const cellSize = gridSize / divisions;

        // Draw grid cells
        for(let i = 0; i <= divisions; i++) {
            // Horizontal lines
            const y = cy + (i * cellSize) - (gridSize / 2);
            g.beginPath();
            g.moveTo(cx - gridSize / 2, y);
            g.lineTo(cx + gridSize / 2, y);
            g.strokePath();

            // Vertical lines
            const x = cx + (i * cellSize) - (gridSize / 2);
            g.beginPath();
            g.moveTo(x, cy - gridSize / 2);
            g.lineTo(x, cy + gridSize / 2);
            g.strokePath();
        }

        // Add border highlight
        g.lineStyle(2, this.styles.gridColor, 1);
        g.strokeRect(cx - gridSize / 2, cy - gridSize / 2, gridSize, gridSize);
    }
}

