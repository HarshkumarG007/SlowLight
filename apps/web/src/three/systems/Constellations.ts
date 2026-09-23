import {
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  LineSegments,
  ShaderMaterial,
} from 'three';
import { ResourceTracker } from '../ResourceTracker.js';

const vertexShader = /* glsl */ `
  attribute float aArc; // 0..1 along the line segment
  varying float vArc;
  void main() {
    vArc = aArc;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uProgress;
  uniform vec3 uColor;
  
  varying float vArc;
  
  void main() {
    float alpha = smoothstep(aArc - 0.05, aArc, uProgress) * 0.22;
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export class Constellations {
  public mesh: LineSegments;
  private material: ShaderMaterial;
  private maxSegments = 64 * 128; // 64 chapters x 128 segments

  constructor(tracker: ResourceTracker, colorHex: string) {
    const geometry = tracker.track(new BufferGeometry());

    const positions = new Float32Array(this.maxSegments * 6); // 2 verts per segment, 3 floats per vert
    const aArc = new Float32Array(this.maxSegments * 2); // 2 verts per segment

    const posAttr = new Float32BufferAttribute(positions, 3);
    const arcAttr = new Float32BufferAttribute(aArc, 1);
    posAttr.setUsage(DynamicDrawUsage);
    arcAttr.setUsage(DynamicDrawUsage);
    geometry.setAttribute('position', posAttr);
    geometry.setAttribute('aArc', arcAttr);

    geometry.setDrawRange(0, 0);

    this.material = tracker.track(
      new ShaderMaterial({
        vertexShader,
        // Hack: replace aArc with vArc in fragment shader string (typo in spec pseudocode)
        fragmentShader: fragmentShader.replace(/aArc/g, 'vArc'),
        uniforms: {
          uProgress: { value: 0 },
          uColor: { value: new Color(colorHex) },
        },
        transparent: true,
        depthWrite: false,
      })
    );

    this.mesh = new LineSegments(geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  // To be implemented: update logic to map chapters to geometry segments.
  // For now, this is a stub for the geometry pool.
  updateData() {
    // Stub
  }
}
