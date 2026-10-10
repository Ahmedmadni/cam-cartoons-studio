# Phase 18C — Natural facial performance

The reviewed GLB models continue to use their **existing authored geometry and blendshapes**. This stage changes *how* those assets move, not how their meshes are modeled. It avoids activating multiple mouth-jaw/viseme targets at full amplitude simultaneously and instead drives one prioritized shape per mesh, smoothing transitions across frames. On rigs with left/right smile morphs, both sides animate together rather than double-layering a generic smile.

- Non-tracked playback uses an irregular, asymmetric blink cadence; live MediaPipe blink data takes priority while tracking is enabled.
- Character Library alone gets neutral, smile, surprise, thoughtful expression buttons, with compatibility-based disabling for unsupported meshes.
- Preview selection does not change favorites, character metadata, local GLB copies, or Story/Studio routing. On entering a new character, expression state resets to neutral.
- The mouth trial is **silent diagnostic jaw animation**, not audio-to-phoneme alignment. Existing Story audio RMS-driven mouth opening and webcam face tracking retain their own data sources.
- Original GLB source files, material colors, and rig topology are unchanged; a separate visual art pass is still needed to match reference portraits.

QA: deterministic morph selection, individual expression values, blink cadence, capability checks and live Chromium click-through. Artistic acceptance requires examining facial motion on actual models, especially ريم; هند remains intentionally without unsupported mouth animation.
