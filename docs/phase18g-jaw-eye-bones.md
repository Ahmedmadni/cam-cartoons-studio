# Phase 18G — MPFB jaw and eyeball motion from real joints

The three newly imported MakeHuman/MPFB GLBs have body skeletons rather than compatible ARKit face morphs. The original upstream PrivacyPuppet rendering code specifically recognizes the skeleton's `jaw`, `eye.L` and `eye.R` bones. Previously our studio completely ignored these.

## Implemented

- Detect **exact** humanoid bone names, not eyelid, brow or an unrelated mesh. Rig capability is evaluated after real GLTFLoader scene mount.
- Drive jaw opening through the actual `jaw` bone and horizontal/vertical gaze through both actual eyeball bones, preserving each avatar's non-identity bind quaternion, using limited local angles and frame-rate-independent smoothing.
- Never activate jaw-bone motion when a compatible speech morph already controls the same feature. Never double-drive gaze when look morphs are present. No imaginary eyelid/blink and no fake lip visemes.
- Head and body motions remain unchanged. Preview of bone jaw is explicitly **"تجربة حركة الفك"**, while ARKit/Oculus morph preview remains **"تجربة حركة الفم"**.
- Facial readiness clearly differentiates a physical jaw and eye bones from speech lipsync and blink. A surprised expression can open a real jaw when supported, even without face morphs.
- Both local Bun tests (bone IDs, bounded rotations, independent rest-quaternions and restoration) and CI real GLB metadata/browser checks guard against false positive capabilities.

## Limits

Bone jaw opening is a mechanical preview only, **not audio-aligned speech**, and gaze rotation is not a substitute for eyelid motion. Cinematic facial refinement still requires high-quality geometry/texture assets and appropriate corrective morphs. The original GLBs are never modified or re-exported. No additional binary weight is added to the application bundle.
