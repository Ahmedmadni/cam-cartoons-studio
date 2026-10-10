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


## Phase 14 — Adaptive camera & browser QA

- The camera now derives distance from each loaded GLB's measured dimensions, normalized display scale, actual viewport aspect ratio, perspective FOV and mesh depth. Wider rig poses and portrait-mode screens get extra camera distance, reducing cut-off arms/heads.
- The camera targets the actual vertical center of the normalized character, preserving the character's configured ground offset. On a procedural fallback or GLB error the camera returns to its original framing.
- The selected character panel offers quick real-time checks for idle, waving, happy, nodding and dancing, plus an independent rotation toggle. These animation controls change the **preview**, not global Story/Studio settings.
- A pure test suite checks responsive framing on narrow/mobile, tablet and desktop aspect ratios, depth, invalid bounds and failures.
- GitHub Actions additionally generates a **tiny synthetic GLB test fixture** (not a production avatar), starts the actual app in Vite and runs Chromium with WebGL enabled. It asserts GLB load diagnostics, tests review controls, records mobile and desktop screenshots, imports the GLB file into IndexedDB and verifies that the character reloads successfully.
- The CI run always uploads Vite logs under the **model-review-screenshots** artifact. WebGL screenshots are **optional**: set `MODEL_QA_CAPTURE=1` on a workstation with a capable GPU for desktop/mobile capture. GitHub-hosted SwiftShader runners sometimes stall indefinitely on framebuffer readback, so screenshots are disabled by default there; the actual GLB and IndexedDB functional checks remain mandatory.

**Important distinction:** The local synthetic fixture tests the WebGL pipeline and storage. It is **not** a cinematic-quality avatar and does not certify that the four third-party-hosted real models match the visual references. Real assets still require separate per-character browser visual QA, stable source/permissions review and potentially improved rig/speech adapters.


## Phase 15 — Real-source GLB audit and truthful animation report

We now distinguish four things that were often conflated:

1. **A valid GLB link**: an HTTPS address in the character catalog. A link alone does not prove the file is downloadable.
2. **A genuine GLB binary**: the source responds with a binary glTF 2.0 model with valid header, chunk boundaries, JSON and POSITION geometry.
3. **Animation/face compatibility**: actual skinned meshes, bones, materials, embedded animation clips, mouth morphs and blinking morphs. A GLB with a visible mesh is not automatically a talking character.
4. **Visual/artistic quality**: similarity to the supplied reference images, realistic face/hair/clothes, proper skin/hair shading and convincing expressions; **not** measurable from structural metadata alone.

### Automated validation

Run:

- \`python -m unittest discover -s scripts -p 'test_featured_glb_audit.py'\`: local deterministic malformed/valid GLB tests
- \`python scripts/audit_featured_glbs.py --live\`: fetch the four hosted models and write the actual availability, Content-Type, CORS header, size, SHA256, meshes, skins/joints, morph target names, materials, textures and animation clips to \`artifacts/model-review/featured-asset-audit.json\`
- \`python scripts/audit_featured_glbs.py --live --download-tests\`: same audit plus temporary downloaded GLBs under \`public/__qa__/featured\` for the Chromium smoke tests

GitHub Actions runs all three parts of the quality gate: deterministic binary inspection, independent hosted-asset audit, and actual Three.js WebGL rendering of every verified publisher-hosted model alongside its always-required synthetic fixture.

**Caveat:** External hosting is subject to upstream outages, so the live audit records unavailable/invalid models clearly without making a transient network outage fail otherwise healthy local regression tests. If upstream models are unavailable, the browser checks of those models cannot run and must not be reported as passed. This workflow does not establish whether the third-party source permits commercial redistribution. Browser CORS may still differ from server-side network fetch.

### In-app GLB compatibility report

When a real GLB loads, the library now reports skinned mesh count, mesh count, material count, bone count, morph targets, source animation clips, and whether known face/arm/head drivers are available. It identifies **fully compatible**, **partially compatible**, and **static display-only** cases. The category is compatibility, *not* a claim of premium artistic quality or automatic lip-sync on an arbitrary model.

The report uses the same names as the users see: سارة، عمر، ليلى، هند. All preexisting custom character names and IndexedDB model imports are preserved.


## Phase 16 — Direct-origin CORS and face-driver verification

A valid GLB binary hosted by another site is not necessarily accessible from the user's browser. This phase adds two distinct browser tests:

- The **فحص رابط GLB وCORS** button makes a real cross-origin \`fetch\` from the visitor's own browser using \`mode: "cors"\`, no credentials, and an HTTP \`Range: bytes=0-11\` request. It verifies the GLB 2.0 header and declared length. The streamed response is canceled as soon as its 12-byte GLB header has been read; the incomplete response is never retained as the model cache. A failed check identifies network/CORS ambiguity without claiming which is definitely responsible.
- Chromium CI selects all four real featured characters, verifies their original third-party URLs can be fetched with CORS, and waits for the **actual Three.js GLTFLoader** diagnostics on those remote URLs. Results are saved to \`artifacts/model-review/browser-origin-check.json\`. This is separate from the already-existing local-copy GLB tests.

The silent **تجربة حركة الفم** preview animates the compatible mouth blend shapes inside the Character Library only; it never changes the global face-tracking state, story voice, or recorded audio, and is disabled when a model lacks compatible mouth morphs (e.g. \`هند\`).

Both facial morph capability detection and live expression driving now use the same central alias table for mouth, blink, brow, and eye movement. Therefore a morph target that is called "supported" by the diagnostics is actually recognized by the renderer.

**Limitations:** Passing remote CORS means these links worked from the tested browser origin at that time. It cannot guarantee future remote uptime, commercial redistribution rights, or reference-level character appearance. The embedded/mouth tests are technical checks, not realistic lip-sync evaluation with audio.
