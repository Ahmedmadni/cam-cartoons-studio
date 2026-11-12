# 2D Character Art Direction — Required Production Standard

## Reference and failure diagnosis

Owner-provided style reference: a clean, expressive young cartoon presenter in a yellow shirt, with **cohesive hand-illustrated anatomy**, swept hair, subtle layered shading, natural eyes, and connected shoulders/neck/arms. The previous procedural characters looked geometric because head, ears, neck, hands and sleeves were drawn as independently positioned shapes and the joins were visible.

## Acceptance criteria for production-ready characters

1. Every person has **one coherent silhouette** across the lower face, neck, collar, shoulders and sleeves at every allowed pose. No floating ears, hands or parts.
2. Head/hair and eyes are intentionally art-directed: clean asymmetry, consistent light direction, expressive brows, natural lip silhouettes, readable features at phone size.
3. All four characters appear consistently illustrated, without a mixture of flat icons and shaded semi-realism.
4. The same image must appear in the character picker, storyboard preview and exported video. All 5 expressions and 4 motions must be reviewed at **720x1280** and **1080x1920**.
5. Hand poses must remain anatomically continuous when waving/explaining. Hair and clothing must not intersect face, glasses, hands or subtitle plates unnaturally.
6. Characters should remain readable against all six supported backgrounds, with caption/titles never covering the face.

## Technical implementation already improved

The new code-drawn rigs in `src/lib/socialCharacterRig.ts` use curved cubic Bezier silhouettes for faces, ears, hair, torso and sleeves. Neck and collar layers overlap correctly. This reduces fragmented geometry but **is not a substitute for fully professionally illustrated cartoon assets** in the owner’s reference style.

## Preferred next art-pipeline step

Use **artist-created layered character assets** with commercial usage rights for each character rather than reintroducing shape-assembled bodies. The deliverable for each character should include:

- Transparent SVG or lossless PNG render at no less than 2048px for final HD quality
- Body/garment and head/hair layers with a documented transform origin
- Eyelids (open, half, closed), eyebrows (at least 5 expressions), optional head tilts
- Mouth sets with neutral, smile, A, E, O, U, M/B/P and teeth/tongue visibility; record each mouth shape’s anchor
- Attached arm and hand poses (idle, explain, point, wave, thinking), keeping shoulder connections natural
- Layer metadata / manifest for mouth origin, eye origin, hand pivot and safe bounding boxes, so export and live preview use identical registration
- Four independent character designs that share the same art direction; not skin-/palette-swapped copies of one face

**Do not claim precise lip sync** without speech analysis/forced alignment. Current audio-envelope-driven animation still selects approximate mouth poses.

## Required review gate

Use the Chromium screenshot artifacts from `scripts/browser_social_smoke.py` plus manual high-resolution review of all four figures. TypeScript tests confirm correct behavior, **not artistic quality**. Do not treat a green CI run alone as approval of illustration quality.
