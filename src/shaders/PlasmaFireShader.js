/**
 * Plasma Fire Shader - converted from compact GLSL
 * Original: 195 chars of GLSL creating fire/plasma effect
 *
 * This shader creates an animated fire/plasma effect using:
 * - Distance-based time modulation
 * - Iterative sine/cosine accumulation
 * - Exponential color mapping with tanh
 */

export const plasmaFireVertexShader = `
precision mediump float;

attribute vec2 aPosition;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;
varying vec2 vPosition;

void main() {
    vTexCoord = aTexCoord;
    vPosition = aPosition;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const plasmaFireFragmentShader = `
precision mediump float;

uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uVideoTexture;
uniform vec2 uFaceMaskTexCoords[468]; // MediaPipe face mesh has 468 landmarks
uniform int uFaceMaskPointCount;

varying vec2 vTexCoord;
varying vec2 vPosition;

void main() {
    vec2 r = uResolution;
    vec2 FC = gl_FragCoord.xy;

    // Normalized coordinates (matching original shader)
    vec2 p = (FC.xy * 2.0 - r) / r.y;

    // Distance from center
    float dist = dot(p, p);

    // Time modulation based on distance
    float t = uTime + abs(7.0 - dist);

    // Initial velocity/position
    vec2 l = vec2(0.0); // Used in the original but appears to be 0
    vec2 v = p * (1.0 - t) / 2.0;

    // Accumulated color output
    vec4 o = vec4(0.0);

    // Iterative plasma generation
    for(float i = 1.0; i < 8.0; i += 1.0) {
        // Add sinusoidal variation
        vec4 sinVal = sin(v.xyyy + vec4(0.0, 0.0, 0.0, 0.0)) + 1.0;
        float variation = abs(v.x - v.y);
        o += sinVal * pow(variation, 0.2);

        // Update velocity
        v += cos(v.yx * i + vec2(o.r, l.x) + t) / i + 0.7;
    }

    // Final color computation with exponential mapping
    vec4 expTerm = exp(p.y * vec4(1.0, -1.0, -2.0, 0.0)) * exp(-4.0 * l.x);
    o = tanh(expTerm / o);

    // Apply alpha for blending
    o.a = 1.0;

    gl_FragColor = o;
}
`;

export const plasmaFireShaderConfig = {
    vertex: plasmaFireVertexShader,
    fragment: plasmaFireFragmentShader,
    uniforms: {
        uResolution: { type: '2f', value: [1280, 720] },
        uTime: { type: '1f', value: 0.0 },
        uVideoTexture: { type: 'sampler2D', value: null },
        uFaceMaskTexCoords: { type: '2fv', value: [] },
        uFaceMaskPointCount: { type: '1i', value: 0 }
    }
};
