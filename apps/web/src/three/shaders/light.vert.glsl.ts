// light.vert.glsl
export default /* glsl */ `
attribute float aSize;
attribute float aT;
attribute float aSeed;
attribute float aState; // 0=normal, 1=hover, 2=focus

uniform float uTime;
uniform float uScale;
uniform float uReducedMotion;

varying float vT;
varying float vSeed;
varying float vState;
varying float vDist; // distance to camera for fade

void main() {
  vT = aT;
  vSeed = aSeed;
  vState = aState;

  // Twinkle logic
  float twinkle = 1.0;
  if (uReducedMotion < 0.5) {
    twinkle = 1.0 + 0.04 * sin(uTime * 2.0 + aSeed * 6.28);
  }

  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  
  vDist = -mvPosition.z;

  // Size attenuation
  float size = aSize * uScale * twinkle;
  // Falloff based on distance
  float attenuation = 10.0 / vDist;
  
  gl_Position = projectionMatrix * mvPosition;
  
  // Billboarding
  // size is applied to the quad in JS (we scale the instanced matrix), but here we could also scale position.
  // Actually, instanced geometry already has scale.
}
`;
