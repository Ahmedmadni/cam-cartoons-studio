# Professional 2D Cut-out Character Pack — Production Contract

## Art direction
The intended style is **stylized semi-realistic cartoon illustration** matching the user's supplied yellow-shirt presenter reference. Do not substitute simple circles, ellipses, or detached geometric avatars. Art must have clear anatomical landmarks, connected joints, intentional shading and consistent lighting.

## What the new rig actually does

The 2D rig has independent **head/neck, left/right shoulder, elbow, wrist** rotations, animated eye openness / brows and mouth switching, with two editable keyframes (start and end of each scene). It renders the same joint coordinates through `renderSocialFrame` during live preview and WebM export. Speech amplitude drives approximate mouth openness, **not phoneme-level lip sync**.

**The original low-resolution Sami reference is ONE flattened raster.** Without a properly drawn layered body pack, it will remain a static illustration. The slider UI retains pose values, but it explicitly reports that independent animation requires transparent parts.

## File format and dimensions

- Start with a **composite `base`** PNG/WebP showing the complete character as a reference (JPEG allowed for base only).
- Supply the **8 required art layers**:
  `torso`, `head`, `leftUpperArm`, `leftForearm`, `leftHand`,
  `rightUpperArm`, `rightForearm`, `rightHand`.
- All eight layers MUST be PNG or WebP with real transparency, using the **same full-frame dimensions as `base`**. Never tightly crop individual arms, hands, mouth or head. Transparent empty margins preserve the shared coordinates.
- For the same cut-out art style, optionally supply: `mouthClosed`, `mouthOpen`, `eyesOpen`, `eyesHalf`, `eyesClosed`, `browsNeutral`, `browsRaised`. Each overlay occupies the identical full-frame canvas, with only its intended facial region visible.
- Recommended source art: 1952×2576 px (4× the renderer's 488×644 character viewport). Up to 16 megapixels and 8 MB per layer; optimize alpha WebP to respect storage limits.
- The head file should not permanently paint an open mouth or both open eyes **if** these facial features are provided as interchangeable overlays. Otherwise those base features will appear underneath the animated overlays.
- Draw shoulders, sleeves and hands with a small, natural **overlap** at each joint to hide mechanical gaps during rotation. For wide motions, prepare additional artist-drawn sleeve/hand variations as a later enhancement.

## Default joint locations

Normalized coordinates within each source layer:

| Pivot | X | Y |
| --- | ---: | ---: |
| neck | 0.50 | 0.50 |
| leftShoulder | 0.31 | 0.57 |
| leftElbow | 0.24 | 0.75 |
| leftWrist | 0.20 | 0.88 |
| rightShoulder | 0.69 | 0.57 |
| rightElbow | 0.76 | 0.75 |
| rightWrist | 0.80 | 0.88 |

These are **calibration defaults, not the actual joint coordinates of any uploaded painting**. The user can adjust them in **المفاصل > ضبط نقاط ارتكاز العظام** until the anchors line up with the artist's anatomy.

## How to animate one scene

1. Select a scene, select the character in **الشخصيات**, upload its composite base and eight aligned layers.
2. In **المفاصل**, confirm **طبقات الحركة مكتملة**.
3. Select **أول المشهد** and choose a pose, for example **وضع طبيعي**.
4. Select **آخر المشهد**, choose **ترحيب باليد**, and refine the shoulder, elbow, wrist and head sliders.
5. Use the **محرر المعاينة** to play the scene, then export. The joint angles are interpolated linearly from start to end; audio/scene transitions use the same production timeline.
6. Scene JSON stores rig angles, pivots and keyframes. Raster layers remain in local IndexedDB and **are NOT bundled into JSON**. Keep original artwork files for migration/backups.

## Known limitations and next art work

- This implementation is an **upper-body** hierarchy. There are no knee, ankle, hip or leg rigs yet; do not advertise full-body motion.
- It cannot infer skeletons or separate arms from a merged reference portrait. Professional, properly segmented art still needs to be created and uploaded.
- Mouth currently switches between artist-supplied open/closed drawings. Additional A/E/O/M-B-P viseme assets and speech-to-viseme alignment are a separate planned step.
- Export is WebM 720×1280 or 1080×1920 depending on the browser. MP4, automated voice synthesis and remote collaboration are not provided here.
- Actual illustration quality requires **manual visual review** of pose extremes and movement across frames. Passing TypeScript and browser tests verifies operation only.


## Built-in first illustrated master

Sami ships with a complete, original, **15-layer** upper-body vector pack. Eight parts are torso/head and both upper arms, forearms, and hands; seven additional layers cover mouth (2), eyes (3), eyebrows (2). The browser rasterizes the bundled vectors at 976×1288 px. The low-resolution user reference is only used as a fallback on unsupported devices. The other three characters still require dedicated layered artwork.

The first-party vectors are bundled and trusted; SVG uploads from the public remain disabled. Your own uploaded raster art overrides the built-in package without replacing saved scenes and narration.

Preview and export must remain visually identical. Mouth animation follows voice energy (not phoneme-level speech analysis). Large extreme joint angles may still benefit from extra artist-authored sleeve overlap variants.
