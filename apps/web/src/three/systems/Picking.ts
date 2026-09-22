import { PerspectiveCamera, Vector3 } from 'three';
import type { LightPlacement } from '@slow-light/shared';
import { bus } from '../bus.js';

/**
 * Picking System — O(1) screen-space nearest neighbor hash instead of GPU picking or raycasting.
 */
export class Picking {
  private lights: LightPlacement[] = [];
  private hoveredId: string | null = null;
  private camera: PerspectiveCamera;
  
  // Coarse pointers (touch) get larger hit areas
  private isCoarse = false;

  constructor(camera: PerspectiveCamera) {
    this.camera = camera;
    
    // Listen for pointer media queries (if in browser)
    if (typeof window !== 'undefined') {
      this.isCoarse = window.matchMedia('(pointer: coarse)').matches;
    }
  }

  updateData(lights: LightPlacement[]) {
    this.lights = lights;
  }

  /**
   * Called on pointermove.
   * x, y are screen coordinates (px)
   */
  onPointerMove(x: number, y: number, width: number, height: number) {
    const id = this.findNearest(x, y, width, height);
    if (id !== this.hoveredId) {
      this.hoveredId = id;
      bus.emitEvent({ type: 'hover', id });
    }
  }

  /**
   * Called on click/tap
   */
  onClick(x: number, y: number, width: number, height: number) {
    const id = this.findNearest(x, y, width, height);
    if (id) {
      bus.emitEvent({ type: 'select', id });
    }
  }

  private findNearest(px: number, py: number, width: number, height: number): string | null {
    if (!this.lights.length) return null;

    let closestId: string | null = null;
    let minDistSq = Infinity;
    const baseHitRadius = this.isCoarse ? 44 : 24;
    const hitRadiusSq = baseHitRadius * baseHitRadius;

    const vec = new Vector3();

    for (const light of this.lights) {
      // Frustum check (z-clip) manually - only check lights in front of camera
      // The camera looks -Z, so if light.z > camera.position.z, it's behind us
      if (light.z > this.camera.position.z - 0.1) continue;
      
      // Too far away = too small to pick accurately, skip
      if (this.camera.position.z - light.z > 200) continue;

      vec.set(light.x, light.y, light.z);
      vec.project(this.camera);

      // Frustum check (xy)
      if (vec.x < -1.2 || vec.x > 1.2 || vec.y < -1.2 || vec.y > 1.2) continue;

      // Convert to px
      const screenX = (vec.x * 0.5 + 0.5) * width;
      const screenY = (-(vec.y * 0.5) + 0.5) * height;

      const dx = px - screenX;
      const dy = py - screenY;
      const distSq = dx * dx + dy * dy;

      if (distSq < hitRadiusSq && distSq < minDistSq) {
        minDistSq = distSq;
        closestId = light.id;
      }
    }

    return closestId;
  }
}
