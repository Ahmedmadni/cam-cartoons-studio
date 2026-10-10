# Phase 18E — In-app six-frame real GLB art review

This introduces an **opt-in, repeatable** visual inspection workflow for the currently selected imported GLB. It does **not** replace meshes, introduce stock images, or claim the real assets automatically match the user's reference imagery.

## Artist-facing workflow

1. Open a real imported character or opt-in Rocketbox candidate. Wait until the GLTF renderer's **ready** diagnostics display.
2. Click **إنشاء لوحة مقارنة حقيقية (6 زوايا)**. The program reuses **one WebGL canvas**, disables spin/preview speech, returns expressions to neutral, hides the cinematic scene backdrop, then captures a *real* six-frame grid:
   - Face portraits: front, three-quarter and profile, in neutral softbox illumination
   - Garments/upper body: same three angles in natural daylight
3. Compare the resulting face, eyelashes/eyes, hair silhouette/transparent cards and clothing with the original user's reference images and make **manual** notes using the integrated rubric.
4. Optionally save the actual render-grid as WebP. Images are **kept in local UI memory only**, not written into a public asset directory, saved in the user's character library, or substituted for original 3D meshes.

## Data protection and limits

- Art review ratings/notes are stored in a **separate browser-local key** scoped to character ID and GLB source URL/IndexedDB asset ID. Switching to a different binary invalidates old ratings, without touching names/favorites/imports/Story.
- The six-frame capture is user initiated, not an automatic background screenshot; it may be unavailable if a WebGL context is lost or drawing data is inaccessible.
- Browsers with failing local storage display a warning, without blocking reading/playback.
- The confidence grade is **human-authored**, not a computer-vision or automated reference match. Professional art quality still requires actual production-grade character mesh/texture improvements where the current models fall short.
- Source assets remain on upstream servers. This release makes evaluation easier **entirely inside the application**, without asking the viewer to upload or fetch external files manually.

## QA

Bun validates the six-shot matrix, rubric and safe local review persistence. Chromium checks actual UI visibility and persistence of ratings and notes; optional WebGL screenshots are intentionally NOT forced in CI because SwiftShader readback can hang hosted runners. Users can generate their own six-view sheet in the browser. No new default characters or runtime downloads are added.
