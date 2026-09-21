# ADR-003: Photos and Videos Rendered in the DOM, Never as WebGL Textures

- **Status:** LOCKED
- **Date:** 2026-09-20
- **Deciders:** Author
- **Spec Reference:** Spec 00 §Locked Decisions (D-03), Spec 08 §8.2, Spec 23 (RULE-050)

## Context & Problem Statement
The application displays hundreds of photographs and videos associated with intimate memories. In 3D web applications, media is often mapped directly onto 3D plane meshes as WebGL textures. We must decide whether photos and videos reside inside the WebGL canvas or in the standard browser DOM.

## Decision
All photos and videos are rendered strictly as **HTML DOM elements (`<img>`, `<video>`)**, overlaid above the WebGL canvas. **Media is never uploaded as WebGL textures**.

3D lights in the sky represent memories symbolically as instanced luminous particles, not photo planes. When a user unfolds a memory, a DOM panel emerges with the photo/video rendered natively in HTML.

## Rationale
1. **GPU Memory Conservation**: Loading high-resolution photographs into WebGL texture memory rapidly exhausts GPU VRAM, particularly on mobile devices (iOS Safari limits texture memory to ~250–384 MB before crashing tabs). Keeping media in DOM elements allows the browser's native compositor and image decoders to handle caching and downsampling efficiently.
2. **Canvas Taint & Security**: Uploading signed media into WebGL textures risks canvas cross-origin taint issues, complex CORS setups, and potential side-channel pixel readout attacks.
3. **Accessibility**: DOM media natively supports semantic `alt` attributes, screen reader descriptions, aspect ratio preservation, responsive `srcset`, and touch gestures (pinch-to-zoom).
4. **Color Fidelity & HDR**: Browsers handle wide color gamuts (Display P3) and color management natively in DOM media without custom WebGL color-space shaders.

## Consequences
- **Positive**: Drastically cuts GPU memory usage; avoids canvas taint; ensures full WCAG 2.2 accessibility compliance; simplifies video streaming and seeking.
- **Negative / Trade-off**: Photos cannot be warped with custom 3D mesh shaders in world space (unnecessary for Slow Light's poetic aesthetic).
