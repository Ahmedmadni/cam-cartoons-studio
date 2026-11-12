# Cartoon Content Studio — استوديو صناعة المحتوى الكرتوني

Arabic-first **2D narrated short-video editor** for TikTok, Reels and Shorts. Uses TanStack Start / React, Canvas, Web Audio and browser storage. The new home editor needs no account, camera, GLB model hosting or cloud database.

## Real features

1. Up to 20 editable scenes totaling 120 seconds.
2. The illustrated reference-style Sami character is bundled from the owner-supplied visual. All four actors can now use imported cohesive raster character art (base + optional mouth and eye patches) stored locally; the three other built-ins continue using the original vector fallback until artwork is imported.
3. Microphone recording or uploaded audio. Choose whole-film narration or an independent clip for each scene with waveform and per-scene delay; IndexedDB keeps real audio files keyed to stable scene IDs.
4. Full vertical story preview and baked Arabic captions; selectable static or approximate word-reveal animation.
5. Real-time **720×1280 or 1080×1920, 24 fps WebM** export. Web Audio muxes each clip at its scene start plus optional delay and trims audio exactly to scene boundaries. Supports silent output when no audio exists.
6. Download editable JSON scene backup or separate SRT subtitles.

## Accurate limitations

- Approximate volume-driven mouth movement is **not** phoneme-level automatic lip sync.
- No hosted generative AI, automatic voice synthesis, voice cloning, transcription, MP4 or music library is implemented.
- Mic access requires HTTPS/localhost and browser permission. Some uploaded files may not decode despite their extension.
- The WebM export occurs in real time; the browser tab must stay visible and the device must support MediaRecorder. Current preview/export is capped at two minutes and 720×1280.
- Whole-video audio starts at zero; per-scene audio begins at the selected scene plus its user-defined delay. Clips longer than the available scene are truncated. There is no automatic voice-to-word alignment.
- The reveal of Arabic words is **estimated uniformly from scene duration**, not derived from speech timestamps. Mouth poses are driven by PCM amplitude, not viseme / phoneme inference.
- 1080p export demands more browser memory and can drop frames on slower devices. Validate it on intended phones.
- Local project metadata is saved in localStorage; audio in IndexedDB. Clearing browser storage destroys local work.
- **JSON backups omit audio**. Keep your source audio separately.
- The user-provided cartoon reference is now included as a **small low-resolution cutout** for Sami. It is not a production-ready HD character pack or a lip-synced puppet; the bundled other characters remain vector fallback. Artist-provided PNG/WebP layers are necessary for production quality and optional mouth/eye changes.
- Imported illustrations can be **static**. The editor only applies subtle overall movement to an unlayered image. It never claims hand gestures or lip sync from a single image.

## Relevant source files

- src/routes/index.tsx — responsive authoring workflow
- src/lib/socialStudio.ts — safe versioned schema, timeline and SRT
- src/lib/socialCanvas.ts — 2D scene compositor and captions
- src/lib/socialCharacterRig.ts — legacy vector fallback rigs
- src/lib/socialCharacterArt.ts — coherent raster artwork, local persistence and overlay renderer
- src/lib/socialReferenceArt.ts — owner-supplied low-resolution Sami sample
- docs/ILLUSTRATED_CHARACTER_PACKS.md — specification and constraints
- src/lib/socialAudioTimeline.ts — pure audio cue scheduling and waveform bins
- src/lib/socialVideo.ts — audio persistence, amplitude, WebM compositor
- tests/socialStudio.test.ts — contract tests
- scripts/browser_social_smoke.py — browser recording smoke test

## Existing work and non-destructive migration

The previous project focused on 3D avatars, camera tracking and GLB files. **Existing user-created projects and assets are not deleted in this change.** The old /projects route is temporarily retained for legacy recovery/backup. Obsolete app modules and assets stay in Git for now, and can be removed after an explicit legacy-data migration and tests.

The still-open [3D audio PR #33](https://github.com/Ahmedmadni/cam-cartoons-studio/pull/33) is separate and is not assumed to be merged.

## Development / validation

- bun install --frozen-lockfile
- bun x tsc --noEmit
- bun test tests/
- bun run build
- python scripts/browser_social_smoke.py (Playwright Chromium required)

## Priority roadmap

1. Replace the low-resolution sample and geometric fallbacks with four **artist-created HD layered illustrations** matching the supplied reference. Test faces, hand anatomy and facial patches visually.
2. Add forced-alignment phoneme/viseme timing and word-level narration synchronization; current audio envelopes and uniform caption reveal are deliberately approximate.
3. Word-level captions, audio transcription, optional API-backed Arabic voice generation with consent and clear cost.
4. H.264 MP4 and tested iOS/Android high-resolution performance improvements.
5. Multi-project media backups and compatibility matrix.
6. Once old data is migrated: remove GLB, camera, Ready Player Me and legacy UI/dependencies, with test-driven cleanup.

Lovable sync: keep main history intact. Review changes in a feature branch PR.
