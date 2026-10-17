# Phase 19 — Story project foundation (increment 1)

## Implemented
- New versioned `StoryProject` schema and parser (`src/lib/storyProject.ts`) with scene, actor, dialogue/animation cue and camera framing models.
- Cross-reference validation for actor IDs and cue durations, duplicate IDs and invalid schema versions.
- Isolated IndexedDB CRUD helpers (`src/lib/storyProjectStorage.ts`), with explicit errors on browser storage unavailability, blocked upgrades, and failed transactions.
- Six unit tests for schema creation, parsing, scene duration and invalid data.
- Zero changes to existing WebGL renderer, camera/video capture, character catalog or old persisted library.

## Scope / limitations
This is **only the first increment**, not the entirety of Phase 19.
- New project CRUD is an internal API, not yet wired into story editor UI or autosave.
- No multi-scene playback, export fixes, browser recording tests or MP4 feature.
- No automatic migration from the older transient Zustand state; do not silently overwrite existing user data.
- Actual CI results should be reviewed on the pull request before merge.
- The remote audio fallback limitations documented in `docs/AI_VOICE_API.md` still apply.

## Next increments
1. Add draft editor UI with explicit save/open, autosave conflict handling and optimistic recovery.
2. Extract story orchestration out of `src/routes/story.tsx` and support deterministic multi-scene playback.
3. Test MediaRecorder MIME fallback, audio capture, cancellation and cleanup in Chromium.
4. Verify realistic GLB loading/bandwidth under WebGL and preserve license metadata.
5. Run all CI gates and merge only after green results and human review.
