# Phase 18D — Real human GLB candidate intake

This adds **two actual converted human GLB files** as **opt-in candidates** to the Arabic app; no new static photo, placeholder, or automatically inserted library default.

| App label | Upstream original | Source file | Size (GitHub repository) |
| --- | --- | --- | ---: |
| ياسمين | Microsoft Rocketbox `Female_Adult_07` | `ananya.glb` | 4,480,100 bytes |
| زياد | Microsoft Rocketbox `Male_Adult_04` | `aarav.glb` | 4,673,948 bytes |

Both are documented in [the converting project's asset notices](https://github.com/927tanmay/react-ai-voice-avatar/blob/main/assets/avatars/LICENSE.md), which say their geometry was not changed in FBX → GLB conversion. The upstream URL is locked to commit `8af29d456c4d4d4f7e8ac32ac0c2b2aaf02c27d3` so assets cannot silently change if another project updates `main`. Original model project: https://github.com/microsoft/Microsoft-Rocketbox.

## Behavior

- The candidate section is available within the app; choosing a model adds it only to this browser's existing persistent user library and focuses its live 3D review. It does not rewrite or seed `DEFAULT_CHARACTERS`.
- Reopening a candidate with the same source URL selects the user's existing entry, preserving its custom name, favorites and locally cached asset. Removing it does not automatically bring it back on refresh.
- Users can use the existing portrait, side/front, expression and PBR reports and save an offline GLB copy from the same preview page.
- The assets are hosted at their original repository's raw GitHub files, not copied into the application's production bundle. Chromium CORS and upstream reliability are dependencies until cached locally.
- GitHub Actions checks candidate-source identifiers and actual GLB structure with the same bounded 32 MiB audit. If available and rigged, each candidate's actual binary is smoke-loaded inside Chromium. An external outage is logged, not fabricated as a verified model.

**Important:** The fact a candidate is a rigged Microsoft Rocketbox character does NOT prove it aesthetically matches the user's reference images. This stage expands the range of real characters available to evaluate; frontal/profile portraits and independent artistic sign-off are still required. The initial source asset notices indicate Microsoft Rocketbox MIT; provenance should be rechecked before packaging or hosting binaries ourselves.
