#!/usr/bin/env python3
"""Inspect *actual* featured GLB binaries instead of treating successful builds as visual QA.

No new model assets are shipped. In CI this records upstream availability and
model anatomy; external networking cannot be made a deterministic merge gate.
Run: python scripts/audit_featured_glbs.py --live
     python scripts/audit_featured_glbs.py public/__qa__/model.glb
"""
import argparse
import hashlib
import json
import re
import struct
import sys
import urllib.error
import urllib.request
from pathlib import Path

MAX_BYTES = 32 * 1024 * 1024
FEATURED_SOURCE = Path("src/lib/characterLibrary.ts")
CANDIDATE_SOURCE = Path("src/lib/curatedCharacters.ts")
OUTPUT = Path("artifacts/model-review/featured-asset-audit.json")
GLB_MAGIC = 0x46546C67
JSON_TYPE = 0x4E4F534A
BIN_TYPE = 0x004E4942


def parse_glb(data: bytes) -> dict:
    if len(data) < 20:
        raise ValueError("GLB too short")
    magic, version, total = struct.unpack_from("<III", data, 0)
    if magic != GLB_MAGIC or version != 2 or total != len(data):
        raise ValueError("Invalid GLB header/version/declared length")
    pos = 12
    chunks = []
    while pos < total:
        if pos + 8 > total:
            raise ValueError("Truncated GLB chunk header")
        length, kind = struct.unpack_from("<II", data, pos)
        pos += 8
        if length % 4 or pos + length > total:
            raise ValueError("Invalid GLB chunk padding or boundaries")
        chunks.append((kind, data[pos:pos + length]))
        pos += length
    if not chunks or chunks[0][0] != JSON_TYPE:
        raise ValueError("First GLB chunk must be JSON")
    if any(kind not in (JSON_TYPE, BIN_TYPE) for kind, _ in chunks):
        raise ValueError("Unsupported GLB chunk type")
    gltf = json.loads(chunks[0][1].decode("utf-8").rstrip(" \x00"))
    if not isinstance(gltf, dict) or gltf.get("asset", {}).get("version") != "2.0":
        raise ValueError("Missing glTF asset 2.0 metadata")
    if not isinstance(gltf.get("meshes"), list) or not gltf["meshes"]:
        raise ValueError("GLB contains no mesh geometry")
    return gltf


def inspect_glb(data: bytes) -> dict:
    g = parse_glb(data)
    nodes = g.get("nodes", [])
    skins = g.get("skins", [])
    joints = {index for skin in skins for index in skin.get("joints", [])}
    joint_names = [nodes[i].get("name", "") for i in sorted(joints)
                   if isinstance(i, int) and 0 <= i < len(nodes)]
    meshes = g.get("meshes", [])
    primitives = [p for m in meshes for p in m.get("primitives", [])]
    if not primitives or not any("POSITION" in p.get("attributes", {}) for p in primitives):
        raise ValueError("Meshes have no accessible POSITION attributes")
    morph_count = max((len(p.get("targets", [])) for p in primitives), default=0)
    morph_names = sorted({
        str(name) for mesh in meshes for name in
        mesh.get("extras", {}).get("targetNames", [])
    })
    if not morph_names:
        morph_names = sorted({
            str(name) for node in nodes for name in node.get("extras", {}).get("targetNames", [])
        })
    names = [re.sub(r"[^a-z0-9]", "", name.lower()) for name in morph_names]
    return {
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "mesh_count": len(meshes),
        "primitive_count": len(primitives),
        "skins": len(skins),
        "joints": len(joints),
        "joint_examples": joint_names[:18],
        "material_count": len(g.get("materials", [])),
        "texture_count": len(g.get("textures", [])),
        "image_count": len(g.get("images", [])),
        "animation_count": len(g.get("animations", [])),
        "morph_count": morph_count,
        "morph_names": morph_names[:48],
        "likely_lipsync": any(s.endswith(("jawopen", "mouthopen", "visemeaa"))
                             for s in names),
        "likely_blink": any(s.endswith(("eyeblinkleft", "eyeblinkright", "eyesclosed"))
                            for s in names),
        # A rig can have no face morphs. Don't label this as "speech ready".
        "body_rigged": bool(joints),
    }


