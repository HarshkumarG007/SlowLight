import { PerspectiveCamera } from 'three';
import { bus } from '../bus.js';

/**
 * RailCamera — controls the main viewpoint moving along the Z axis (the Rail).
 * Implements a critically damped spring for smooth following.
 */
export class RailCamera {
  public camera: PerspectiveCamera;
  
  // Spring target
  public targetZ = 0;
  public targetYaw = 0;
  public targetPitch = 0;
  
  // Current state
  private currentZ = 0;
  private currentYaw = 0;
  private currentPitch = 0;

  // Velocity (for damping)
  private vZ = 0;
  private vYaw = 0;
  private vPitch = 0;

  private dampingSeconds = 0.3; // Spec usually says critically damped spring
  private breathTime = 0;

  // Track max Z based on frontier
  private frontierZ = 0;

  constructor(aspectRatio: number) {
    this.camera = new PerspectiveCamera(70, aspectRatio, 0.1, 400);
    this.updateFOV(aspectRatio);
  }

  updateFOV(aspect: number) {
    // 70 deg horizontal FOV targeting:
    // vfov = 2 * atan(tan(hfov/2)/aspect)
    const hfovRad = (70 * Math.PI) / 180;
    const vfovRad = 2 * Math.atan(Math.tan(hfovRad / 2) / aspect);
    const vfovDeg = (vfovRad * 180) / Math.PI;
    // Clamp 50 - 75
    this.camera.fov = Math.max(50, Math.min(75, vfovDeg));
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setFrontier(z: number) {
    this.frontierZ = z;
  }

  // Input from React/bus
  moveTargetZ(delta: number) {
    this.targetZ += delta;
    // Don't let them travel past the oldest memory (+z) or way past frontier (-z)
    this.targetZ = Math.min(0, Math.max(this.targetZ, this.frontierZ - 40));
  }

  // Critical damping helper
  private damp(current: number, target: number, velocity: number, dt: number) {
    const omega = 2.0 / this.dampingSeconds;
    const x = current - target;
    const exp = Math.exp(-omega * dt);
    const c2 = velocity + omega * x;
    const newCurrent = target + (x + c2 * dt) * exp;
    const newVelocity = (velocity - c2 * omega * dt) * exp;
    return { current: newCurrent, velocity: newVelocity };
  }

  updateFrame(dt: number) {
    // Spring physics
    if (dt > 0) {
      const zRes = this.damp(this.currentZ, this.targetZ, this.vZ, dt);
      this.currentZ = zRes.current;
      this.vZ = zRes.velocity;

      const yawRes = this.damp(this.currentYaw, this.targetYaw, this.vYaw, dt);
      this.currentYaw = yawRes.current;
      this.vYaw = yawRes.velocity;

      const pitchRes = this.damp(this.currentPitch, this.targetPitch, this.vPitch, dt);
      this.currentPitch = pitchRes.current;
      this.vPitch = pitchRes.velocity;
    }

    // Breath ±0.03 units, 7s cycle
    this.breathTime += dt;
    const breathOffset = Math.sin((this.breathTime * 2 * Math.PI) / 7.0) * 0.03;

    // Apply to camera
    this.camera.position.set(0, breathOffset, this.currentZ);
    
    // Convert yaw/pitch to rotation (order YXZ)
    this.camera.rotation.set(this.currentPitch, this.currentYaw, 0, 'YXZ');

    // Notify React of general position for scrubbers
    // u goes from 0 (oldest, z=0) to 1 (frontier, z=frontierZ)
    if (this.frontierZ !== 0) {
      const u = Math.max(0, Math.min(1, this.currentZ / this.frontierZ));
      bus.emitEvent({ type: 'railPosition', u });
    }
  }
}
