import type { LightInput } from '@slow-light/shared';
import type { WorldData } from './bus.js';

export function getSyntheticWorld(seed: string = 'dev-seed-1'): WorldData {
  const lights: LightInput[] = [];
  const now = Date.now();
  const YEAR = 365.25 * 24 * 3600 * 1000;
  
  // Create 200 lights over the last 10 years
  for (let i = 0; i < 200; i++) {
    const age = Math.random() * 10 * YEAR;
    let sig: 1 | 2 | 3 | 4 | 5;
    
    // Distribution of significance
    const r = Math.random();
    if (r < 0.1) sig = 1;
    else if (r < 0.7) sig = 2;
    else if (r < 0.9) sig = 3;
    else if (r < 0.98) sig = 4;
    else sig = 5;

    // Chapters
    let chapterIndex = -1;
    if (Math.random() > 0.3) {
      chapterIndex = Math.floor(Math.random() * 5);
    }

    lights.push({
      id: `synth-${i}`,
      occurredAt: now - age,
      significance: sig,
      chapterIndex,
    });
  }

  return {
    lights,
    chapterCount: 5,
    worldSeed: seed,
  };
}
