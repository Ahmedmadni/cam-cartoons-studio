# Phase 18J — Only genuine GLB character assets are rendered

## Product decision
Remove the outdated geometric/procedural avatar style completely from customer-facing scenes and libraries. The app starts with **five existing featured GLBs and six independently sourced and commit-pinned curated GLBs** (11 total). This is source registration only: each remote binary loads **on selection**, preserving mobile data and startup performance. The 35 MiB MPFB model is not downloaded for every user.

## Compatibility and data
- Upgrade persistent library storage to version 4. Saved geometric characters are converted to real GLB sources **without changing their IDs, user names, favorites or project references**. Original geometric thumbnails are invalidated because they are no longer accurate.
- The old boy/girl sources have no verified child replacement among the provided GLBs. Their legacy IDs and titles are retained for backward compatibility, but the selected reference 3D models may look older than children. This must be addressed by acquiring suitable licensed, genuine child 3D assets instead of misrepresenting adult files as children.
- Six curated characters are auto-registered once on upgrade; never re-seed removed entries in later sessions. Entries already imported by URL aren't duplicated. Existing featured avatars deleted by users aren't resurrected.
- User-owned imported GLBs and IndexedDB backups remain intact. Brand/provider metadata does not authorize indiscriminate use of unrelated sample assets: use concrete GLB files users are entitled to.

## Renderer guarantee
No `ProceduralAvatar` fallback, including during GLB load, failed CORS, missing asset, recording or old persisted `renderModes.custom` choice. Missing/broken assets show a legible error instead of a counterfeit character. ReadyPlayerMe/GLB file imports still render in the original geometry and PBR textures.

The old synthetic skin/hair/face/color picker is removed from `/customize` because it never changed real GLB textures. The new page offers actual GLB preview, camera framing, light rig controls, and material capability readings; model editing uses the existing import interface. User can still import a new professionally-authored GLB unchanged.

## Verification
Bun tests cover new stock source integrity, v4 compatibility, deleted-entry stability, absence of new procedural draft creation and preservation of favorites. Chromium visits the actual featured and curated GLBs, checks the face/mouth controls and local binary imports, and confirms no old-stock option exists. No artistic likeness claims: final art direction still depends on real on-canvas model review.
