# Character Artwork: Reference-Grade Illustrated Asset Packs

## What changed

The default Sami character now renders an **illustrated cutout extracted from the user's
own reference image** rather than the connected shape-based Canvas rig. This is a
low-resolution artistic **proof of direction** and is not yet a final scalable full-HD
master. The three other built-in characters still use the legacy vector fallback
unless a full illustration is imported.

The app now accepts one cohesive character illustration (PNG / WebP / JPEG),
then optional transparent aligned **mouth-closed, mouth-open, eyelids-closed**
layers. It uses the *same images* in the editor thumbnails, storyboard preview
and offline WebM compositor. Every file is stored in IndexedDB in this browser;
no upload to Lovable, login, or Supabase is required.

## Professional art pack specification

Per character, create:

- \`base.png\`: a **fully illustrated contiguous head, neck, shoulders, clothing
  and arms** with transparent background; body parts must never be disconnected.
- \`mouthClosed.png\`: transparent canvas with a locally opaque face patch and
  correct *closed-mouth* illustration. The patch must **cover the open mouth** on
  the base image; do not make just a thin line that leaves the old mouth visible.
- \`mouthOpen.png\`: same anchor/patch method, open mouth.
- \`eyesClosed.png\`: optional eyes-closed patch that covers the eyes in the base.
- All four files must have **exactly identical pixel dimensions** and transparent
  alignment. Use mouth layers with coherent jaw contours, not floating ovals.
- Production quality: 2048px or larger vertical canvas, PNG/WebP with transparent
  background and commercial-use rights. Avoid very large decoded files on phones.
- Ensure all poses maintain head–neck–collar and shoulder–arm continuity.
- Reference art direction: clean semi-realistic editorial 2D cartoons, sculpted
  face/jaw/ears, coherent hairstyle locks, detailed eyelids and iris, subtle
  shadow planes, realistic hand anatomy, and no chunky geometric primitives.

## How to use

1. Open the home studio and choose **الشخصيات**.
2. Select a character (Sami, Layla, Omar, Nour).
3. In **أصول الشخصيات المرسومة** upload **الرسم الأساسي المتكامل**.
4. Optionally upload the aligned mouth and closed-eye PNG layers. Layers are
   *not* required if the project needs just a moving illustrated bust.
5. Narration and background controls remain the same. Mouth swaps are
   selected from PCM volume, **not phoneme or word timing**.
6. Export WebM after checking the render visually at the chosen resolution.

An imported still portrait has subtle unified-body movement, **not real hand
animation or lip sync** unless the artist provides expression layers. The previous
vector model is used as fallback when no illustration exists; the editor never
pretends the artist's image is a true puppet rig.

## Data, constraints and compatibility

- Files are checked for PNG/WebP/JPEG MIME (base only; overlay needs PNG/WebP),
  a maximum of 8MB each and 48px minimum / 16MP maximum decoded dimensions.
- When changing the base illustration, previously uploaded expression layers
  are invalidated and deleted to prevent wrong face-anchor overlays.
- Uploaded artwork persists locally in IndexedDB. The bundled Sami sample is
  available without any network request. Returning to default for Sami restores
  the reference sample.
- JSON project backups currently **do not include images**. Clearing browser data
  removes imported artwork. Preserve original PNG/WebP files independently.
- The bundled owner-supplied source is only ~143px wide after background
  extraction, and cannot truthfully be described as high-resolution artwork.
  Replace it with an original high-res layered art master for professional exports.
- The exact art style and motion quality require visual checks; green CI alone
  confirms only encoding, persistence, layout and functional rendering.

## Next release for high-quality cartoon animation

1. Produce 4 professionally designed HD characters, with isolated head/hair,
   face/eyes, upper/lower lips, tongue, arms and poses from one consistent artist.
2. Implement rig metadata and transform origins for a proper 2D puppet engine;
   avoid static-object scaling as a replacement for limb rigging.
3. Add time-aligned Arabic viseme/phoneme mouth curves, then hand gestures.
4. Add editable local backup archives containing images/audio, plus H.264 MP4
   export and device compatibility matrix.
