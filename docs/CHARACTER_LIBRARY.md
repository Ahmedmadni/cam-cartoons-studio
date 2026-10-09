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
