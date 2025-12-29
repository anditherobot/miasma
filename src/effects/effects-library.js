/**
 * Effects Library - Central registration of all available effects
 *
 * Import this in main.js to populate the effect manager
 * To add new effects, import them here and call registerEffect()
 */

import { effectManager } from '../core/EffectManager.js';
import { PlasmaFireEffect } from './PlasmaFireEffect.js';

// Import additional effects here as they're created
// import { GlitchEffect } from './GlitchEffect.js';
// import { PixelateEffect } from './PixelateEffect.js';
// import { ParticleEffect } from './ParticleEffect.js';

/**
 * Initialize and register all built-in effects
 */
export function initializeEffects() {
    console.log('Initializing effects library...');

    // Effect #1: Plasma Fire (existing effect from FaceShaderScene)
    const plasmaFire = new PlasmaFireEffect();
    effectManager.registerEffect(plasmaFire);

    // Add more effects here in the future:
    // const glitch = new GlitchEffect();
    // effectManager.registerEffect(glitch);
    //
    // const pixelate = new PixelateEffect();
    // effectManager.registerEffect(pixelate);

    const registered = effectManager.getAllEffects();
    console.log(`Effects library initialized: ${registered.length} effect(s) registered`);
    registered.forEach((effect, i) => {
        console.log(`  ${i + 1}. ${effect.name} (${effect.id}) - target: ${effect.target}`);
    });
}
