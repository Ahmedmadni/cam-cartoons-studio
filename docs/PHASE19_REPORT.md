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
- This is a story *authoring foundation*, not full multi-scene rendered video export. The storyboard preview intentionally shows the selected background and metadata; actor 3D stage integration, speech cue editing, playback and export remain to do.
- Saving is currently explicit, not automatic; unsaved changes are labeled as such.
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
