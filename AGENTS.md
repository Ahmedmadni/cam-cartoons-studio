<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to Lovable. Avoid rewriting published Git history
> through force pushing, rebasing or amending pushed commits. Push through
> reviewed feature branches and merge after CI success.
<!-- LOVABLE:END -->

## Primary application

- The default route / is an Arabic-first **2D narrated short-video editor**.
- Keep the new social app independent of legacy GLB, webcam, Ready Player Me,
  face tracking, server AI provider keys and network-dependent rig downloads.
- Data schema and safe JSON import: src/lib/socialStudio.ts
- Preview and export MUST use the same renderer: src/lib/socialCanvas.ts
- Audio is a real local blob in IndexedDB, separate from JSON scene backup.
- WebM export requires actual MediaRecorder + Web Audio tracks; browser
  SpeechSynthesis cannot be muxed as real exported narration.
- Never describe envelope-driven mouth motion as phoneme-level lip sync.
- WebM only, 720x1280 or 1080x1920 / 24 fps, <=120s. High-res memory varies by device; no MP4 claim until implemented.
- Per-scene voices stored under stable scene IDs in IndexedDB; do not allow one scene to speak across the next scene boundary.
- Word-by-word reveal is estimated from scene duration, NOT speech-transcribed timing.
- Layered Canvas rigs are in src/lib/socialCharacterRig.ts; use source shapes for preview and export.
- QA: Bun TS/tests/build + scripts/browser_social_smoke.py actual audio WebM.
- Legacy /projects remains temporarily accessible for recovery/export.
  Do not destroy or migrate user browser storage without a safe backup.
- The routes /studio, /story, /save, /customize redirect to the new editor.
- Before removing old 3D packages/assets, update tests and migration plan.

## Character cut-out animation (Phase 4)
- Rig types and pose interpolation: src/lib/characterRig.ts (bounded, JSON-safe).
- Canvas transform renderer: src/lib/characterRigRenderer.ts. Head + 2× shoulder/elbow/wrist hierarchies.
- The eight separate full-frame transparent PNG/WebP body-part images are mandatory for REAL articulation; a flattened portrait is not a skeletal rig.
- Artwork stored locally under existing IndexedDB image keys, not included in scene JSON backups.
- Scene RigSettings are optional so previous projects remain compatible; when present they MUST be honored in the shared preview/export compositor.
- Display honest capability state: do not claim arms animate if only the base image exists.
- QA in tests/characterRig.test.ts and scripts/browser_social_smoke.py (uploads 8 fixture layers, records two keyframes and checks audio export).
- Format, pivots, design requirements: docs/CHARACTER_RIG_PACK.md.


## Built-in Sami art

- First-party original cut-out art in src/lib/builtinSamiRig.ts (15 aligned layers).
- Its source data is compressed vector SVG only for first-party artwork, decompressed locally with browser APIs, then rasterized to ImageBitmap. Do not accept user-supplied SVG.
- Never replace or delete user-uploaded local IndexedDB art automatically.
- Sami has real arm/head articulation; Layla, Omar and Nour remain fallback art until they get separate packs.
- Regression check: scripts/browser_social_smoke.py checks full illustrated master rig and facial layer availability.
