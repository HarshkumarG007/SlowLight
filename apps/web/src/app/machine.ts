import { setup, fromPromise, assign } from 'xstate';
import machineJson from './experience.machine.json';

export type ExperienceMode = 'spatial-desktop' | 'spatial-mobile' | 'guided-mobile' | 'flat';
export type QualityTier = 'high' | 'medium' | 'low' | 'potato';
export type Role = 'author' | 'recipient' | null;

export interface ExperienceContext {
  mode: ExperienceMode;
  tier: QualityTier;
  reducedMotion: boolean;
  audioEnabled: boolean;
  role: Role;
  focusId: string | null;
  chapterId: string | null;
  letterId: string | null;
  returnPose: Record<string, unknown> | null;
  retry: number;
}

export type ExperienceEvent =
  | { type: 'SESSION_EXPIRED' }
  | { type: 'NETWORK_LOST' }
  | { type: 'NETWORK_RESTORED' }
  | { type: 'LOGOUT' }
  | { type: 'CONTEXT_LOST' }
  | { type: 'PRESS' }
  | { type: 'OPEN_ENROLL' }
  | { type: 'SUBMIT_PHRASE'; phrase: string }
  | { type: 'SUBMIT_CODE'; code: string }
  | { type: 'KNOCK_PASSED' }
  | { type: 'KNOCK_FAILED' }
  | { type: 'SKIP' }
  | { type: 'OPEN_LETTERS' }
  | { type: 'OPEN_ARCHIVE' }
  | { type: 'OPEN_FUTURE' }
  | { type: 'REST' }
  | { type: 'WAKE' }
  | { type: 'FOCUS_CHAPTER'; chapterId: string }
  | { type: 'LEAVE_CHAPTER' }
  | { type: 'FOCUS_MEMORY'; memoryId: string }
  | { type: 'TRAVEL'; position: number }
  | { type: 'OPEN_VIEWER' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'CLOSE' }
  | { type: 'OPEN_LETTER'; letterId: string }
  | { type: 'RAIL_END' }
  | { type: 'RETRY' };

export const experienceMachine = setup({
  types: {
    context: {} as ExperienceContext,
    events: {} as ExperienceEvent,
  },
  actions: {
    setModeFlat: assign({ mode: 'flat' }),
    storeCapabilities: assign({
      // XState v5: actor output arrives as event.output; typed as any because
      // the union of 25+ event types makes inference impractical here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tier: ({ event }: any) => event.output?.tier ?? 'high',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reducedMotion: ({ event }: any) => event.output?.reducedMotion ?? false,
    }),
    storeRole: assign({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role: ({ event }: any) => event.output?.role ?? null,
    }),
    storeWorld: assign({}), // stub
    setChapter: assign({ chapterId: ({ event }) => (event as Extract<ExperienceEvent, { type: 'FOCUS_CHAPTER' }>).chapterId }),
    clearChapter: assign({ chapterId: null }),
    setFocus: assign({ focusId: ({ event }) => (event as Extract<ExperienceEvent, { type: 'FOCUS_MEMORY' }>).memoryId }),
    saveReturnPose: assign({ returnPose: () => ({ /* mock */ }) }),
    setFocusToNext: assign({}),
    setFocusToPrev: assign({}),
    setLetter: assign({ letterId: ({ event }) => (event as Extract<ExperienceEvent, { type: 'OPEN_LETTER' }>).letterId }),

    // Side-effects — these will be wired to the command bus (bus.ts) in Phase 12.
    // Using noop functions now so state transitions are testable without side effects.
    renderVeil: () => { /* noop — wired via bus */ },
    createAudioContext: () => { /* noop */ },
    showAdjustLine: () => { /* noop */ },
    showCalmError: () => { /* noop */ },
    showKnockPrompt: () => { /* noop */ },
    verifyKnock: () => { /* noop */ },
    startArrival: () => { /* noop */ },
    startAmbientIfEnabled: () => { /* noop */ },
    drawConstellation: () => { /* noop */ },
    flyCameraToFocus: () => { /* noop */ },
    engineTravel: () => { /* noop */ },
    dimScene: () => { /* noop */ },
    undimScene: () => { /* noop */ },
    prefetchNeighbors: () => { /* noop */ },
    unfoldPanel: () => { /* noop */ },
    announceOpened: () => { /* noop */ },
    foldPanel: () => { /* noop */ },
    returnCamera: () => { /* noop */ },
    restoreFocusAnchor: () => { /* noop */ },
    openViewer: () => { /* noop */ },
    trapFocus: () => { /* noop */ },
    closeViewer: () => { /* noop */ },
    releaseFocus: () => { /* noop */ },
    revokeObjectUrls: () => { /* noop */ },
    enterLampRoom: () => { /* noop */ },
    exitLampRoom: () => { /* noop */ },
    showNotYet: () => { /* noop */ },
    railToFrontier: () => { /* noop */ },
    thinAmbience: () => { /* noop */ },
    showClosingLine: () => { /* noop */ },
    applyFinalGlow: () => { /* noop */ },
    fadeToBlack: () => { /* noop */ },
    releaseGpuAndAudio: () => { /* noop */ },
    rebuildEngine: () => { /* noop */ },
    dimHud: () => { /* noop */ },
    showConnectionDropped: () => { /* noop */ },
    clearSensitiveCaches: () => { /* noop */ },
    showRestingScreen: () => { /* noop */ },
  },
  guards: {
    sessionIsPending: () => false,
    hasSession: () => false,
    isOffline: () => !navigator.onLine,
    hasNext: () => true,
    hasPrev: () => true,
    letterUnlockedForMe: () => true,
  },
  actors: {
    probeCapabilities: fromPromise(async () => ({ tier: 'high', reducedMotion: false })),
    getSession: fromPromise(async () => ({ role: 'recipient' })),
    passkeyLogin: fromPromise(async () => ({ role: 'recipient' })),
    passkeyEnroll: fromPromise(async () => ({ role: 'recipient' })),
    loadWorldAndEngine: fromPromise(async () => ({})),
    fetchMemory: fromPromise(async () => ({})),
    fetchLetter: fromPromise(async () => ({})),
    backoffReconnect: fromPromise(async () => ({})),
    logout: fromPromise(async () => ({})),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}).createMachine(machineJson as any);
