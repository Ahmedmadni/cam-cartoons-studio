# Phase 18H — Actual MakeHuman surface fidelity improvements

## Material and geometry evidence

PrivacyPuppet's MakeHuman GLB renderer explicitly deals with overlapping `low-poly` and `high-poly` facial meshes, makeskin / high-poly alpha cutoffs, and eyebrow/eyelash transparency. This stage applies a narrower, reversible subset of those corrections **only to the three immutable, upstream-pinned Kofi/Yuki/Liam assets**.

- Suppress `low-poly` face overlay **only when a `high-poly` companion exists**, to eliminate overlapping face / iris draw depth fighting. Do not touch single-layer avatar models.
- For high-poly face materials with a real albedo map, use a moderately clamped alpha cutoff, polygon offset to reduce coincident triangles, front-face rendering and depth write.
- Improve texture-backed transparent hair, brow and lash depth alpha tests, without replacing their original color or roughness and without fabricating new geometry.
- Clone changed materials on the already-cloned skeleton. Preserve original shared glTF cache materials, all user attachments and non-MPFB imported/featured avatars.
- Allow visual A/B comparison in the library with a **real rendered original**, not an image mock. Default ON only for verified pinned assets and leave all other GLBs untouched.
- Expose real correction counts, including zero counts if some mesh types do not occur. Do not claim texture upscaling or unseen beauty improvements.

## QA

Bun tests verify exact URL allowlisting, conditionally hidden overlays, faithful PBR values/maps, untouched base materials and safe original-image comparison. Python GLB audit records all real GLB mesh names/overlay metadata. Browser smoke checks A/B toggle and real WebGL and local copy flows for MPFB candidates. CI screenshots remain optional due to SwiftShader limitations.

These changes improve depth/alpha presentation of existing art. They are not a substitute for source model mesh/texture authoring or a professional art director's comparison to the reference images.
