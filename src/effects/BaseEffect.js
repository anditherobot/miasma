/**
 * BaseEffect - Abstract base class for all visual effects
 *
 * Effect Lifecycle:
 * 1. Constructor: Initialize effect-specific configuration
 * 2. activate(): Called when effect becomes active (create resources)
 * 3. render(): Called every frame when active
 * 4. deactivate(): Called when switching to another effect
 * 5. dispose(): Clean up resources when effect is removed
 *
 * @abstract
 */

export class BaseEffect {
    /**
     * Create a new effect
     * @param {Object} config - Effect configuration
     * @param {string} config.id - Unique identifier (e.g., 'plasma-fire')
     * @param {string} config.name - Display name (e.g., 'Plasma Fire')
     * @param {string} config.target - Target region: 'face', 'hands', 'fullscreen'
     * @param {boolean} [config.requiresFace=false] - Whether effect needs face tracking
     * @param {boolean} [config.requiresHands=false] - Whether effect needs hand tracking
     */
    constructor(config = {}) {
        this.id = config.id;
        this.name = config.name;
        this.target = config.target;
        this.isActive = false;

        // Tracking data requirements
        this.requiresFace = config.requiresFace || false;
        this.requiresHands = config.requiresHands || false;
    }

    /**
     * Called when effect is activated
     * Override this method to initialize resources (canvases, shaders, etc.)
     *
     * @param {Object} context - Rendering context { scene: PhaserScene }
     */
    activate(context) {
        this.isActive = true;
        console.log(`Effect activated: ${this.name}`);
    }

    /**
     * Render the effect
     * Must be implemented by subclass
     *
     * @param {Object} params - Rendering parameters
     * @param {number} params.time - Current time in milliseconds
     * @param {Object} params.trackingData - Tracking data from MediaPipe
     * @param {Object} params.trackingData.face - Face tracking data
     * @param {Array} params.trackingData.face.faceLandmarks - 468 face landmarks (or null)
     * @param {Object} params.trackingData.face.faceBox - Bounding box (or null)
     * @param {HTMLVideoElement} params.trackingData.face.video - Video element
     * @param {Object} params.trackingData.hands - Hand tracking data
     * @param {Array} params.trackingData.hands.left - Left hand landmarks (or null)
     * @param {Array} params.trackingData.hands.right - Right hand landmarks (or null)
     * @param {Object} params.context - Rendering context { scene: PhaserScene }
     */
    render(params) {
        throw new Error(`Effect.render() must be implemented by subclass: ${this.name}`);
    }

    /**
     * Called when effect is deactivated
     * Override this method to clean up visual elements while keeping resources
     */
    deactivate() {
        this.isActive = false;
        console.log(`Effect deactivated: ${this.name}`);
    }

    /**
     * Dispose of all resources
     * Override this method to completely clean up (remove canvases, listeners, etc.)
     */
    dispose() {
        console.log(`Effect disposed: ${this.name}`);
    }

    /**
     * Check if effect can render with current tracking data
     * @param {Object} trackingData - Tracking data from MediaPipe
     * @returns {boolean} True if effect has required data
     */
    canRender(trackingData) {
        if (this.requiresFace && !trackingData.face.faceLandmarks) {
            return false;
        }
        if (this.requiresHands && !trackingData.hands.left && !trackingData.hands.right) {
            return false;
        }
        return true;
    }
}
