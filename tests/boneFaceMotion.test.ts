import { describe, expect, test } from "bun:test";
import { Bone, Euler, Group, Quaternion, Vector3 } from "three";
import { createBoneFaceDriver, facialBoneRole, findFacialBones } from "../src/lib/boneFaceMotion";

describe("Real bone-based jaw / eyes", () => {
  test("exact MPFB names find jaw and both eyes without confusing lids or eyelashes", () => {
    expect(facialBoneRole("jaw")).toBe("jaw");
    expect(facialBoneRole("eye.L")).toBe("eyeLeft");
    expect(facialBoneRole("eye.R")).toBe("eyeRight");
    expect(facialBoneRole("eyeL")).toBe("eyeLeft");
    expect(facialBoneRole("eyeR")).toBe("eyeRight");
    for (const name of ["jawOpen", "upperjaw", "eye.Lid", "eyelash", "leftEyebrow", "head", ""]) {
      expect(facialBoneRole(name)).toBeNull();
    }
    const root = new Group();
    for (const name of ["jaw", "eye.L", "eye.R", "eye.Lid", "hair"]) {
      const item = new Bone(); item.name = name; root.add(item);
    }
    const found = findFacialBones(root);
    expect(found.jaw?.name).toBe("jaw");
    expect(found.eyeLeft?.name).toBe("eye.L");
    expect(found.eyeRight?.name).toBe("eye.R");
  });

  test("jaw rotates relative to authored bind quaternion, with bounded range and return to rest", () => {
    const jaw = new Bone();
    jaw.quaternion.setFromEuler(new Euler(0.13, -0.1, 0.22));
    const rest = jaw.quaternion.clone();
    const driver = createBoneFaceDriver({ jaw, eyeLeft: null, eyeRight: null });
    expect(driver.hasJaw).toBe(true);
    expect(driver.hasEyes).toBe(false);
    for (let i = 0; i < 120; i++) driver.apply(9, 0, 0, 1 / 60, true, false);
    const expected = rest.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.24));
    expect(jaw.quaternion.angleTo(expected)).toBeLessThan(0.005);
    for (let i = 0; i < 120; i++) driver.apply(0, 0, 0, 1 / 60, true, false);
    expect(jaw.quaternion.angleTo(rest)).toBeLessThan(0.005);
  });

  test("eyes keep separate original orientations, clamp gaze, and stop on demand", () => {
    const eyeLeft = new Bone(); const eyeRight = new Bone();
    eyeLeft.quaternion.setFromEuler(new Euler(-0.1, 0.03, 0.05));
    eyeRight.quaternion.setFromEuler(new Euler(0.02, -0.04, -0.07));
    const l = eyeLeft.quaternion.clone(), r = eyeRight.quaternion.clone();
    const driver = createBoneFaceDriver({ jaw: null, eyeLeft, eyeRight });
    expect(driver.hasEyes).toBe(true);
    for (let i = 0; i < 120; i++) driver.apply(0, 100, -100, 1 / 60, false, true);
    expect(eyeLeft.quaternion.angleTo(l)).toBeGreaterThan(0.1);
    expect(eyeRight.quaternion.angleTo(r)).toBeGreaterThan(0.1);
    expect(eyeLeft.quaternion.angleTo(l)).toBeLessThan(0.40);
    expect(eyeRight.quaternion.angleTo(r)).toBeLessThan(0.40);
    for (let i = 0; i < 120; i++) driver.apply(0, 1, 1, 1 / 60, false, false);
    expect(eyeLeft.quaternion.angleTo(l)).toBeLessThan(0.005);
    expect(eyeRight.quaternion.angleTo(r)).toBeLessThan(0.005);
  });

  test("a single eyeball is NOT reported as paired eye gaze", () => {
    const rig = { jaw: null, eyeLeft: new Bone(), eyeRight: null };
    expect(createBoneFaceDriver(rig).hasEyes).toBe(false);
  });

  test("missing bones and null inputs are inert; no synthetic face capabilities", () => {
    const driver = createBoneFaceDriver({ jaw: null, eyeLeft: null, eyeRight: null });
    expect(driver.hasJaw).toBe(false);
    expect(driver.hasEyes).toBe(false);
    expect(() => driver.apply(1, 1, 1, 0.016, true, true)).not.toThrow();
  });
});
