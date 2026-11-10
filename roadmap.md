# Current work
- [x] Add four flat illustrated backgrounds and a dedicated 2D category; verify all scenes and full toon framing in Chromium.
- [x] Fix character shadow warnings without external lighting downloads.
- [x] Make story speech and recording cancellation safe; release media resources.
- [x] Correct video sharing and remove navigation back to the retired camera workflow.
- [x] Fix invisible skinned avatars and collapsed background selectors.
- [x] Run regression tests (127 passed) and verify real-character video playback and download without tab audio.

Verification limitation: audible Arabic speech and tab-audio export remain unverified because the sandbox browser has no installed speech voices and cannot approve the native tab-sharing picker.