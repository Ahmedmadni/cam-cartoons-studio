# Phase 18 — Visual inspection and composition

The Phase 17 GLB technical checks do not grade artistic realism. This update extends the **actual in-app WebGL preview** with repeatable front / three-quarter / profile camera viewpoints, and all eight existing local AVIF scene backgrounds. The default photographic backdrop follows the selected lighting style, including the WebP capture composite. The review Canvas is taller for facial and fabric inspection.

## Scope and regression guarantees

- Angle and backdrop choices are transient review settings on the character-library page. In review mode, stopping the turntable smoothly returns the avatar to forward-facing orientation before repeatable comparisons. They do **not** modify the stored character definition, camera/animation logic for stories, avatar customizations, favorites, names, imported binaries or deleted character IDs.
- Framing and three-point lighting from Phase 17 remain available. The existing GLB rig, materials and textures are preserved: changing the backdrop cannot be misrepresented as improving mesh geometry.
- Backgrounds are from `public/backgrounds/premium/` and ship with the app. Featured GLB geometry continues to load from the upstream host unless the user saves an IndexedDB copy.
- Tests cover camera angles and local background paths. The existing Chromium smoke suite remains responsible for real WebGL/CORS behavior.

## Required manual artistic QA before release

1. Photograph the *actual GLB* of each character from front, three-quarter and profile in matching portrait framing with rotation disabled.
2. Compare face topology, eye materials, hair strand/silhouette, garment topology, skin shading, and any clipping to the user's reference portraits. Record issues per character and avoid claiming equivalence before human approval.
3. Repeat with natural and dramatic lighting, then check mobile framerate and the captured WebP versus the visible Canvas.
4. Test portrait-only ريم without treating her as a full-body model; test هند without claiming mouth/viseme compatibility.

No new third-party GLB assets, retexturing, ARKit visemes or geometry improvements are claimed in this stage. They remain subsequent art-production tasks.
