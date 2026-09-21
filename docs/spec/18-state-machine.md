# 18 — STATE MACHINE

The experience is one hierarchical machine (XState v5). The JSON below is the contract: implementation must provide every named `guard`, `action` and `actor`; `id` values are stable and used as targets (`#id`). State ownership across the app is in Doc 09 §9.4.

## 18.1 Design rules
1. The machine is the only source of "where she is"; the URL is derived from it (and restores it on load).
2. Global events (`SESSION_EXPIRED`, `NETWORK_LOST`, `LOGOUT`, `CONTEXT_LOST`) are handled at the root and always win.
3. Leaving any authenticated state for `veil` runs `clearSensitiveCaches` (query cache, object URLs, decoded textures, audio, dispose GPU).
4. A viewer exists only inside `memory` and `letters.reading` (structural guarantee: `memory.viewer`, `letters.reading.viewer`).
5. Every invoked actor has a failure transition; there is no state without a way out.

## 18.2 Machine (JSON)
<!-- extract: apps/web/src/app/experience.machine.json -->
```json
{
  "id": "experience",
  "initial": "boot",
  "context": { "mode": "spatial-desktop", "tier": "high", "reducedMotion": false, "audioEnabled": false, "role": null, "focusId": null, "chapterId": null, "letterId": null, "returnPose": null, "retry": 0 },
  "on": {
    "SESSION_EXPIRED": { "target": "#sessionExpired" },
    "NETWORK_LOST": { "target": "#offline" },
    "LOGOUT": { "target": "#loggingOut" },
    "CONTEXT_LOST": { "actions": ["setModeFlat"] }
  },
  "states": {
    "boot": {
      "id": "boot",
      "invoke": { "src": "probeCapabilities", "onDone": { "target": "loading", "actions": ["storeCapabilities"] }, "onError": { "target": "loading", "actions": ["setModeFlat"] } }
    },
    "loading": {
      "id": "loading",
      "invoke": {
        "src": "getSession",
        "onDone": [
          { "guard": "sessionIsPending", "target": "#knock" },
          { "guard": "hasSession", "target": "#threshold", "actions": ["storeRole"] },
          { "target": "#veil" }
        ],
        "onError": [ { "guard": "isOffline", "target": "#offline" }, { "target": "#fatal" } ]
      }
    },
    "veil": {
      "id": "veil",
      "initial": "idle",
      "entry": ["renderVeil"],
      "states": {
        "idle": { "on": { "PRESS": { "target": "adjusting", "actions": ["createAudioContext", "showAdjustLine"] }, "OPEN_ENROLL": { "target": "enrolling" } } },
        "adjusting": {
          "invoke": { "src": "passkeyLogin", "onDone": [ { "guard": "sessionIsPending", "target": "#knock" }, { "target": "#threshold", "actions": ["storeRole"] } ], "onError": { "target": "denied" } }
        },
        "denied": { "entry": ["showCalmError"], "on": { "PRESS": { "target": "adjusting" } }, "after": { "8000": { "target": "idle" } } },
        "enrolling": {
          "initial": "phrase",
          "states": {
            "phrase": { "on": { "SUBMIT_PHRASE": { "target": "registering" } } },
            "registering": { "invoke": { "src": "passkeyEnroll", "onDone": { "target": "#threshold", "actions": ["storeRole"] }, "onError": { "target": "phrase", "actions": ["showCalmError"] } } }
          }
        }
      }
    },
    "knock": {
      "id": "knock",
      "entry": ["showKnockPrompt"],
      "on": { "SUBMIT_CODE": { "target": "knock", "reenter": true, "actions": ["verifyKnock"] }, "KNOCK_PASSED": { "target": "#threshold" }, "KNOCK_FAILED": { "target": "#veil" } }
    },
    "threshold": {
      "id": "threshold",
      "initial": "loadingWorld",
      "states": {
        "loadingWorld": {
          "invoke": { "src": "loadWorldAndEngine", "onDone": { "target": "arriving", "actions": ["storeWorld"] }, "onError": [ { "guard": "isOffline", "target": "#offline" }, { "target": "#fatal" } ] }
        },
        "arriving": {
          "entry": ["startArrival", "startAmbientIfEnabled"],
          "after": { "7000": { "target": "#exploration" } },
          "on": { "SKIP": { "target": "#exploration" } }
        }
      }
    },
    "sanctuary": {
      "id": "sanctuary",
      "initial": "exploration",
      "on": { "OPEN_LETTERS": { "target": "#lettersIndex" }, "OPEN_ARCHIVE": { "target": "#archive" }, "OPEN_FUTURE": { "target": "#future" }, "REST": { "target": "#rest" } },
      "states": {
        "exploration": {
          "id": "exploration",
          "initial": "free",
          "states": {
            "free": {
              "on": { "FOCUS_CHAPTER": { "target": "chapterFocus", "actions": ["setChapter", "drawConstellation"] }, "FOCUS_MEMORY": { "target": "#memory", "actions": ["setFocus", "saveReturnPose", "flyCameraToFocus"] }, "TRAVEL": { "actions": ["engineTravel"] } }
            },
            "chapterFocus": {
              "on": { "LEAVE_CHAPTER": { "target": "free", "actions": ["clearChapter"] }, "FOCUS_MEMORY": { "target": "#memory", "actions": ["setFocus", "saveReturnPose", "flyCameraToFocus"] } }
            }
          }
        },
        "memory": {
          "id": "memory",
          "initial": "loading",
          "entry": ["dimScene", "prefetchNeighbors"],
          "exit": ["undimScene"],
          "states": {
            "loading": { "invoke": { "src": "fetchMemory", "onDone": { "target": "panel", "actions": ["unfoldPanel", "announceOpened"] }, "onError": { "target": "failed" } } },
            "panel": {
              "on": { "OPEN_VIEWER": { "target": "#viewer" }, "NEXT": { "target": "loading", "guard": "hasNext", "actions": ["setFocusToNext", "flyCameraToFocus"] }, "PREV": { "target": "loading", "guard": "hasPrev", "actions": ["setFocusToPrev", "flyCameraToFocus"] }, "CLOSE": { "target": "#exploration", "actions": ["foldPanel", "returnCamera", "restoreFocusAnchor"] } }
            },
            "viewer": {
              "id": "viewer",
              "entry": ["openViewer", "trapFocus"],
              "exit": ["closeViewer", "releaseFocus", "revokeObjectUrls"],
              "on": { "CLOSE": { "target": "panel" } }
            },
            "failed": { "on": { "RETRY": { "target": "loading" }, "CLOSE": { "target": "#exploration" } } }
          }
        },
        "letters": {
          "initial": "index",
          "entry": ["enterLampRoom"],
          "exit": ["exitLampRoom"],
          "states": {
            "index": {
              "id": "lettersIndex",
              "on": { "OPEN_LETTER": [ { "guard": "letterUnlockedForMe", "target": "reading", "actions": ["setLetter"] }, { "actions": ["showNotYet"] } ], "CLOSE": { "target": "#exploration" } }
            },
            "reading": {
              "invoke": { "src": "fetchLetter", "onError": { "target": "index", "actions": ["showNotYet"] } },
              "initial": "text",
              "states": {
                "text": { "on": { "OPEN_VIEWER": { "target": "viewer" }, "CLOSE": { "target": "#lettersIndex" } } },
                "viewer": { "id": "letterViewer", "entry": ["openViewer", "trapFocus"], "exit": ["closeViewer", "releaseFocus", "revokeObjectUrls"], "on": { "CLOSE": { "target": "text" } } }
              }
            }
          }
        },
        "archive": { "id": "archive", "on": { "OPEN_MEMORY": { "target": "#memory", "actions": ["setFocus"] }, "CLOSE": { "target": "#exploration" } } },
        "future": {
          "id": "future",
          "entry": ["railToFrontier"],
          "initial": "approaching",
          "states": {
            "approaching": { "on": { "RAIL_END": { "target": "ending" } } },
            "ending": { "entry": ["thinAmbience"], "after": { "4000": { "actions": ["showClosingLine"] }, "12000": { "actions": ["applyFinalGlow"] } } }
          },
          "on": { "CLOSE": { "target": "#exploration" } }
        },
        "rest": { "id": "rest", "entry": ["fadeToBlack", "releaseGpuAndAudio"], "on": { "WAKE": { "target": "#exploration", "actions": ["rebuildEngine"] } } }
      }
    },
    "offline": { "id": "offline", "entry": ["dimHud", "showConnectionDropped"], "invoke": { "src": "backoffReconnect" }, "on": { "NETWORK_RESTORED": { "target": "#loading" } } },
    "sessionExpired": { "id": "sessionExpired", "entry": ["clearSensitiveCaches"], "after": { "1200": { "target": "#veil" } } },
    "loggingOut": { "id": "loggingOut", "entry": ["clearSensitiveCaches"], "invoke": { "src": "logout", "onDone": { "target": "#veil" }, "onError": { "target": "#veil" } } },
    "fatal": { "id": "fatal", "entry": ["showRestingScreen"], "on": { "RETRY": { "target": "#boot" } } }
  },
  "guards": ["sessionIsPending", "hasSession", "isOffline", "hasNext", "hasPrev", "letterUnlockedForMe"],
  "actors": ["probeCapabilities", "getSession", "passkeyLogin", "passkeyEnroll", "loadWorldAndEngine", "fetchMemory", "fetchLetter", "backoffReconnect", "logout"]
}
```

