# Phase 12 — Real GLB character starter gallery

The app now seeds four **actual, third-party-hosted GLB models**, not procedural shapes or 2D mockups:

| ID | Arabic label | Upstream model | Notes |
|---|---|---|---|
| \`featured-cinematic-female\` | سارة | \`realistic-female.glb\` | Semi-realistic female base |
| \`featured-cinematic-male\` | عمر | \`realistic-male.glb\` | Semi-realistic male base |
| \`featured-selfie-girl\` | ليلى | \`selfie-girl.glb\` | Stylized girl avatar |
| \`featured-michelle\` | هند | \`michelle.glb\` | Animated sample avatar |

All four URLs point to \`https://three.ws/avatars/\`, which publishes these exact GLB assets in its public [GitHub repository](https://github.com/nirholas/three.ws/tree/main/public/avatars) and documents their rigged-avatar usage. Our source links refer to the originating host; we do not copy or redistribute model bytes in this repository, and their existence in the open-source project should **not** be treated as a separate guarantee of license rights for each model.

**Important visual scope:** These are first real model integrations to validate the runtime and improve upon procedural placeholders. We have not established that their styling matches the user's reference images, nor have we visually inspected every asset in the deployed browser. A final professional-character library still needs curated artwork, distinct portraits, hair/clothing evaluation, and per-model animation/viseme QA.

## Upgrade behavior

- Fresh browsers see the original four procedural fallback entries plus these four real GLB entries (8 total).
- Existing browsers upgrade the old persisted \`cam-cartoons-character-library-v1\` data **once** using Zustand version 1 migration. It preserves local additions, deletions, renamed entries, and favorites, and appends the four new entries only if their IDs are not already present. Subsequent reloads preserve user deletions.
- The app does not use the retired Ready Player Me creator service for any of the new entries.

## Use a real model

1. Open the Character Library and choose one of the new imported entries (the premium cards are sorted above procedural fallbacks).
2. Let the 3D stage load. Review the rig diagnostics for head/arms, morph target counts, lip sync and blink compatibility.
3. To keep a copy on this browser, click **حفظ الشخصية على هذا الجهاز** in the selected character panel. A bounded CORS fetch downloads the real GLB (up to 60 MiB), verifies the glTF 2.0 header and stores the binary in IndexedDB.
4. After that, the selected entry uses the local bytes for Story, Studio and Customize. No cloud synchronization is implied. Use **التقاط صورة معاينة من النموذج** to replace the card's placeholder with a WebP portrait from the actual 3D canvas.

If the publisher disables cross-origin requests, is offline, or moves the URL, the app explains the failure. Use the GLB file import in the editor to keep a separate known-good local copy. Content is not guaranteed offline until successfully cached.

## Licensing, availability & QA

- Upstream source code: https://github.com/nirholas/three.ws
- Model sources: \`public/avatars/{realistic-female,realistic-male,selfie-girl,michelle}.glb\`
- This implementation **links** to publisher-hosted assets rather than bundling their binary geometry, and therefore depends on availability/CORS unless the user caches a local copy.
- Attribution and redistribution permissions must be confirmed for any separate offline distribution of those files.
- Verify in a real browser: GLB renders instead of fallback, each screenshot is actually the chosen model, motion bones don't twist, morph targets match the diagnostic report, animations work in Story and Studio, CORS permits caching, refresh retains IndexedDB models, and browser-storage resets produce the expected notice.
- Re-render/crop portraits only after the actual 3D models load; do not mistake generic emojis or unrelated photographs for real character thumbnails.


## Phase 13 — Clear Arabic names and safe migration

The character-library cards use short, familiar **human names**, not placeholder descriptions or technical labels. Character age/category and GLB provider stay visible as separate metadata.

| Stable ID | Previous stock label | New display name |
|---|---|---|
| boy | ولد | يوسف |
| girl | بنت | نور |
| man | شاب | أحمد |
| woman | فتاة | مريم |
| featured-cinematic-female | مايا — شخصية سينمائية | سارة |
| featured-cinematic-male | آدم — شخصية سينمائية | عمر |
| featured-selfie-girl | لينا — استايل ثلاثي الأبعاد | ليلى |
| featured-michelle | ميشيل — شخصية متحركة | هند |

The version 2 library migration updates an entry **only when its name still exactly equals the earlier stock name** and \`isDefault\` is true. It never renames user-created characters, overwrites personally edited names, or resurrects deleted entries. Favorite status, local GLB asset IDs, thumbnails, source URLs and customizations stay unchanged. IDs deliberately remain stable for Story and Studio compatibility.
