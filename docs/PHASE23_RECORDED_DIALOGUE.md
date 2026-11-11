# Phase 23 — Per-dialogue recorded audio in WebM

## New workflow
1. Open a story under `/projects`, add a scene actor and a speech cue.
2. In the cue, choose **رفع ملف صوتي** (MP3 / WAV / OGG / WebM / M4A, browser decoding required) or **تسجيل الصوت** (microphone permission, browser WebM support, maximum 20 seconds).
3. Listen to the clip in the local audio player. It is saved in a separate IndexedDB store keyed by `[projectId, sceneId, cueId]`; it is not uploaded.
4. Use **تسجيل معاينة WebM**. Attached dialogue clips are decoded through Web Audio, scheduled at each cue's absolute story time, truncated at cue end and muxed as a real audio track into the existing 30-second WebM preview.
5. When no clips are attached, WebM remains silent. The existing browser speech synthesis feature is audible during preview only and cannot be captured reliably.

## Constraints and security
- MIME types checked for standard supported audio containers and file size limited to 8 MiB per clip. Decoding errors are surfaced; no arbitrary JavaScript is loaded.
- The microphone recorder automatically stops after 20 seconds and all microphone streams must be released on stop/unmount.
- The audio store is scoped by project, scene and cue to prevent collision when projects repeat identifiers. Deleting a project removes its separately stored voice clips.
- The JSON story backup and SRT captions **do not include uploaded recordings**. Keep the original audio files on your device; clearing browser storage removes recordings.
- Unsupported mobile Web Audio or WebM capture is reported instead of claiming MP4 support.
- Video preview is still limited to 30 seconds at 854×480. True full-length, frame-accurate multi-scene export, server-side encoding, professionally aligned phonemes, and MP4 remain pending.
- Voice mixes are cut to cue duration. Recordings shorter than their cue play naturally without looping. Overlaps mix via the shared audio destination.

## Validation
- New deterministic tests cover clip MIME/size limits and cross-scene audio scheduling and clipping.
- Chromium storyboard smoke now inserts a short WAV voice clip for a real cue using the UI and asserts the produced WebM contains an Opus audio track.
- CI must pass on the exact PR head before merge.
