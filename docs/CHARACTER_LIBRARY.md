# Open Character Library — Phase 9

## Design

Character selection is no longer an enum of \`boy | girl | man | woman\`. Each library entry has its own ID, display name, category, provider, GLB URL, thumbnail URL, voice preset, tags, favorite flag and scale/vertical position. The four former characters ship as removable backwards-compatible seeds and procedural fallback models.

## Adding a Premium character

1. Open the Character Library home page and choose **إضافة شخصية**.
2. Select **Premium GLB**. Enter an HTTPS direct \`.glb\` URL or a deployed same-origin path such as \`/models/character.glb\`.
3. Optionally set a preview image (\`.webp\`, \`.avif\`, \`.jpg\` or \`.png\`), voice preset, tags and category.
4. Adjust model scale and vertical position for framing. Save and select to preview with lighting, animation and storytelling.

The GLB must allow cross-origin browser requests and use a rig that the existing animation adapter recognizes. Generic GLBs may not have compatible bones or morph targets; those models still render but some expressions/animations may not work. The procedural model is a fallback if loading fails.

## Providers

- **Imported GLB** is the primary path for external premium 3D characters.
- **Ready Player Me** remains an independent provider; the in-app creator is still available under Customize.
- **Procedural** is a compatibility/fallback source.

## Current storage & compatibility

Entries, favorites, and definitions persist in **this browser's local storage** using the \`cam-cartoons-character-library-v1\` key. The prior \`cam-cartoons-avatar-customizations-v1\` key remains untouched so legacy personalizations continue to load. Browser cache resets, different devices, and private tabs do not share entries. Model binaries are not uploaded or permanently hosted by the app yet: use stable hosted URLs. Do not describe this as cloud sync, upload storage, or a bundled premium-model asset pack.

## Acceptance checks

- Add multiple imported GLB entries without replacing or renaming the four seeds.
- Search, filter, favorite, rename, edit, delete; reload the page and confirm persistence.
- Select imported GLB and confirm the model appears on the CharacterStage; test Story and Studio.
- Confirm any custom voice preset is selected with that character.
- Test a CORS-blocked or missing GLB: fallback should appear rather than a crashing page.
- Test skeleton bone naming, ARKit mouth/eyes/blinks, camera scale and skin/cloth materials for each imported model.


## Phase 10 — Premium presentation

- The old bug where a new GLB-backed entry (missing a stored render-mode key) silently used the procedural fallback is fixed. New entries default to \`auto\` mode.
- Loaded GLBs are automatically centered and fitted to the studio frame from their measured bounding box, with width/height/depth safeguards. The **Scale** setting in the character editor is an extra multiplier applied after automatic fit. The Y Offset continues to move the character vertically.
- Imported models have subtle idle head movement and automatic eye blinking when camera-based face tracking is disabled. When tracking is active, these procedural movements do not compete with MediaPipe face movement.
- The selected character panel now reports load errors and model diagnostics: source dimensions, bone count, morph count, head and arms, basic lip-sync and eye-blink capability.
- Select a loaded GLB and use **التقاط صورة معاينة من النموذج** to save a WebP portrait captured from the real 3D canvas. Captures are bounded (300 KB data URL) and stored with the character in this browser's local storage. Browser GLB textures should be loaded from CORS-enabled sources.
- Rendering stays compatible with older Ready Player Me models and legacy avatars.

**Important:** This update does not ship any new premium GLB geometry or guarantee that every imported skeleton is compatible. The diagnostics show what the model exposes; per-character animation and visual quality still require real-world model testing. Cloud asset upload and cross-device sync are not included.
