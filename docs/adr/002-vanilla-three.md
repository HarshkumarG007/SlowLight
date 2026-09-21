# ADR-002: Vanilla Three.js Engine over React Three Fiber

- **Status:** LOCKED
- **Date:** 2026-09-20
- **Deciders:** Author
- **Spec Reference:** Spec 00 §Locked Decisions (D-02), Spec 08 §8.2, Spec 23 (RULE-051, RULE-052)

## Context & Problem Statement
Slow Light features a cinematic 3D night sky where memories are rendered as luminous lights along a temporal rail. We need to choose a 3D rendering architecture that balances visual fidelity, GPU memory management, testability, and clean separation between application UI state and 3D graphics.

React Three Fiber (R3F) integrates Three.js into the React reconciler tree, while vanilla Three.js runs an imperative engine isolated from React.

## Decision
We choose a **Vanilla Three.js Engine** encapsulated in `apps/web/src/three/`. The 3D engine does not read React state, and React components never directly touch Three.js objects. They communicate exclusively through a typed command and event bus (`EngineBus`).

React Three Fiber + drei, Babylon.js, and raw WebGL are rejected.

## Rationale
1. **Explicit Resource Ownership & Disposal**: GPU resources (geometries, materials, textures, buffers) require strict tracking to avoid memory leaks on mobile devices. An explicit `ResourceTracker` guarantees clean disposal upon unmount or context loss (Criterion 3D-03).
2. **Decoupled Render Loop**: Frame-loop execution is decoupled from React's render cycles and reconciliation overhead, eliminating unnecessary re-renders and GC pressure (RULE-053).
3. **Headless Testability**: The sky layout algorithm (`packages/shared/src/layout.ts`), camera trajectories, and math can be tested in Node environments without a browser DOM.
4. **Bundle Size**: Omitting R3F and its abstraction layer keeps the 3D bundle compact.

## Consequences
- **Positive**: Direct control over draw calls, instancing, and GPU memory; deterministic layout and testing; clean separation of concerns.
- **Negative / Trade-off**: More imperative boilerplate compared to declarative JSX scene graphs (mitigated by structured engine stages and systems).
