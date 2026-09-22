import { describe, it, expect } from 'vitest';
import { layoutLights, rampColor, hash32, mulberry32, LAYOUT } from './layout.js';
import type { LightInput } from './layout.js';

describe('layout property tests', () => {
  it('hash32 and mulberry32 are deterministic', () => {
    const seed1 = hash32('test-seed-1');
    const seed2 = hash32('test-seed-1');
    expect(seed1).toBe(seed2);

    const rand1 = mulberry32(seed1);
    const rand2 = mulberry32(seed2);
    expect(rand1()).toBe(rand2());
  });

  it('layout is stable for identical inputs and seed', () => {
    const inputs: LightInput[] = [
      { id: '1', chapterIndex: 0, occurredAt: 1000000, significance: 3 },
      { id: '2', chapterIndex: 1, occurredAt: 2000000, significance: 5 },
    ];
    const layout1 = layoutLights(inputs, 5, 'world-1');
    const layout2 = layoutLights(inputs, 5, 'world-1');
    expect(layout1).toEqual(layout2);
  });

  it('changing seed changes layout', () => {
    const inputs: LightInput[] = [
      { id: '1', chapterIndex: 0, occurredAt: 1000000, significance: 3 },
      { id: '2', chapterIndex: 1, occurredAt: 2000000, significance: 5 },
    ];
    const layout1 = layoutLights(inputs, 5, 'world-1');
    const layout2 = layoutLights(inputs, 5, 'world-2');
    expect(layout1).not.toEqual(layout2);
  });

  it('enforces minSeparation between lights', () => {
    // Generate many lights close together in time to force clustering
    const inputs: LightInput[] = Array.from({ length: 50 }).map((_, i) => ({
      id: `m-${i}`,
      chapterIndex: 0,
      occurredAt: 1000000 + i * 1000, // Very small gap
      significance: 1,
    }));

    const layout = layoutLights(inputs, 1, 'dense-world');

    for (let i = 0; i < layout.length; i++) {
      for (let j = i + 1; j < layout.length; j++) {
        const p1 = layout[i]!;
        const p2 = layout[j]!;
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
        // JS math float precision can be slightly under 0.9 depending on iterations
        expect(dist).toBeGreaterThanOrEqual(LAYOUT.minSeparation - 0.001);
      }
    }
  });

  it('rampColor returns correct RGB arrays', () => {
    expect(rampColor(0)).toEqual([227, 154, 85]);
    expect(rampColor(0.5)).toEqual([240, 211, 166]);
    expect(rampColor(1)).toEqual([247, 242, 232]);

    // Clamps
    expect(rampColor(-1)).toEqual([227, 154, 85]);
    expect(rampColor(2)).toEqual([247, 242, 232]);

    // Interpolates
    const mid = rampColor(0.25);
    expect(mid[0]).toBeGreaterThan(227);
    expect(mid[0]).toBeLessThan(240);
  });
});
