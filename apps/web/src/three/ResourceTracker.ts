import { BufferGeometry, Material, Texture, WebGLRenderTarget } from 'three';

/**
 * ResourceTracker — deterministic memory management for Three.js.
 * All GPU resources MUST be registered here to avoid leaks.
 */
export class ResourceTracker {
  private resources = new Set<BufferGeometry | Material | Texture | WebGLRenderTarget>();

  /** Register a resource to be disposed later */
  track<T extends BufferGeometry | Material | Texture | WebGLRenderTarget>(resource: T): T {
    this.resources.add(resource);
    return resource;
  }

  /**
   * Release all tracked resources.
   * Walks materials to release attached textures if they are also tracked.
   */
  dispose() {
    for (const resource of this.resources) {
      if (resource instanceof Material) {
        // We only dispose textures if they were individually tracked.
        // The material itself has its dispose() called.
        // We do NOT recursively dispose uniforms here because we enforce tracking textures explicitly.
        resource.dispose();
      } else {
        resource.dispose();
      }
    }
    this.resources.clear();
  }

  /** Number of currently tracked resources */
  trackedCount(): number {
    return this.resources.size;
  }
}
