import {
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
} from 'three';
import { ResourceTracker } from '../ResourceTracker.js';

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aDepth; // 0, 1, or 2 for shells

  uniform float uDpr;

  varying float vAlpha;

  void main() {
    // Parallax logic: slightly scale positions based on depth shell to simulate parallax when camera moves
    // Simple approach: position is world position, depth just controls alpha and point size
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size: 1-2.2px * DPR
    gl_PointSize = aSize * uDpr;

    // Alpha based on depth shell
    vAlpha = mix(0.15, 0.6, aDepth / 2.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    // Round star
    vec2 c = gl_PointCoord - 0.5;
    if (length(c) > 0.5) discard;

    gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha);
  }
`;

export class FieldStars {
  public mesh: Points;
  private material: ShaderMaterial;

  constructor(tracker: ResourceTracker, count: number, dpr: number) {
    const geometry = tracker.track(new BufferGeometry());
    
    const positions = new Float32Array(count * 3);
    const aSize = new Float32Array(count);
    const aDepth = new Float32Array(count);

    // Distribute stars in a wide cylinder along the Rail (Z axis)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 80;
      const z = 20 - Math.random() * 400; // Rail spans negative Z

      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.sin(theta) * r;
      positions[i * 3 + 2] = z;

      aSize[i] = 1.0 + Math.random() * 1.2;
      aDepth[i] = Math.floor(Math.random() * 3);
    }

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new Float32BufferAttribute(aSize, 1));
    geometry.setAttribute('aDepth', new Float32BufferAttribute(aDepth, 1));

    this.material = tracker.track(
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uDpr: { value: dpr },
        },
        transparent: true,
        depthWrite: false,
      })
    );

    this.mesh = new Points(geometry, this.material);
    // prevent frustum culling since they surround the whole rail
    this.mesh.frustumCulled = false; 
  }

  setDpr(dpr: number) {
    this.material.uniforms.uDpr!.value = dpr;
  }
}
