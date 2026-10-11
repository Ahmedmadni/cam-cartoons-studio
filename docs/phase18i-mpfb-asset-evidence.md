# Phase 18I — Real additional MakeHuman/MPFB source with objective asset evidence

## Source and provenance
- **نوران** is one optional model candidate from `met4citizen/TalkingHead`, the original `avatars/mpfb.glb` at immutable source commit `b3e277b3b46f88e557bf28a2c5612a5b04e075c3`.
- 36,815,920 bytes (~35.1 MiB). Upstream describes this exact `mpfb.glb` as a Blender/MPFB example under **CC0**; other upstream example avatars have different licensing and are **not** reused.
- Source: https://github.com/met4citizen/TalkingHead/blob/b3e277b3b46f88e557bf28a2c5612a5b04e075c3/README.md
- The source demo labels its MPFB avatar with feminine body type; the Arabic alias is editable after import.

## Implementation
A real full-body 3D avatar is added as an **opt-in** art candidate, without changing the existing 9 auto-seeded characters or saved user imports. It is **not** copied into the app bundle: only users who select it download the larger source. The existing on-device GLB cache remains available.

The binary audit now measures **real accessor-based triangle/vertex totals and embedded texture payload bytes**. These are technical properties, **not proof of beauty**. The actual runtime GLB loader remains the source of truth for lipsync, blink, jaw and rig compatibility. Gallery clearly warns about mobile bandwidth, memory and CPU/GPU implications and keeps candidate art approval manual.

CI validates the real binary through both structural parser checks and an isolated WebGL browser fixture in a fresh context, along with the five existing candidates and five original featured sources. The six-view art review screen and real capture button can then compare geometry, irises, hair and fabrics.

## Limitation
This step introduces an actual independent, different character model. It **does not** re-author the mesh or assert similarity to the user's cinematic reference photos. Exact art approval and custom facial/hair retopology remain next-stage manual artistic work.
