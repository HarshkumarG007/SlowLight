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
  returnPose: any | null;
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
      tier: ({ event }: any) => event.output?.tier ?? 'high',
      reducedMotion: ({ event }: any) => event.output?.reducedMotion ?? false,
    }),
    storeRole: assign({
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

    // Side-effects (mocked for now, to be implemented properly with Three.js later)
    renderVeil: () => console.log('renderVeil'),
    createAudioContext: () => console.log('createAudioContext'),
    showAdjustLine: () => console.log('showAdjustLine'),
    showCalmError: () => console.log('showCalmError'),
    showKnockPrompt: () => console.log('showKnockPrompt'),
    verifyKnock: () => console.log('verifyKnock'),
    startArrival: () => console.log('startArrival'),
    startAmbientIfEnabled: () => console.log('startAmbientIfEnabled'),
    drawConstellation: () => console.log('drawConstellation'),
    flyCameraToFocus: () => console.log('flyCameraToFocus'),
    engineTravel: () => console.log('engineTravel'),
    dimScene: () => console.log('dimScene'),
    undimScene: () => console.log('undimScene'),
    prefetchNeighbors: () => console.log('prefetchNeighbors'),
    unfoldPanel: () => console.log('unfoldPanel'),
    announceOpened: () => console.log('announceOpened'),
    foldPanel: () => console.log('foldPanel'),
    returnCamera: () => console.log('returnCamera'),
    restoreFocusAnchor: () => console.log('restoreFocusAnchor'),
    openViewer: () => console.log('openViewer'),
    trapFocus: () => console.log('trapFocus'),
    closeViewer: () => console.log('closeViewer'),
    releaseFocus: () => console.log('releaseFocus'),
    revokeObjectUrls: () => console.log('revokeObjectUrls'),
    enterLampRoom: () => console.log('enterLampRoom'),
    exitLampRoom: () => console.log('exitLampRoom'),
    showNotYet: () => console.log('showNotYet'),
    railToFrontier: () => console.log('railToFrontier'),
    thinAmbience: () => console.log('thinAmbience'),
    showClosingLine: () => console.log('showClosingLine'),
    applyFinalGlow: () => console.log('applyFinalGlow'),
    fadeToBlack: () => console.log('fadeToBlack'),
    releaseGpuAndAudio: () => console.log('releaseGpuAndAudio'),
    rebuildEngine: () => console.log('rebuildEngine'),
    dimHud: () => console.log('dimHud'),
    showConnectionDropped: () => console.log('showConnectionDropped'),
    clearSensitiveCaches: () => console.log('clearSensitiveCaches'),
    showRestingScreen: () => console.log('showRestingScreen'),
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
}).createMachine(machineJson as any);
