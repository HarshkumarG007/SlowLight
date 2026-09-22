import {
  InstancedMesh,
  PlaneGeometry,
  ShaderMaterial,
  Object3D,
  DynamicDrawUsage,
  InstancedBufferAttribute,
} from 'three';
import { ResourceTracker } from '../ResourceTracker.js';
import type { LightPlacement } from '@slow-light/shared';

// Doppler color ramp constants (from spec)
// 0: [0xe3, 0x9a, 0x55] -> vec3(0.890, 0.604, 0.333)
// 0.5: [0xf0, 0xd3, 0xa6] -> vec3(0.941, 0.827, 0.651)
// 1: [0xf7, 0xf2, 0xe8] -> vec3(0.969, 0.949, 0.910)

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aT;
  attribute float aSeed;
  attribute float aState; // 0=normal, 1=hover, 2=focus
  attribute float aSignificance;

  uniform float uTime;
  uniform float uReducedMotion;

  varying float vT;
  varying float vSeed;
  varying float vState;
  varying float vSignificance;
  varying vec2 vUv;
  varying float vDistFade;

  void main() {
    vUv = uv;
    vT = aT;
    vSeed = aSeed;
    vState = aState;
    vSignificance = aSignificance;

    float twinkle = 1.0;
    if (uReducedMotion < 0.5) {
      twinkle = 1.0 + 0.04 * sin(uTime * 2.0 + aSeed * 6.28318);
    }

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position * aSize * twinkle, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Distance fade: start fading out at 80 units
    vDistFade = clamp(1.0 - (-mvPosition.z - 80.0) / 40.0, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uExposure;

  varying float vT;
  varying float vSeed;
  varying float vState;
  varying float vSignificance;
  varying vec2 vUv;
  varying float vDistFade;

  vec3 getDopplerColor(float t) {
    vec3 c0 = vec3(0.890, 0.604, 0.333);
    vec3 c1 = vec3(0.941, 0.827, 0.651);
    vec3 c2 = vec3(0.969, 0.949, 0.910);
    if (t < 0.5) {
      return mix(c0, c1, t * 2.0);
    }
    return mix(c1, c2, (t - 0.5) * 2.0);
  }

  void main() {
    // Distance from center
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    if (r > 1.0) discard;

    // Core shape: pow(1 - r, 2.2) soft disc
    float alpha = pow(1.0 - r, 2.2);

    // Diffraction cross for milestones (significance >= 4)
    if (vSignificance >= 4.0) {
      float cross = max(0.0, 1.0 - abs(c.x) * 20.0) * max(0.0, 1.0 - abs(c.y) * 20.0);
      alpha = max(alpha, cross * 0.5 * pow(1.0 - r, 2.0));
    }

    // Hover/focus ring (state > 0)
    if (vState > 0.5) {
      float ring = smoothstep(0.02, 0.0, abs(r - 0.9));
      alpha = max(alpha, ring * (vState == 2.0 ? 1.0 : 0.4));
    }

    // Base color from Doppler ramp
    vec3 color = getDopplerColor(vT);

    // Alpha modulations
    float finalAlpha = alpha * uExposure * vDistFade;

    // Significance 1 stillness behavior
    if (vSignificance <= 1.0) {
      finalAlpha *= smoothstep(0.7, 1.0, uExposure);
    }

    gl_FragColor = vec4(color, finalAlpha);
  }
`;

export class LightField {
  public mesh: InstancedMesh;
  private dummy = new Object3D();
  private maxLights: number;
  private material: ShaderMaterial;
  private idToIndex = new Map<string, number>();

  constructor(tracker: ResourceTracker, maxLights = 10000) {
    this.maxLights = maxLights;

    const geometry = tracker.track(new PlaneGeometry(1, 1));
    // Billboarding: Plane geometry natively faces +Z, our camera looks -Z

    this.material = tracker.track(
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uExposure: { value: 1.0 },
          uReducedMotion: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
      })
    );

    this.mesh = new InstancedMesh(geometry, this.material, maxLights);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.count = 0; // Starts empty

    // Custom attributes
    const aSize = new Float32Array(maxLights);
    const aT = new Float32Array(maxLights);
    const aSeed = new Float32Array(maxLights);
    const aState = new Float32Array(maxLights);
    const aSignificance = new Float32Array(maxLights);

    this.mesh.geometry.setAttribute('aSize', new InstancedBufferAttribute(aSize, 1));
    this.mesh.geometry.setAttribute('aT', new InstancedBufferAttribute(aT, 1));
    this.mesh.geometry.setAttribute('aSeed', new InstancedBufferAttribute(aSeed, 1));
    this.mesh.geometry.setAttribute('aState', new InstancedBufferAttribute(aState, 1));
    this.mesh.geometry.setAttribute('aSignificance', new InstancedBufferAttribute(aSignificance, 1));
  }

  updateData(lights: LightPlacement[], inputMap: Map<string, number>) {
    const count = Math.min(lights.length, this.maxLights);
    this.mesh.count = count;
    this.idToIndex.clear();

    const aSize = this.mesh.geometry.attributes.aSize as InstancedBufferAttribute;
    const aT = this.mesh.geometry.attributes.aT as InstancedBufferAttribute;
    const aSeed = this.mesh.geometry.attributes.aSeed as InstancedBufferAttribute;
    const aState = this.mesh.geometry.attributes.aState as InstancedBufferAttribute;
    const aSignificance = this.mesh.geometry.attributes.aSignificance as InstancedBufferAttribute;

    for (let i = 0; i < count; i++) {
      const p = lights[i]!;
      const sig = inputMap.get(p.id) ?? 2;

      this.idToIndex.set(p.id, i);

      // Billboarding setup: face +Z (camera faces -Z)
      this.dummy.position.set(p.x, p.y, p.z);
      // Ensure it faces camera. Assuming camera moves along Z, planes just need to not have rotation.
      this.dummy.rotation.set(0, 0, 0); 
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      aSize.setX(i, p.size);
      aT.setX(i, p.t);
      aSeed.setX(i, Math.random());
      aState.setX(i, 0); // normal
      aSignificance.setX(i, sig);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    aSize.needsUpdate = true;
    aT.needsUpdate = true;
    aSeed.needsUpdate = true;
    aState.needsUpdate = true;
    aSignificance.needsUpdate = true;
  }

  setHover(id: string | null) {
    const aState = this.mesh.geometry.attributes.aState as InstancedBufferAttribute;
    // Reset all
    for (let i = 0; i < this.mesh.count; i++) {
      aState.setX(i, 0);
    }
    if (id && this.idToIndex.has(id)) {
      aState.setX(this.idToIndex.get(id)!, 1);
    }
    aState.needsUpdate = true;
  }

  setFocus(id: string | null) {
    const aState = this.mesh.geometry.attributes.aState as InstancedBufferAttribute;
    if (id && this.idToIndex.has(id)) {
      aState.setX(this.idToIndex.get(id)!, 2);
    }
    aState.needsUpdate = true;
  }

  updateFrame(time: number, exposure: number, reducedMotion: boolean) {
    this.material.uniforms.uTime!.value = time;
    this.material.uniforms.uExposure!.value = exposure;
    this.material.uniforms.uReducedMotion!.value = reducedMotion ? 1 : 0;
  }
}
