import { Euler, MathUtils, Quaternion, Vector3 } from "three";
import type { Bone, Object3D } from "three";

/** Exact humanoid bone names only: never rotate eyelashes, eyelids or entire heads as "eyes". */
export type FacialBoneRig = {
  jaw: Bone | null;
  eyeLeft: Bone | null;
  eyeRight: Bone | null;
};

export function facialBoneRole(name: string): keyof FacialBoneRig | null {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized === "jaw") return "jaw";
  if (normalized === "eyel" || normalized === "lefteye") return "eyeLeft";
  if (normalized === "eyer" || normalized === "righteye") return "eyeRight";
  return null;
}

export function findFacialBones(root: Object3D): FacialBoneRig {
  const roles: FacialBoneRig = { jaw: null, eyeLeft: null, eyeRight: null };
  root.traverse((part) => {
    if (part.type !== "Bone") return;
    const role = facialBoneRole(part.name);
    if (role && !roles[role]) roles[role] = part as Bone;
  });
  return roles;
}

export type BoneFaceDriver = {
  hasJaw: boolean;
  /** True only if the original GLB contains both eye bones, not lids. */
  hasEyes: boolean;
  apply: (
    mouthOpen: number, lookX: number, lookY: number, delta: number,
    driveJaw: boolean, driveEyes: boolean,
  ) => void;
};

/**
 * Multiply limited local rotations AFTER the original non-identity rest
 * quaternion. Reuse scratch objects so this allocates nothing per video frame.
 * Jaw motion is deliberately modest: it is NOT speech/phoneme synchronization.
 */
export function createBoneFaceDriver(rig: FacialBoneRig): BoneFaceDriver {
  const restJaw = rig.jaw?.quaternion.clone() ?? null;
  const restLeft = rig.eyeLeft?.quaternion.clone() ?? null;
  const restRight = rig.eyeRight?.quaternion.clone() ?? null;
  const rotation = new Quaternion();
  const target = new Quaternion();
  const eyeEuler = new Euler();
  const jawAxis = new Vector3(1, 0, 0);

  const apply = (bone: Bone | null, rest: Quaternion | null, intensity: number,
                 pitch: number, yaw: number, blend: number) => {
    if (!bone || !rest) return;
    if (intensity === 0) rotation.identity();
    else rotation.setFromEuler(eyeEuler.set(pitch, yaw, 0));
    target.copy(rest).multiply(rotation);
    bone.quaternion.slerp(target, blend);
  };

  return {
    hasJaw: Boolean(rig.jaw),
    hasEyes: Boolean(rig.eyeLeft && rig.eyeRight),
    apply(mouthOpen, lookX, lookY, delta, driveJaw, driveEyes) {
      const blend = 1 - Math.exp(-11 * MathUtils.clamp(delta, 0, 0.1));
      if (rig.jaw && restJaw) {
        const amount = driveJaw ? MathUtils.clamp(mouthOpen, 0, 1) * 0.24 : 0;
        rotation.setFromAxisAngle(jawAxis, amount);
        target.copy(restJaw).multiply(rotation);
        rig.jaw.quaternion.slerp(target, blend);
      }
      const yaw = driveEyes ? MathUtils.clamp(lookX, -1, 1) * 0.26 : 0;
      const pitch = driveEyes ? -MathUtils.clamp(lookY, -1, 1) * 0.19 : 0;
      apply(rig.eyeLeft, restLeft, driveEyes ? 1 : 0, pitch, yaw, blend);
      apply(rig.eyeRight, restRight, driveEyes ? 1 : 0, pitch, yaw, blend);
    },
  };
}
