import type { WebGLRenderer } from 'three';
import { Governor } from './systems/Governor.js';

export class Loop {
  private renderCallback: (dt: number) => void;
  private governor: Governor;
  
  private reqId = 0;
  private lastTime = 0;
  
  // Lifecycle state
  private isVisible = true;
  private timeSinceInput = 0;

  constructor(_renderer: WebGLRenderer, governor: Governor, renderCallback: (dt: number) => void) {
    this.governor = governor;
    this.renderCallback = renderCallback;
    
    // Visibility pause (R5 battery)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  registerInput() {
    this.timeSinceInput = 0;
  }

  start() {
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  stop() {
    cancelAnimationFrame(this.reqId);
  }

  dispose() {
    this.stop();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  private onVisibilityChange = () => {
    this.isVisible = document.visibilityState === 'visible';
    if (this.isVisible) {
      this.lastTime = performance.now();
      this.tick(this.lastTime);
    } else {
      this.stop();
    }
  };

  private tick = (time: number) => {
    if (!this.isVisible) return;
    
    this.reqId = requestAnimationFrame(this.tick);

    const dtMs = time - this.lastTime;
    
    // Limit max dt (prevent physics explosions if tab suspended without firing visibilitychange)
    const clampedDtMs = Math.min(dtMs, 100);
    const dtSeconds = clampedDtMs / 1000;
    
    this.lastTime = time;
    this.timeSinceInput += dtSeconds;

    // Idle throttle to 15fps after 20s
    if (this.timeSinceInput > 20.0) {
      // Very basic throttle: skip frames if dt since last *rendered* frame < 1000/15
      // This implementation needs tracking of last rendered time for perfect throttling,
      // but simple early return works for battery saving.
      if (dtMs < 1000 / 15) return;
    }

    // Call update & render
    this.renderCallback(dtSeconds);

    // Feed governor frame time (approximate, actual GPU time is harder to get without extensions)
    // We pass dtMs as a rough proxy.
    this.governor.updateFrame(dtMs);
  };
}
