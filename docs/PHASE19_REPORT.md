# Phase 19 — Story production foundation and storyboard editor

## Delivered to draft PR #31
- Versioned, validated story project data model with actors, timed cues, scenes and camera framing.
- Isolated IndexedDB CRUD for browser-local drafts without modifying the existing character library.
- Immutable scene add/update/remove/reorder utilities and a deterministic, millisecond-based scene timeline.
- New Arabic `/projects` route with a multi-scene storyboard editor: create/open/delete project, rename, explicitly save, add/remove/reorder scenes, choose backgrounds and camera framing, add/remove actors and add a sample speech cue.
- Direct navigation into projects from the home character library.
- Schema and timeline unit tests.
- Existing `/story`, `/studio`, `/save`, GLB rendering, and audio recording logic remain untouched.

## Important honest limitations
- Updated October 22: timeline preview, speech cue editing and a shared multi-GLB canvas are implemented; this remains *authoring and live preview*, NOT a full audio/video export or calibrated dubbing engine. See `docs/PHASE20_PREVIEW.md`.
- Updated October 22: editor changes now use debounced, serialized autosave. Explicit Save is also supported, with a warning before leaving if a write is pending or failed.
- Saved story drafts are browser-local only. Browser data deletion can erase them; cloud backup/import/export is not yet implemented.
- A failed early CI attempt on the new route showed a missing generated TanStack route registration. Route tree was subsequently updated; latest CI must be reviewed before merge.
- No claim that Lip Sync, VRM animation retargeting or cross-browser MP4 are implemented.

## Follow-up acceptance gates
1. Final TypeScript, Bun unit, build and WebGL CI all green on final branch SHA.
2. Add editable cue timing/text and multiple scene actors, then runtime playback preview.
3. Browser-native persistence tests including storage unavailable/quota, fresh reload and corrupted records.
4. Add honest video/media capability detection and synchronized audio capture tests.
5. Add downloadable project JSON backup / import with validation.
6. Review UX/accessibility, and test on Android/iOS/desktop.
7. Merge only after review.

## Additional October 19 increment
- Add strict JSON backup export/import with a 2 MiB import cap and validation of project schema and backup format; imports receive a fresh project ID to avoid replacing an existing draft.
- Add cue editing inputs (text, start time and duration) to the storyboard and reusable immutable cue operations for future timeline controls.
- Add tests for backup roundtrip, invalid format/oversized input, non-overwriting imports, and cue add/edit/remove and bounds.
- The user must manually save changed scene content; project export may include current unsaved in-memory edits, so editor status must be checked.
- Pending: autosave/conflict handling, 3D multi-actor preview, timeline playback, export, mobile/browser/device QA. No production completion claim.

## Deterministic playback planning increment
- Added a pure multi-scene playback scheduling layer that flattens scene-relative cues to absolute story-time intervals, maps actors to catalog IDs, and exposes frame lookups with boundary semantics.
- Added tests for cue ordering, scene boundaries, absolute offsets and empty projects.
- This is a scheduling foundation, **not** an operational renderer or synchronized exported movie yet.
