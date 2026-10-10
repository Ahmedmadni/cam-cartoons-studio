#!/usr/bin/env python3
"""Deterministic tests for binary glTF analysis, without external networking."""
import json
import struct
import unittest

from audit_featured_glbs import inspect_glb, parse_glb, featured_urls, candidate_urls


def sample_glb(*, meshes=None, skins=None, nodes=None, morph_names=None):
    mesh = meshes if meshes is not None else [{"primitives": [{"attributes": {"POSITION": 0}}]}]
    if morph_names:
        mesh[0]["extras"] = {"targetNames": morph_names}
        mesh[0]["primitives"][0]["targets"] = [{"POSITION": index} for index in range(len(morph_names))]
    scene = {
        "asset": {"version": "2.0"},
        "meshes": mesh, "skins": skins or [],
        "nodes": nodes or [], "buffers": [{"byteLength": 0}],
    }
    js = json.dumps(scene, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    full = 12 + 8 + len(js)
    return struct.pack("<III", 0x46546C67, 2, full) + struct.pack("<II", len(js), 0x4E4F534A) + js


class GlbAuditTests(unittest.TestCase):
    def test_valid_geometry_without_rig_does_not_claim_animated(self):
        result = inspect_glb(sample_glb())
        self.assertEqual(result["mesh_count"], 1)
        self.assertEqual(result["joints"], 0)
        self.assertFalse(result["body_rigged"])
        self.assertFalse(result["likely_lipsync"])

    def test_rig_and_arkit_morphs_are_reported_independently(self):
        blob = sample_glb(
            skins=[{"joints": [0, 1]}],
            nodes=[{"name": "Head"}, {"name": "Jaw"}],
            morph_names=["eyeBlinkLeft", "jawOpen", "browInnerUp"],
        )
        result = inspect_glb(blob)
        self.assertEqual(result["joints"], 2)
        self.assertEqual(result["morph_count"], 3)
        self.assertTrue(result["body_rigged"])
        self.assertTrue(result["likely_blink"])
        self.assertTrue(result["likely_lipsync"])

    def test_exact_mpfb_facial_bones_are_distinct_from_eyelid_and_viseme_morph(self):
        rig = sample_glb(
            skins=[{"joints": [0, 1, 2]}],
            nodes=[{"name": "jaw"}, {"name": "eye.L"}, {"name": "eye.R"}],
        )
        details = inspect_glb(rig)
        self.assertTrue(details["jaw_bone"])
        self.assertTrue(details["eye_bones"])
        self.assertFalse(details["likely_lipsync"])
        misleading = inspect_glb(sample_glb(
            skins=[{"joints": [0, 1, 2]}],
            nodes=[{"name": "jawOpen"}, {"name": "eye.Lid"}, {"name": "eye.RLash"}],
        ))
        self.assertFalse(misleading["jaw_bone"])
        self.assertFalse(misleading["eye_bones"])

    def test_truncated_and_wrong_header_are_rejected(self):
        blob = sample_glb()
        with self.assertRaises(ValueError):
            parse_glb(blob[:-2])
        with self.assertRaises(ValueError):
            parse_glb(b"abcd" + blob[4:])
        with self.assertRaises(ValueError):
            parse_glb(blob[:12])

    def test_rejects_empty_mesh_geometry(self):
        with self.assertRaises(ValueError):
            inspect_glb(sample_glb(meshes=[]))
        with self.assertRaises(ValueError):
            inspect_glb(sample_glb(meshes=[{"primitives": [{"attributes": {"NORMAL": 0}}]}]))

    def test_candidate_sources_are_five_distinct_commit_pinned_glbs(self):
        candidates = candidate_urls()
        self.assertEqual(set(candidates), {
            "curated-rocketbox-yasmin", "curated-rocketbox-ziyad",
            "curated-mpfb-kofi", "curated-mpfb-yuki", "curated-mpfb-liam",
        })
        for item in candidates.values():
            self.assertTrue(
                "/8af29d456c4d4d4f7e8ac32ac0c2b2aaf02c27d3/" in item["url"] or
                "/ff1b635eba22d782423a6d81233e8deca7f6d1bd/" in item["url"]
            )

    def test_featured_source_has_five_distinct_real_urls(self):
        result = featured_urls()
        self.assertEqual(len(result), 5)
        self.assertEqual(set(result), {
            "featured-cinematic-female", "featured-cinematic-male",
            "featured-selfie-girl", "featured-michelle", "featured-portrait-reem",
        })
        self.assertEqual(len({item["url"] for item in result.values()}), 5)


if __name__ == "__main__":
    unittest.main()
