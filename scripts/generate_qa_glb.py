#!/usr/bin/env python3
"""Build a tiny real glTF 2.0 mesh as an ephemeral browser QA fixture.

Not a premium avatar or distributable production asset. The generated file stays
in the CI checkout only and is not committed as a binary model.
"""
import json
import struct
from pathlib import Path


def main():
    out = Path("public/__qa__/model.glb")
    out.parent.mkdir(parents=True, exist_ok=True)
    # Real 3D body geometry (0.9 x 1.8 x 0.5), 8 vertices, 12 triangles.
    vertices = [
        (-0.45, 0.0, -0.25), (0.45, 0.0, -0.25),
        (0.45, 1.8, -0.25), (-0.45, 1.8, -0.25),
        (-0.45, 0.0, 0.25), (0.45, 0.0, 0.25),
        (0.45, 1.8, 0.25), (-0.45, 1.8, 0.25),
    ]
    triangles = [
        0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7,
        0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
        3, 7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4,
    ]
    packed = struct.pack("<24f", *(axis for vertex in vertices for axis in vertex))
    packed += struct.pack("<36H", *triangles)
    assert len(packed) == 168
    gltf = {
        "asset": {"version": "2.0", "generator": "cam-cartoons-ci-fixture"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "CITestAvatar"}],
        "meshes": [{"primitives": [{
            "attributes": {"POSITION": 0}, "indices": 1, "material": 0
        }]}],
        "materials": [{"pbrMetallicRoughness": {
            "baseColorFactor": [0.35, 0.68, 0.88, 1],
            "metallicFactor": 0, "roughnessFactor": 0.85
        }}],
        "buffers": [{"byteLength": len(packed)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": 96, "target": 34962},
            {"buffer": 0, "byteOffset": 96, "byteLength": 72, "target": 34963},
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": 8,
             "type": "VEC3", "min": [-0.45, 0.0, -0.25], "max": [0.45, 1.8, 0.25]},
            {"bufferView": 1, "componentType": 5123, "count": 36, "type": "SCALAR"},
        ],
    }
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((-len(js)) % 4)
    packed += b"\0" * ((-len(packed)) % 4)
    length = 12 + 8 + len(js) + 8 + len(packed)
    out.write_bytes(
        struct.pack("<III", 0x46546C67, 2, length)
        + struct.pack("<I4s", len(js), b"JSON") + js
        + struct.pack("<I4s", len(packed), b"BIN\0") + packed
    )
    print(f"Generated {out} ({length} bytes)")


if __name__ == "__main__":
    main()
