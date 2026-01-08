/**
 * GestureDisplay.js - Real-time gesture visualization and code path display
 * Shows current gesture state, hand positions, and relevant code paths
 */

import { handTrackingInstance } from '../core/HandTracking.js';

export class GestureDisplay {
    constructor(scene) {
        this.scene = scene;
        this.container = document.createElement('div');
        this.setupStyles();
        document.body.appendChild(this.container);
        
        // Gesture state tracking
        this.currentGestureState = {
            gesture: 'IDLE',
            confidence: 0,
            handIndex: null,
            details: {},
            codePath: ''
        };
        
        this.gestureThresholds = {
            pinchThreshold: 0.05,
            palmOpenThreshold: 0.1,
            palmVelocityThreshold: -15
        };
        
        // Historical gesture data
        this.gestureHistory = [];
        this.lastWristPositions = {};
    }
    
    setupStyles() {
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '10px',
            left: '10px',
            width: '420px',
            maxHeight: '500px',
            backgroundColor: 'rgba(5, 20, 30, 0.95)',
            color: '#00ff88',
            fontFamily: 'monospace',
            padding: '15px',
            borderRadius: '8px',
            pointerEvents: 'auto',
            zIndex: '1001',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            border: '2px solid #00ff88',
            boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
            fontSize: '12px',
            lineHeight: '1.4',
            overflowY: 'auto',
            maxHeight: '600px'
        });
    }
    
    update(time) {
        const landmarks = handTrackingInstance.getLandmarks();
        
        if (!landmarks || landmarks.length === 0) {
            this.currentGestureState = {
                gesture: 'NO_SIGNAL',
                confidence: 0,
                handIndex: null,
                details: {},
                codePath: 'HandTracking.js:85 (getLandmarks) → No hands detected'
            };
        } else {
            landmarks.forEach((hand, index) => {
                this.analyzeHand(hand, index, time);
            });
        }
        
        this.render();
    }
    
    analyzeHand(hand, handIndex, time) {
        const thumb = hand[4];
        const index = hand[8];
        const wrist = hand[0];
        const fingertips = [8, 12, 16, 20].map(i => hand[i]);
        
        // Calculate metrics
        const pinchDistance = Math.sqrt(
            Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2)
        );
        
        const isPalmOpen = fingertips.every(f => f.y < wrist.y - this.gestureThresholds.palmOpenThreshold);
        const isPinching = pinchDistance < this.gestureThresholds.pinchThreshold;
        
        // Velocity calculation
        const currentWristY = wrist.y * 600;
        let velocityY = 0;
        let isDismissing = false;
        
        if (this.lastWristPositions[handIndex]) {
            velocityY = currentWristY - this.lastWristPositions[handIndex];
            isDismissing = isPalmOpen && velocityY < this.gestureThresholds.palmVelocityThreshold;
        }
        this.lastWristPositions[handIndex] = currentWristY;
        
        // Determine gesture
        let gesture = 'UNKNOWN';
        let codePath = '';
        let confidence = 0;
        let details = {};
        
        if (isDismissing) {
            gesture = 'DISMISS';
            confidence = 1.0;
            codePath = 'SoftCanvasScene.js:461-478\ncheckDismissGesture()';
            details = {
                'Palm Open': 'YES',
                'Velocity Y': velocityY.toFixed(1),
                'Threshold': this.gestureThresholds.palmVelocityThreshold,
                'Action': 'Dismiss all ghost blocks'
            };
        } else if (isPinching) {
            gesture = 'PINCH';
            confidence = 1.0 - (pinchDistance / this.gestureThresholds.pinchThreshold);
            codePath = 'SoftCanvasScene.js:520-600\nprocessHand() → isPinching';
            details = {
                'Thumb-Index Dist': pinchDistance.toFixed(3),
                'Threshold': this.gestureThresholds.pinchThreshold,
                'Hold Duration': `${(time % 2000).toFixed(0)}ms`,
                'Action': 'Grab blocks / Speech hold'
            };
        } else if (isPalmOpen) {
            gesture = 'PALM_OPEN';
            confidence = 0.8;
            codePath = 'SoftCanvasScene.js:464-465\nisPalmOpen check';
            details = {
                'All fingertips above wrist': 'YES',
                'Velocity Y': velocityY.toFixed(1),
                'State': 'Ready for dismiss if moving up'
            };
        } else {
            gesture = 'NEUTRAL';
            confidence = 0.5;
            codePath = 'HandGestures.js:60-85\nNo specific gesture detected';
            details = {
                'State': 'Hand tracking active',
                'Pinch Distance': pinchDistance.toFixed(3),
                'Palm Status': 'Closed/Neutral'
            };
        }
        
        // Update state
        this.currentGestureState = {
            gesture,
            confidence,
            handIndex,
            details,
            codePath,
            metrics: {
                pinchDistance,
                isPalmOpen,
                isPinching,
                velocityY,
                isDismissing
            }
        };
        
        // Add to history
        this.addToHistory(gesture, confidence, time);
    }
    
    addToHistory(gesture, confidence, time) {
        this.gestureHistory.push({
            gesture,
            confidence,
            time,
            timestamp: new Date().toLocaleTimeString()
        });
        
        // Keep only last 10 entries
        if (this.gestureHistory.length > 10) {
            this.gestureHistory.shift();
        }
    }
    
    render() {
        const state = this.currentGestureState;
        let html = '';
        
        // Title
        html += '<div style="border-bottom: 1px solid #00ff88; padding-bottom: 8px; margin-bottom: 8px;">';
        html += '<strong>⚡ GESTURE TRACKING ⚡</strong>';
        html += '</div>';
        
        // Current Gesture (Big)
        html += '<div style="background: rgba(0, 255, 136, 0.1); padding: 10px; border-radius: 4px; margin-bottom: 8px;">';
        html += `<div style="font-size: 14px; font-weight: bold; color: #00ffff;">`;
        html += `${this.getGestureIcon(state.gesture)} ${state.gesture}`;
        html += `</div>`;
        html += `<div style="font-size: 10px; color: #00bb88;">`;
        html += `Confidence: ${(state.confidence * 100).toFixed(0)}%`;
        html += `</div>`;
        if (state.handIndex !== null) {
            html += `<div style="font-size: 10px; color: #0088ff;">Hand #${state.handIndex}</div>`;
        }
        html += '</div>';
        
        // Details
        if (Object.keys(state.details).length > 0) {
            html += '<div style="background: rgba(0, 100, 150, 0.15); padding: 8px; border-radius: 4px; margin-bottom: 8px; font-size: 10px;">';
            for (const [key, value] of Object.entries(state.details)) {
                html += `<div><span style="color: #88ff00;">${key}:</span> <span style="color: #ffffff;">${value}</span></div>`;
            }
            html += '</div>';
        }
        
        // Code Path
        html += '<div style="background: rgba(0, 50, 100, 0.2); padding: 8px; border-radius: 4px; margin-bottom: 8px; border-left: 3px solid #0088ff; font-size: 10px;">';
        html += '<div style="color: #0088ff; margin-bottom: 4px;"><strong>📍 Code Path:</strong></div>';
        html += `<div style="color: #ffffff; font-family: 'Courier New'; white-space: pre-wrap; word-wrap: break-word;">`;
        html += state.codePath.replace(/\n/g, '<br>');
        html += `</div>`;
        html += '</div>';
        
        // Gesture History
        if (this.gestureHistory.length > 0) {
            html += '<div style="border-top: 1px solid #00ff88; padding-top: 8px;">';
            html += '<div style="color: #00bb88; margin-bottom: 4px; font-size: 10px;"><strong>Recent Gestures:</strong></div>';
            html += '<div style="font-size: 9px; color: #888888;">';
            this.gestureHistory.slice().reverse().forEach((entry, i) => {
                html += `<div>${entry.timestamp} • ${entry.gesture} (${(entry.confidence * 100).toFixed(0)}%)</div>`;
            });
            html += '</div>';
            html += '</div>';
        }
        
        this.container.innerHTML = html;
    }
    
    getGestureIcon(gesture) {
        const icons = {
            'IDLE': '🔍',
            'NO_SIGNAL': '❌',
            'NEUTRAL': '✋',
            'PALM_OPEN': '🖐️',
            'PINCH': '✌️',
            'DISMISS': '🚀',
            'UNKNOWN': '❓'
        };
        return icons[gesture] || '❓';
    }
}
