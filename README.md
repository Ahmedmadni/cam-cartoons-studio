# Cartoon Content Studio — استوديو صناعة المحتوى الكرتوني

Arabic-first **2D narrated short-video editor** for TikTok, Reels and Shorts. Uses TanStack Start / React, Canvas, Web Audio and browser storage. The new home editor needs no account, camera, GLB model hosting or cloud database.

## Real features

1. Up to 20 editable scenes totaling 120 seconds.
2. Four original programmatically drawn 2D cartoon actors, six backgrounds, motion presets, titles and captions.
3. Microphone recording or uploaded audio; persist the real blob in IndexedDB; mouth movement follows audio volume (not phonemes).
4. Full vertical story preview and baked Arabic captions.
5. Real-time **720×1280, 24 fps WebM** export, muxing the uploaded/recorded audio through Web Audio. Supports deliberate silent export if there is no clip.
6. Download editable JSON scene backup or separate SRT subtitles.

## Accurate limitations

- Approximate volume-driven mouth movement is **not** phoneme-level automatic lip sync.
- No hosted generative AI, automatic voice synthesis, voice cloning, transcription, MP4 or music library is implemented.
- Mic access requires HTTPS/localhost and browser permission. Some uploaded files may not decode despite their extension.
- The WebM export occurs in real time; the browser tab must stay visible and the device must support MediaRecorder. Current preview/export is capped at two minutes and 720×1280.
- A supplied audio clip starts at time zero and is cut to the storyboard duration; there is not yet per-scene waveform alignment. Mismatched lengths are warned about.
- Local project metadata is saved in localStorage; audio in IndexedDB. Clearing browser storage destroys local work.
- **JSON backups omit audio**. Keep your source audio separately.
- The user-provided cartoon picture is an art-direction reference; the new four programmatic vector characters are not a motion-rig copy of that picture.

## Relevant source files

- src/routes/index.tsx — responsive authoring workflow
- src/lib/socialStudio.ts — safe versioned schema, timeline and SRT
- src/lib/socialCanvas.ts — 2D character rendering, headlines and captions
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

1. Commission/license a consistent high-fidelity **2D layered art pack** matching the uploaded reference: separate eyes, brows, hands and 6–12 mouth shapes per reusable character.
2. Per-scene audio dialogue, waveform editor, proper speech timing / visemes, multi-character dialogue.
3. Word-level captions, audio transcription, optional API-backed Arabic voice generation with consent and clear cost.
4. H.264 MP4, tested 1080×1920 export, browser/mobile performance improvements.
5. Multi-project media backups and compatibility matrix.
6. Once old data is migrated: remove GLB, camera, Ready Player Me and legacy UI/dependencies, with test-driven cleanup.

Lovable sync: keep main history intact. Review changes in a feature branch PR.
