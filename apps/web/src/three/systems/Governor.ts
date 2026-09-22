import { bus, QualityTier } from '../bus.js';

const TIER_ORDER: QualityTier[] = ['ultra', 'high', 'medium', 'low', 'flat'];

/**
 * Governor — Runtime performance watcher.
 * Steps down quality if p75 frame time exceeds target for 2 consecutive windows.
 */
export class Governor {
  private currentTier: QualityTier;
  private targetFps: number;
  private targetMs: number;

  private frameTimes: number[] = [];
  private windowTime = 0;
  
  private violations = 0;
  private timeSinceStable = 0;
  private stepUpsAllowed = 1;

  constructor(initialTier: QualityTier) {
    this.currentTier = initialTier;
    this.targetFps = this.getFpsTarget(initialTier);
    this.targetMs = 1000 / this.targetFps;
  }

  private getFpsTarget(tier: QualityTier) {
    if (tier === 'ultra' || tier === 'high') return 60;
    if (tier === 'medium') return 45;
    return 30; // low
  }

  updateFrame(dtMs: number) {
    if (this.currentTier === 'flat' || this.currentTier === 'reduced') return;

    this.frameTimes.push(dtMs);
    this.windowTime += dtMs;
    this.timeSinceStable += dtMs;

    // 2-second sampling windows
    if (this.windowTime >= 2000) {
      this.evaluateWindow();
      this.frameTimes = [];
      this.windowTime = 0;
    }
  }

  private evaluateWindow() {
    if (this.frameTimes.length < 10) return; // Not enough samples

    // Sort to find p75
    this.frameTimes.sort((a, b) => a - b);
    const p75 = this.frameTimes[Math.floor(this.frameTimes.length * 0.75)]!;

    // Step down logic
    if (p75 > this.targetMs * 1.25) {
      this.violations++;
      this.timeSinceStable = 0;
      
      if (this.violations >= 2) {
        this.stepDown();
        this.violations = 0; // reset after step down
      }
    } else {
      this.violations = 0;

      // Step up logic: 20s stable, and haven't used up our 1 step-up
      if (this.timeSinceStable > 20000 && this.stepUpsAllowed > 0 && p75 < this.targetMs * 0.75) {
        this.stepUp();
        this.timeSinceStable = 0;
        this.stepUpsAllowed--; // Only one step up per session
      }
    }

    bus.emitEvent({
      type: 'frameStats',
      drawCalls: 0, // Engine will fill this in
      triangles: 0,
      memoryBytes: 0,
      p95Ms: this.frameTimes[Math.floor(this.frameTimes.length * 0.95)] || p75,
    });
  }

  private stepDown() {
    const idx = TIER_ORDER.indexOf(this.currentTier);
    if (idx < TIER_ORDER.length - 2) { // don't auto-step into flat
      this.changeTier(TIER_ORDER[idx + 1]!);
    }
  }

  private stepUp() {
    const idx = TIER_ORDER.indexOf(this.currentTier);
    if (idx > 0) {
      this.changeTier(TIER_ORDER[idx - 1]!);
    }
  }

  private changeTier(newTier: QualityTier) {
    this.currentTier = newTier;
    this.targetFps = this.getFpsTarget(newTier);
    this.targetMs = 1000 / this.targetFps;
    
    // Save to local storage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sl_tier', newTier);
      } catch (e) {} // ignore quota errors
    }

    bus.emitEvent({ type: 'tierChanged', tier: newTier });
  }
}
