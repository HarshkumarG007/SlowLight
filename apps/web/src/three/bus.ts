/**
 * bus.ts — Command and Event bus isolating React from the Three.js engine.
 *
 * This enforces strict decoupling: React NEVER imports Three.js or reads scene state.
 * The Engine NEVER imports React. They communicate purely through these messages.
 */

import type { LightInput } from '@slow-light/shared';

// -- Types --

export type QualityTier = 'ultra' | 'high' | 'medium' | 'low' | 'reduced' | 'flat';

export interface WorldData {
  lights: LightInput[];
  chapterCount: number;
  worldSeed: string;
}

// Commands (React -> Engine)
export type EngineCommand =
  | { type: 'init'; canvas: HTMLCanvasElement; initialTier: QualityTier }
  | { type: 'setWorld'; data: WorldData }
  | { type: 'focusMemory'; id: string }
  | { type: 'focusChapter'; id: string }
  | { type: 'travelTo'; u: number } // 0 = oldest, 1 = Frontier
  | { type: 'setTier'; tier: QualityTier }
  | { type: 'setReducedMotion'; enabled: boolean }
  | { type: 'audioToggle'; enabled: boolean }
  | { type: 'enterLamp' }
  | { type: 'exitLamp' }
  | { type: 'rest' } // Release GPU resources, fade to black
  | { type: 'dispose' };

// Events (Engine -> React)
export type EngineEvent =
  | { type: 'ready' }
  | { type: 'tierChanged'; tier: QualityTier }
  | { type: 'hover'; id: string | null }
  | { type: 'select'; id: string }
  | { type: 'chapterEnter'; id: string }
  | { type: 'chapterLeave' }
  | { type: 'railPosition'; u: number }
  | { type: 'contextLost' }
  | { type: 'contextRestored' }
  | { type: 'frameStats'; drawCalls: number; triangles: number; memoryBytes: number; p95Ms: number };

// -- Implementation --

type CommandListener = (cmd: EngineCommand) => void;
type EventListener = (event: EngineEvent) => void;

class EngineBus {
  private commandListeners = new Set<CommandListener>();
  private eventListeners = new Set<EventListener>();

  // React calls this to send commands to the engine
  sendCommand(cmd: EngineCommand) {
    this.commandListeners.forEach((l) => l(cmd));
  }

  // Engine calls this to subscribe to React's commands
  onCommand(listener: CommandListener) {
    this.commandListeners.add(listener);
    return () => {
      this.commandListeners.delete(listener);
    };
  }

  // Engine calls this to emit events to React
  emitEvent(event: EngineEvent) {
    this.eventListeners.forEach((l) => l(event));
  }

  // React calls this to subscribe to Engine events
  onEvent(listener: EventListener) {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  clear() {
    this.commandListeners.clear();
    this.eventListeners.clear();
  }
}

// Singleton export
export const bus = new EngineBus();