def read_limited(url: str, timeout: int = 22) -> tuple[bytes, dict]:
    if not url.startswith("https://"):
        raise ValueError("Only HTTPS model hosts are permitted")
    req = urllib.request.Request(url, headers={"User-Agent": "CamCartoonsStudioAssetQA/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        size_header = res.headers.get("Content-Length")
        if size_header and int(size_header) > MAX_BYTES:
            raise ValueError("Model exceeds 32 MiB audit ceiling")
        data = res.read(MAX_BYTES + 1)
        headers = {
            "content_type": res.headers.get("Content-Type", ""),
            "cors_allow_origin": res.headers.get("Access-Control-Allow-Origin", ""),
            "final_url": res.url,
        }
    if len(data) > MAX_BYTES:
        raise ValueError("Model exceeds 32 MiB audit ceiling")
    return data, headers


def featured_urls() -> dict[str, str]:
    catalog = FEATURED_SOURCE.read_text(encoding="utf-8")
    entries = re.findall(
        r'id:\s*"([^"]+)"\s*,\s*name:\s*"([^"]+)"[^}]*?'
        r'modelUrl:\s*"(https://[^"]+\.glb)"', catalog, flags=re.S,
    )
    featured = {id_: {"name": name, "url": url} for id_, name, url in entries
                if id_.startswith("featured-")}
    if len(featured) != 5:
        raise ValueError(f"Expected five source GLBs, got {len(featured)}")
    return featured


def candidate_urls() -> dict[str, dict[str, str]]:
    catalog = CANDIDATE_SOURCE.read_text(encoding="utf-8")
    entries = re.findall(
        r'id:\s*"([^"]+)"\s*,\s*name:\s*"([^"]+)"[^}]*?'
        r'modelUrl:\s*"(https://[^"]+\.glb)"',
        catalog, flags=re.S,
    )
    candidates = {id_: {"name": name, "url": url}
                  for id_, name, url in entries if id_.startswith("curated-")}
    if len(candidates) != 2 or len({item["url"] for item in candidates.values()}) != 2:
        raise ValueError("Expected two distinct pinned candidate GLB sources")
    return candidates


def audit_live(save_browser_fixtures: bool = False) -> int:
    report = {
        "models": {}, "candidates": {},
        "note": "Structural audit only; candidate assets remain opt-in and NOT art approved",
    }
    for identity, source in featured_urls().items():
        print(f"Inspecting {source['name']}: {source['url']}", flush=True)
        try:
            binary, headers = read_limited(source["url"])
            details = inspect_glb(binary)
            if save_browser_fixtures:
                path = Path("public/__qa__/featured") / (identity + ".glb")
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(binary)
            report["models"][identity] = {**source, **headers,
                                          "status": "verified", **details}
            print(f"  verified {details['bytes']} bytes; meshes={details['mesh_count']}; "
                  f"joints={details['joints']}; morphs={details['morph_count']}", flush=True)
        except (ValueError, OSError, TimeoutError, urllib.error.URLError) as exc:
            report["models"][identity] = {**source, "status": "unavailable_or_invalid",
                                           "error": str(exc)}
            print(f"  UNVERIFIED: {exc}", flush=True)
    for identity, source in candidate_urls().items():
        print(f"Inspecting candidate {source['name']}: {source['url']}", flush=True)
        try:
            binary, headers = read_limited(source["url"])
            details = inspect_glb(binary)
            # Surface candidate weaknesses instead of trusting advertised morph support.
            if not details["body_rigged"] or not details["likely_lipsync"]:
                raise ValueError("Candidate lacks body joints or compatible speech morphs")
            if save_browser_fixtures:
                path = Path("public/__qa__/candidates") / (identity + ".glb")
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(binary)
            report["candidates"][identity] = {**source, **headers,
                                              "status": "technically_verified", **details}
            print(f"  candidate verified; joints={details['joints']}; morphs={details['morph_count']}", flush=True)
        except (ValueError, OSError, TimeoutError, urllib.error.URLError) as exc:
            report["candidates"][identity] = {**source, "status": "unavailable_or_invalid",
                                              "error": str(exc)}
            print(f"  Candidate NOT verified: {exc}", flush=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    healthy = sum(item["status"] == "verified" for item in report["models"].values())
    reviewed = sum(item["status"] == "technically_verified"
                   for item in report["candidates"].values())
    print(f"Featured GLBs: {healthy}/5; new technical candidates: {reviewed}/2; "
          f"report: {OUTPUT}", flush=True)
    # External domains can fail intermittently: the audit must report that failure,
    # without blocking local browser/TypeScript/test quality gates.
    return 0


def main():
    p = argparse.ArgumentParser()
    p.add_argument("glb", nargs="?", type=Path)
    p.add_argument("--live", action="store_true")
    p.add_argument("--download-tests", action="store_true")
    args = p.parse_args()
    if args.live:
        return audit_live(save_browser_fixtures=args.download_tests)
    if args.glb is None:
        p.error("Pass a local .glb path or --live")
    print(json.dumps(inspect_glb(args.glb.read_bytes()), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