## 18.3 States, guards and failure handling
| State | Purpose | Guards | Failure/exit |
|---|---|---|---|
| `boot` | Probe WebGL2, motion/contrast prefs, memory, network | — | Any error → `flat` mode, continue |
| `loading` | `GET /session` | `hasSession`, `sessionIsPending` | offline → `offline`; server fault → `fatal` |
| `veil` (+ `adjusting`, `denied`, `enrolling`) | Auth ritual | — | Calm error, retry after 8 s |
| `knock` | Author-approved step-up | — | Failed → `veil` |
| `threshold` | Load world + engine, arrival | — | Errors → `offline`/`fatal`; skippable |
| `sanctuary.*` | Exploration, memory, letters, archive, future, rest | `hasNext/Prev`, `letterUnlockedForMe` | Errors stay local (memory `failed`) |
| `offline` | Connection lost | — | `NETWORK_RESTORED` → `loading` |
| `sessionExpired`, `loggingOut` | Clean teardown | — | → `veil` after purge |
| `fatal` | Calm "the sky is resting" | — | `RETRY` → `boot` |

**Side effects:** `flyCameraToFocus`, `returnCamera`, `drawConstellation`, `dimScene` call the Engine (Doc 06 §6.1); `clearSensitiveCaches` clears TanStack Query, revokes object URLs, deletes Cache Storage, disposes the Engine, closes AudioContext; `announceOpened` writes to the aria-live region.

## 18.4 Testing
Model-based tests use `@xstate/graph` (`getShortestPaths`) to walk every state; assert invariants (no path to `viewer` except from `memory`/`letters.reading`; every path to `veil` triggers `clearSensitiveCaches`). A CI script validates this JSON: all `#targets` exist, all named guards/actors are implemented.
