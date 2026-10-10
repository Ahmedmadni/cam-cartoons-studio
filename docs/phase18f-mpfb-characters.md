# Phase 18F — Three more human GLB art candidates (no false lip-sync claims)

## Actual assets (source-commit pinned)

App label | Original asset | Source | Size | Compatibility expectation
--- | --- | --- | ---: | ---
كوفي | Kofi | PrivacyPuppet / MakeHuman-MPFB | 17,960,820 bytes | Body skeleton, may lack facial morphs
يوكي | Yuki | PrivacyPuppet / MakeHuman-MPFB | 14,536,028 bytes | Body skeleton, may lack facial morphs
ليام | Liam | PrivacyPuppet / MakeHuman-MPFB | 14,487,660 bytes | Body skeleton, may lack facial morphs

Pinned repository: `privacypuppet/privacypuppet` at `ff1b635eba22d782423a6d81233e8deca7f6d1bd`. Source: https://github.com/privacypuppet/privacypuppet/tree/ff1b635eba22d782423a6d81233e8deca7f6d1bd/public/mpfb_models. These three actual binaries are distinct from the two Rocketbox candidates and the five earlier featured GLBs. Upstream repository declares MIT and says these assets are from MakeHuman/MPFB.

The five art candidates live entirely in the app (no external app or manual setup); the three new ones are **only added on the user's explicit click**. No changes to saved names, favorites, user imports, local GLB cache or Story media. They are still dynamically hosted at the source repository, not bundled into the production assets. Runtime bandwidth is higher for MPFB than for the Rocketbox avatars. Existing "حفظ الشخصية على هذا الجهاز" lets users cache them locally.

**Important:** MakeHuman human rigs are useful artistic alternatives, but their bone-only implementations must NOT be confused with ARKit facial morph support. The renderer continues to state whether face morphs were actually found, and disables unsupported mouth-expression buttons. The Python binary audit checks all five candidates independently; Chromium loads every accessible actual candidate binary, validating that the UI's lipsync diagnosis agrees with asset anatomy. Browser-origin CORS remains an external dependency. This phase introduces **genuine alternative character meshes**, not a promise that their faces match the supplied cinematic style.

Next: gather and compare actual 6-angle contact sheets of all new candidate assets against original reference portraits; prioritize face/eye/hair/clothing revisions based on human art review.
