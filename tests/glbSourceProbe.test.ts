import { describe, expect, test } from "bun:test";
import { inspectGlbPrefix, probeRemoteGlb } from "../src/lib/glbSourceProbe";
import { FACE_MORPH_ALIASES, detectFaceCapabilities, matchMorphAlias } from "../src/lib/modelPresentation";

function prefix(version = 2, size = 2048) {
  const data = new Uint8Array(12);
  const header = new DataView(data.buffer);
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, version, true);
  header.setUint32(8, size, true);
  return data;
}

describe("Actual-browser GLB source checks", () => {
  test("decodes the glTF 2.0 length from its little-endian header", () => {
    expect(inspectGlbPrefix(prefix())).toBe(2048);
    expect(inspectGlbPrefix(prefix(2, 3_500_000))).toBe(3_500_000);
  });
  test("rejects short, malformed and incompatible GLB headers", () => {
    expect(() => inspectGlbPrefix(new Uint8Array(10))).toThrow();
    expect(() => inspectGlbPrefix(prefix(1))).toThrow();
    expect(() => inspectGlbPrefix(prefix(2, 12))).toThrow();
    const bad = prefix();
    bad[0] = 0;
    expect(() => inspectGlbPrefix(bad)).toThrow();
  });
  test("refuses insecure and non-GLB source URLs before requesting them", async () => {
    await expect(probeRemoteGlb("http://example.com/a.glb")).rejects.toThrow();
    await expect(probeRemoteGlb("javascript:alert(1)")).rejects.toThrow();
    await expect(probeRemoteGlb("https://example.com/a.fbx")).rejects.toThrow();
  });
});

describe("Facial driver supports every capability it advertises", () => {
  test("all mouth aliases can be animated by the real driver", () => {
    for (const alias of FACE_MORPH_ALIASES.mouthOpen) {
      expect(detectFaceCapabilities(["Wolf3D_" + alias]).hasLipSync).toBe(true);
      expect(matchMorphAlias("Wolf3D_" + alias, FACE_MORPH_ALIASES.mouthOpen)).toBe(true);
    }
  });
  test("all blink aliases can be animated by the real driver", () => {
    const sets = [
      FACE_MORPH_ALIASES.blinkLeft,
      FACE_MORPH_ALIASES.blinkRight,
      FACE_MORPH_ALIASES.blinkBoth,
    ];
    for (const aliases of sets) {
      for (const alias of aliases) {
        expect(detectFaceCapabilities([alias]).hasBlink).toBe(true);
      }
    }
  });
  test("unrelated morph names do not trigger unsupported claims", () => {
    expect(detectFaceCapabilities(["eyesLookUp", "mouthSmileLeft", "HairVolume"])).toEqual({
      hasLipSync: false, hasBlink: false,
    });
  });
});
