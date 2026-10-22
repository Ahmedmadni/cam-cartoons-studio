# Phase 21 — Arabic dialogue authoring, browser narration, and subtitle export

## Delivered on draft PR #31

1. **Script-to-timeline import**. The `/projects` editor accepts Arabic dialogues, one line at a time. Prefix each line with a real scene actor name and a colon to assign the line to that actor; a line without a prefix uses the first actor. Validated cues are appended after existing content without destroying previously authored movement or speech. A conservative duration estimate expands the scene when necessary; the editor keeps timings adjustable.
2. **Browser narration preview**. The story timeline has an opt-in audio toggle. Newly entered speech intervals invoke Web Speech synthesis in `ar-SA`, and use the character catalog's voice preset to vary approximate pitch. Pause, reset, hidden tab, scene seeking, project change and cue end cancel current speech. A reverse seek does not replay earlier dialogue.
3. **Arabic SRT export**. Storyboard editor downloads a UTF-8 subtitle file with BOM and real absolute scene offsets for all speech cues. This can be imported by external video editors; movement cues are excluded.
4. **Tests**. Pure unit tests cover new cue activations and seek boundaries, browser-synth capability and cancellation, speaker identification, duplicate-name rejection, duration estimates, append behavior, and SRT offsets.
5. **Privacy**. Browser narration is local, and story JSON remains stored in browser IndexedDB. No new external TTS provider or API keys are introduced.

## Accurate limitations

- Web Speech is an **audible preview only**, not calibrated recording or professional dubbing. It may speak slower/faster than the authored cue. The narrator is stopped at cue end even if a phrase is incomplete. The actual installed voices vary by device and may not include good Arabic voices.
- Voice pitch presets do not guarantee that a voice has the requested age/gender/timbre.
- The current shared WebGL preview displays up to three genuine character models but does not yet export multi-scene video with audio. SRT files are separate caption artifacts, not embedded subtitles.
- The script builder estimates timing from word count; users need to edit cue timings after listening. No claims of lip-sync precision.
- Imported or created projects remain local; users should download JSON backups.
- Preserve existing GLB assets, VRoid links and original story/studio capture flows.

## Next technical milestones

1. Reuse the story playback plan to build a deterministic canvas recorder with explicit WebM capability and asset-load readiness checks.
2. Implement validated generated or recorded dialogue audio clips, with an actual Web Audio timeline mix and capture stream. Do not claim audio from Web Speech is recordable.
3. Improve model-specific camera framing and scene transitions; profile mobile memory and ensure licensing/source attribution.
4. Add browser tests for narrator cancellation and frame export, and verify on Android/iOS.
5. Only claim MP4 after a real muxing/transcoding implementation and device QA.

**Merge gate**: inspect GitHub Actions success on the exact final PR head SHA. Do not merge a failing or unreviewed draft.
