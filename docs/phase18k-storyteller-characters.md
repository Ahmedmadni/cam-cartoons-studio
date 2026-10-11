# Phase 18K — Real VRoid narrators and original animated fox

Four unmodified source GLBs from `iamenahs/xlunar-ai-avatar` at pinned commit `5e368bfff897d73090519f9f696c631a52d77397`: VRoid_Sample_A/B/C/D.glb (15,321,932 / 17,936,516 / 14,198,800 / 16,851,352 bytes). Original geometry and textures are preserved: no reduced-size model generated. They are inspected per-model for actual face morphs / skeletal animation, not assumed to have speech targets.

The original animal GLB is `KhronosGroup/glTF-Sample-Assets` / `Models/Fox/glTF-Binary/Fox.glb` at commit `edc7c9e67c639d230715049ee31f9a96a6babbbe` (162,852 bytes). The actual source has three authored clips: Survey, Walk, and Run. A Three.js AnimationMixer plays these embedded animations inside the story and studio. No fake voice-to-mouth animation is claimed for the fox, and native animal skeleton poses are never overwritten by human arm/head controls.

Both sources stay on their original GitHub URLs. Asset registration increases the gallery to 16 genuine GLBs without downloading the four 14–18 MB VRoid assets at app startup; model binaries fetch only when selected and the existing IndexedDB caching is supported. Storage v5 adds just the five NEW candidates to an existing v4 library without resurrecting previously deleted originals or modifying user-created entries.

Deterministic Bun/Python tests and real browser/WebGL tests validate source identity, model anatomy, animated clips, mobile layout, and correct GLB render. A source being real does not establish subjective visual similarity to reference photos.

Future VRM 1.0 imports and VRMA retargeting require a compatible native loader and skeletal/face retargeting. This phase doesn't claim VRM or VRMA support; the included four models are self-contained GLBs.
