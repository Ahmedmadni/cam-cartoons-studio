import { describe, expect, test } from "bun:test";
import {
  getNaturalBlink, getReviewExpressionPose, resolveMorphIndices, REVIEW_EXPRESSION_LABELS,
} from "../src/lib/facialPerformance";
import { FACE_MORPH_ALIASES, detectFaceCapabilities } from "../src/lib/modelPresentation";

describe("Natural GLB facial performance", () => {
  test("one mouth channel is selected rather than activating multiple aliases", () => {
    const dictionary = { mouthOpen: 0, jawOpen: 1, visemeAA: 2, viseme_aa: 3 };
    expect(resolveMorphIndices(dictionary, FACE_MORPH_ALIASES.mouthOpen)).toEqual([0]);
    expect(resolveMorphIndices({ Wolf3D_Head_jawOpen: 7, visemeAA: 8 }, FACE_MORPH_ALIASES.mouthOpen)).toEqual([7]);
    expect(resolveMorphIndices({}, FACE_MORPH_ALIASES.mouthOpen)).toEqual([]);
  });
  test("a matching pair of smile morphs moves both sides, not the generic shape too", () => {
    const dict = { mouthSmile: 0, mouthSmileLeft: 4, mouthSmileRight: 5 };
    expect(resolveMorphIndices(dict, FACE_MORPH_ALIASES.smile, true)).toEqual([4, 5]);
    expect(resolveMorphIndices({ mouthSmile: 2 }, FACE_MORPH_ALIASES.smile, true)).toEqual([2]);
  });
  test("expression presets are bounded and don't confuse a silent sample with audio sync", () => {
    expect(Object.keys(REVIEW_EXPRESSION_LABELS)).toEqual(["neutral", "smile", "surprise", "thoughtful"]);
    expect(getReviewExpressionPose("smile").smile).toBeGreaterThan(0.6);
    expect(getReviewExpressionPose("surprise").browUp).toBeGreaterThan(0.5);
    expect(getReviewExpressionPose("thoughtful").headYaw).toBeGreaterThan(0);
    for (const type of Object.keys(REVIEW_EXPRESSION_LABELS) as (keyof typeof REVIEW_EXPRESSION_LABELS)[]) {
      const pose = getReviewExpressionPose(type);
      for (const property of ["smile", "mouthOpen", "browUp"] as const) {
        expect(pose[property]).toBeGreaterThanOrEqual(0);
        expect(pose[property]).toBeLessThanOrEqual(1);
      }
    }
  });
  test("organic blinks are repeatable, asymmetric and absent between pulses", () => {
    expect(getNaturalBlink(0)).toEqual({ left: 0, right: 0 });
    expect(getNaturalBlink(3.2).left).toBe(1);
    expect(getNaturalBlink(3.2).right).toBeGreaterThan(0);
    expect(getNaturalBlink(3.2).right).toBeLessThan(1);
    expect(getNaturalBlink(3.2 + 13.4).left).toBeCloseTo(1);
    expect(getNaturalBlink(Number.NaN)).toEqual({ left: 0, right: 0 });
  });
  test("capabilities reflect available real morphs; no artificial smile claim", () => {
    expect(detectFaceCapabilities(["jawOpen", "mouthSmileLeft", "browInnerUp"])).toEqual({
      hasLipSync: true, hasBlink: false, hasSmile: true, hasBrowUp: true,
    });
    expect(detectFaceCapabilities([]).hasSmile).toBe(false);
  });
});
