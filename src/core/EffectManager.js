/**
 * EffectManager - Central manager for visual effects system
 *
 * Singleton pattern following handTrackingInstance / faceTrackingInstance
 * Manages effect library, active effect, and effect switching
 */

export class EffectManager {
    constructor() {
        this.effects = new Map();        // id -> Effect instance
        this.activeEffect = null;        // Currently active effect
        this.effectOrder = [];           // Array of effect IDs (for cycling)
        this.currentIndex = 0;           // Current position in effectOrder
    }

    /**
     * Register an effect in the library
     * @param {BaseEffect} effect - Effect instance to register
     */
    registerEffect(effect) {
        if (this.effects.has(effect.id)) {
            console.warn(`Effect ${effect.id} already registered. Overwriting.`);
            // Remove old effect from order array
            const oldIndex = this.effectOrder.indexOf(effect.id);
            if (oldIndex !== -1) {
                this.effectOrder.splice(oldIndex, 1);
            }
        }

        this.effects.set(effect.id, effect);
        this.effectOrder.push(effect.id);

        console.log(`Effect registered: ${effect.name} (${effect.id})`);
    }

    /**
     * Activate an effect by ID
     * @param {string} effectId - ID of effect to activate
     * @param {Object} context - Rendering context for effect
     * @returns {boolean} True if activation successful
     */
    activateEffect(effectId, context) {
        const effect = this.effects.get(effectId);

        if (!effect) {
            console.error(`Effect ${effectId} not found`);
            return false;
        }

        // Deactivate current effect
        if (this.activeEffect) {
            this.activeEffect.deactivate();
        }

        // Activate new effect
        effect.activate(context);
        this.activeEffect = effect;
        this.currentIndex = this.effectOrder.indexOf(effectId);

        console.log(`Activated effect: ${effect.name} (${this.currentIndex + 1}/${this.effectOrder.length})`);
        return true;
    }

    /**
     * Switch to next effect in library (for keyboard cycling)
     * @param {Object} context - Rendering context for effect
     */
    nextEffect(context) {
        if (this.effectOrder.length === 0) {
            console.warn('No effects registered');
            return;
        }

        this.currentIndex = (this.currentIndex + 1) % this.effectOrder.length;
        const nextId = this.effectOrder[this.currentIndex];
        this.activateEffect(nextId, context);
    }

    /**
     * Switch to previous effect in library
     * @param {Object} context - Rendering context for effect
     */
    previousEffect(context) {
        if (this.effectOrder.length === 0) {
            console.warn('No effects registered');
            return;
        }

        this.currentIndex = (this.currentIndex - 1 + this.effectOrder.length) % this.effectOrder.length;
        const prevId = this.effectOrder[this.currentIndex];
        this.activateEffect(prevId, context);
    }

    /**
     * Render active effect
     * @param {Object} params - { time, trackingData, context }
     */
    render(params) {
        if (!this.activeEffect) {
            return;
        }

        // Check if effect can render with current tracking data
        if (!this.activeEffect.canRender(params.trackingData)) {
            // Could optionally show "waiting for tracking" message
            return;
        }

        this.activeEffect.render(params);
    }

    /**
     * Get active effect info
     * @returns {Object|null} Effect info or null if no active effect
     */
    getActiveEffectInfo() {
        if (!this.activeEffect) {
            return null;
        }

        return {
            id: this.activeEffect.id,
            name: this.activeEffect.name,
            target: this.activeEffect.target,
            index: this.currentIndex,
            total: this.effectOrder.length
        };
    }

    /**
     * Get all registered effects
     * @returns {Array} Array of effect info objects
     */
    getAllEffects() {
        return this.effectOrder.map(id => {
            const effect = this.effects.get(id);
            return {
                id: effect.id,
                name: effect.name,
                target: effect.target,
                requiresFace: effect.requiresFace,
                requiresHands: effect.requiresHands
            };
        });
    }

    /**
     * Dispose all effects (cleanup)
     */
    disposeAll() {
        if (this.activeEffect) {
            this.activeEffect.deactivate();
        }

        this.effects.forEach(effect => effect.dispose());
        this.effects.clear();
        this.effectOrder = [];
        this.activeEffect = null;
        this.currentIndex = 0;

        console.log('All effects disposed');
    }
}

// Export singleton instance
export const effectManager = new EffectManager();
