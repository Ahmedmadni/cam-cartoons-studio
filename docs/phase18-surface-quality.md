# Phase 18B — Surface clarity & genuine PBR diagnostics

This update improves display sharpness of **existing authored GLB texture maps** through GPU-bounded anisotropic texture sampling, rather than painting arbitrary color/metalness onto every mesh. The previous unconditional mutation of each GLB material's `envMapIntensity` to 0.75 is removed. A fourth, broad softbox lighting recipe exposes fine facial and fabric detail under less aggressive highlights.

The in-app report now inspects actual geometry and material resources: approximate triangle count, distinct texture maps, known texture resolutions, low-resolution map flags, PBR materials, normal-mapped materials and enhanced texture samplers. None of these metrics is a visual similarity score.

- Texture sampling respects the renderer's reported maximum, is capped at 8x, skips deliberately nearest-sampled texture art and never changes base color, roughness, metalness, normal strength or topology.
- No avatar selection, user data, favorites, custom names, saved imports or deleted asset entries are migrated or overwritten.
- Existing five original GLB URLs and original full-body story camera remain unchanged.
- Missing maps do not necessarily mean an invalid model (vertex colors/procedural shader models can be intentional).
- Visually verifying skin, eye shading, facial silhouette, hair strands and garment contours against the user's image references remains an outstanding **artist review**, not something code-level regression tests can certify.
