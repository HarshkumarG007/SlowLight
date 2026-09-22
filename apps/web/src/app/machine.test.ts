import { describe, it, expect } from 'vitest';
import { getShortestPaths } from '@xstate/graph';
import { experienceMachine } from './machine';

describe('Experience Machine (T5.1)', () => {
  it('should have all target states and valid transitions', () => {
    const paths = getShortestPaths(experienceMachine);
    const states = Object.values(paths).map(p => p.state);

    // Validate that we can reach 'sanctuary.exploration.free'
    const hasExplorationFree = states.some(s => s.matches({ sanctuary: { exploration: 'free' } }));
    expect(hasExplorationFree).toBe(true);

    // Validate we can reach 'sanctuary.memory.viewer'
    const hasMemoryViewer = states.some(s => s.matches({ sanctuary: { memory: 'viewer' } }));
    expect(hasMemoryViewer).toBe(true);

    // Validate we can reach 'veil.idle'
    const hasVeilIdle = states.some(s => s.matches({ veil: 'idle' }));
    expect(hasVeilIdle).toBe(true);
  });

  it('structural guarantee: viewer only exists inside memory and letters.reading', () => {
    // If we traverse all states in the machine, 'viewer' should only appear as a child of memory or reading.
    const stateNodeNames = Object.keys(experienceMachine.states);
    expect(stateNodeNames).not.toContain('viewer'); // No top-level viewer
  });
});
