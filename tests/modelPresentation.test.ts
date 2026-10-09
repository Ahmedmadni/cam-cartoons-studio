import { describe, expect, test } from "bun:test";
import { calculateModelFit, detectFaceCapabilities } from "../src/lib/modelPresentation";
import { isSafeAssetUrl } from "../src/lib/characterLibrary";

describe("Premium model presentation", () => {
  test("normalizes one-unit tall and hundred-unit tall models to the same height", () => {
    const small = calculateModelFit({ height: 1, width: 0.5, depth: 0.3 });
    const huge = calculateModelFit({ height: 100, width: 50, depth: 30 });
    expect(small.valid).toBe(true);
    expect(huge.valid).toBe(true);
    expect(small.scale).toBeCloseTo(2.55, 6);
    expect(huge.scale * 100).toBeCloseTo(2.55, 6);
  });
  test("clamps unusually wide rigs and applies manual adjustment", () => {
    const result = calculateModelFit({ height: 2, width: 5, depth: 1 }, 1.5);
    expect(result.valid).toBe(true);
    expect(result.scale).toBeCloseTo(1.5 * (2.65 / 5), 6);
  });
  test("handles invalid and empty dimensions", () => {
    expect(calculateModelFit({ height: 0, width: 0, depth: 0 }).valid).toBe(false);
    expect(calculateModelFit({ height: Infinity, width: 1, depth: 1 }).valid).toBe(false);
    expect(calculateModelFit({ height: -1, width: 1, depth: 1 }).valid).toBe(false);
    expect(calculateModelFit({ height: 2, width: 1, depth: 1 }, 0).valid).toBe(false);
  });
  test("detects common ARKit and Oculus face controls", () => {
    expect(detectFaceCapabilities(["mouthOpen", "eyeBlinkLeft"]).hasLipSync).toBe(true);
    expect(detectFaceCapabilities(["mouthOpen", "eyeBlinkLeft"]).hasBlink).toBe(true);
    expect(detectFaceCapabilities(["Wolf3D_Head_jawOpen", "eyesClosed"]).hasBlink).toBe(true);
    expect(detectFaceCapabilities(["body", "hats"]).hasLipSync).toBe(false);
  });
  test("only allows bounded WebP preview data URLs", () => {
    expect(isSafeAssetUrl("data:image/webp;base64,AAAA", "image")).toBe(true);
    expect(isSafeAssetUrl("data:image/svg+xml;base64,AAAA", "image")).toBe(false);
    expect(isSafeAssetUrl("data:text/html;base64,AAAA", "image")).toBe(false);
    expect(isSafeAssetUrl("data:image/webp;base64," + "A".repeat(300001), "image")).toBe(false);
  });
});
