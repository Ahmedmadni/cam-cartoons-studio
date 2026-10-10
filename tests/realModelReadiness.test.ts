import { describe, expect, test } from "bun:test";
import {
  assessAnimationReadiness,
  detectFaceCapabilities,
  type AvatarDiagnostics,
} from "../src/lib/modelPresentation";

const rigged: AvatarDiagnostics = {
  status: "ready",
  modelUrl: "/avatars/real.glb",
  boneCount: 65,
  morphCount: 52,
  meshCount: 5,
  materialCount: 6,
  skinnedMeshCount: 3,
  animationClipCount: 2,
  hasHeadRig: true,
  hasArmRig: true,
  hasLipSync: true,
  hasBlink: true,
};

describe("Real model capability truthfulness", () => {
  test("a fully rigged avatar with facial morphs is structurally ready", () => {
    expect(assessAnimationReadiness(rigged)).toEqual({
      grade: "animated",
      title: "بنية الحركة والتعبيرات متوافقة",
      limitations: [],
    });
  });
  test("GLB file existence does not imply animation or facial compatibility", () => {
    const staticMesh: AvatarDiagnostics = {
      ...rigged, boneCount: 0, morphCount: 0, skinnedMeshCount: 0,
      animationClipCount: 0, hasHeadRig: false, hasArmRig: false,
      hasLipSync: false, hasBlink: false,
    };
    const status = assessAnimationReadiness(staticMesh);
    expect(status.grade).toBe("static");
    expect(status.limitations.length).toBeGreaterThan(2);
  });
  test("a skeleton without mouth blendshapes is only partially animation-ready", () => {
    const status = assessAnimationReadiness({
      ...rigged, morphCount: 0, hasBlink: false, hasLipSync: false,
    });
    expect(status.grade).toBe("limited");
    expect(status.limitations.some((line) => line.includes("فم"))).toBe(true);
  });
  test("remote or malformed GLB loading errors are not misrepresented", () => {
    expect(assessAnimationReadiness(null).grade).toBe("unavailable");
    expect(assessAnimationReadiness({ status: "error", modelUrl: "x" }).grade).toBe("unavailable");
  });
  test("detects common facial morph naming, ignoring unrelated names", () => {
    expect(detectFaceCapabilities(["viseme_aa", "eyesClosed"])).toEqual({
      hasLipSync: true, hasBlink: true, hasSmile: false, hasBrowUp: false,
    });
    expect(detectFaceCapabilities(["JawOpen", "blinkRight"])).toEqual({
      hasLipSync: true, hasBlink: true, hasSmile: false, hasBrowUp: false,
    });
    expect(detectFaceCapabilities(["JawRotator", "IrisLook"])).toEqual({
      hasLipSync: false, hasBlink: false, hasSmile: false, hasBrowUp: false,
    });
  });
});
