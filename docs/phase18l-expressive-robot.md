# Phase 18L — Genuine expressive robot character for children's stories

Original model: **RobotExpressive.glb** by Tomás Laulhé (Quaternius), with adaptations by Don McCurdy adding three face expression morphs. The [Three.js source README](https://github.com/mrdoob/three.js/blob/11738a9d55e502fb484cefffcea3a66dc44e9fe9/examples/models/gltf/RobotExpressive/README.md) labels the model CC0. The source is locked at `11738a9d55e502fb484cefffcea3a66dc44e9fe9`. Published binary size: 463,988 bytes.

It is an independent original GLB, not the old in-house geometric fallback. The default catalog now registers the original URL; it does not bundle another low-detail substitute. Built-in model animation clips, body skeleton and face expressions are inspected by the same actual WebGL loader and GLB audit used for all 11 earlier candidates. This model has some expressive morphs, **not** a claim of phoneme/Arabic viseme synchronization. It can serve as a non-human secondary narrator for children's stories.

One-time v6 migration adds the source for already-active installations without changing existing saved characters or automatically re-inserting a character after the user removes it. Video/studio views retain the source geometry and materials without synthesizing blocky avatars.

Next: integrate native VRM loader and retargeted VRMA clips with source-specific animation compatibility. GLB and VRM are not interchangeable file extensions; loading native VRM requires a separate adapter and tests.
