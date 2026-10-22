# Phase 20 — Multi-scene storyboard preview (experimental)

## Shipped on draft PR #31 (not merged)
- `/projects` supports multiple saved story projects and scenes, actor assignments, camera framing, editable timed speech and animation cues, and an interactive story timeline.
- `StorySequencePreview` uses absolute cue time offsets for play/pause/scrub, switches background and scene at timeline boundaries, and shows speech text as **silent on-screen subtitles**.
- `StoryMultiActorCanvas` renders up to **three** existing original GLB character instances in **one WebGL Canvas**, rather than a separate GPU context for every actor. Avatar loading is deferred until this panel mounts on the client.
- Actors with explicit horizontal offsets use those offsets; if all are centered, visible actors are spaced evenly by the preview renderer. The editor stores actor scale and offsets.
- The scene framing control influences a shared preview camera. For multiple actors the framing deliberately remains wide enough to keep them visible.
- The animation cue currently applies the existing avatar animation interface at that cue's timeline interval. Its exact movement depends on the source model and its native clips/rig.
- Local drafts are debounced and their IndexedDB writes are serialized, protecting against stale async commits. Save errors are surfaced, and unsaved/failed writes trigger a browser exit warning.
- Backups remain explicit downloadable JSON. Import creates a new ID so importing never silently overwrites an existing project.
- Chromium storyboard smoke now checks create/edit/autosave/reload/timeline/export/import; unit tests exercise autosave and deterministic playback.

## Important limitations
This is an interactive **preview**, not finished multi-scene movie export or calibrated dubbing:
1. Speech subtitles are silent. No TTS, lip-sync, sound mixing or recording is synchronized to the timeline.
2. Only the first three catalog-backed actors render together in preview. More actors can be authored in project data but are not simultaneously shown.
3. Rendering positions and actor sizing are not yet validated for every GLB mesh; high-resolution VRoid models can be expensive on mobile.
4. No guarantee of frame-accurate transport during tab throttling or asset download stalls; preview advances according to elapsed browser time.
5. Browser-local IndexedDB is not cloud sync, and private browsing/data clearing may delete work; export JSON backups.
6. Real-device screenshot/art review of multi-actor scenes and browser compatibility remain pending.
7. Last PR CI status must be checked for the exact final commit. Remote GLB checks remain strict: retries handle transient timeouts, but genuine missing or invalid assets are still marked failed.

## Next
- A film-oriented canvas compositor capable of rendering multiple actors, transitions, subtitles, audio and background without depending on CSS.
- Audio dialogue engine based on per-cue clip scheduling; measure phoneme timings only where supported by a validated model.
- Stable, end-to-end capture/export pipeline (WebM as a supported baseline, MP4 only with a real muxing/transcoding pipeline).
- Mobile WebGL memory and reduced-motion testing; explicit asset/per-model capability metadata.
- Cloud synchronization only after auth and tenant isolation are designed and approved.
