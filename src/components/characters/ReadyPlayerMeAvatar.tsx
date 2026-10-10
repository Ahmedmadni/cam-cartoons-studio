import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Box3, MathUtils, Vector3 } from "three";
import type { Bone, Euler, Group, Mesh, Object3D } from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import { getAvatarProfile } from "@/lib/avatarCatalog";
import { createBoneFaceDriver, findFacialBones, type FacialBoneRig } from "@/lib/boneFaceMotion";
import { faceState } from "@/lib/faceState";
import { getNaturalBlink, getReviewExpressionPose, resolveMorphIndices, type ReviewExpression } from "@/lib/facialPerformance";
import { enhanceSurfaceSampling, inspectSurfaceQuality } from "@/lib/avatarSurfaceQuality";
import { calculateModelFit, detectFaceCapabilities, FACE_MORPH_ALIASES, matchMorphAlias, type AvatarDiagnostics } from "@/lib/modelPresentation";
import { useStudioStore } from "@/lib/store";
import type { AnimationType, CharacterType } from "@/lib/store";

type Props = {
  type: CharacterType;
  url: string;
  animation: AnimationType;
  spin: boolean;
  previewSpeech?: boolean | undefined;
  /** Recenter only during visual inspection, never during story playback. */
  reviewMode?: boolean | undefined;
  reviewExpression?: ReviewExpression | undefined;
  onDiagnostics?: ((details: AvatarDiagnostics) => void) | undefined;
};

type MorphMesh = Mesh & {
  morphTargetDictionary?: Record<string, number>;
  morphTargetInfluences?: number[];
};

type Rig = {
  head: Bone | null;
  neck: Bone | null;
  leftArm: Bone | null;
  rightArm: Bone | null;
  leftForeArm: Bone | null;
  rightForeArm: Bone | null;
  morphMeshes: MorphMesh[];
  facialBones: FacialBoneRig;
};

type BonePose = {
  head: Euler | null;
  neck: Euler | null;
  leftArm: Euler | null;
  rightArm: Euler | null;
  leftForeArm: Euler | null;
  rightForeArm: Euler | null;
};

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function findBone(root: Object3D, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeName);
  let match: Bone | null = null;

  root.traverse((object) => {
    if (match || object.type !== "Bone") return;
    const normalized = normalizeName(object.name);
    if (normalizedAliases.some((alias) => normalized === alias || normalized.endsWith(alias))) {
      match = object as Bone;
    }
  });

  return match;
}

function collectRig(root: Object3D): Rig {
  const morphMeshes: MorphMesh[] = [];

  root.traverse((object) => {
    const mesh = object as MorphMesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        morphMeshes.push(mesh);
      }

      // Keep original GLB PBR response; flattening all materials to 0.75
      // damages distinctive skin, hair, metallic accessories and fabrics.
    }
  });

  return {
    head: findBone(root, ["head", "mixamorighead"]),
    neck: findBone(root, ["neck", "mixamorigneck"]),
    leftArm: findBone(root, ["leftarm", "leftupperarm", "mixamorigleftarm"]),
    rightArm: findBone(root, ["rightarm", "rightupperarm", "mixamorigrightarm"]),
    leftForeArm: findBone(root, ["leftforearm", "leftlowerarm", "mixamorigleftforearm"]),
    rightForeArm: findBone(root, ["rightforearm", "rightlowerarm", "mixamorigrightforearm"]),
    morphMeshes,
    facialBones: findFacialBones(root),
  };
}

function copyEuler(value: Euler | null) {
  return value?.clone() ?? null;
}

function capturePose(rig: Rig): BonePose {
  return {
    head: copyEuler(rig.head?.rotation ?? null),
    neck: copyEuler(rig.neck?.rotation ?? null),
    leftArm: copyEuler(rig.leftArm?.rotation ?? null),
    rightArm: copyEuler(rig.rightArm?.rotation ?? null),
    leftForeArm: copyEuler(rig.leftForeArm?.rotation ?? null),
    rightForeArm: copyEuler(rig.rightForeArm?.rotation ?? null),
  };
}

// Resolving morph names against a 70+ key dictionary every animation frame
// wastes CPU and allocations on phones. Cache mappings by immutable GLTF dict.
const morphResolutionCache = new WeakMap<
  Record<string, number>,
  WeakMap<readonly string[], { single: number[]; paired: number[] }>
>();

function getMorphBinding(dictionary: Record<string, number>, aliases: readonly string[], pairedSmile = false) {
  let byAliases = morphResolutionCache.get(dictionary);
  if (!byAliases) {
    byAliases = new WeakMap();
    morphResolutionCache.set(dictionary, byAliases);
  }
  let entry = byAliases.get(aliases);
  if (!entry) {
    entry = {
      single: resolveMorphIndices(dictionary, aliases),
      paired: resolveMorphIndices(dictionary, aliases, true),
    };
    byAliases.set(aliases, entry);
  }
  return pairedSmile ? entry.paired : entry.single;
}

function setMorph(
  meshes: MorphMesh[],
  aliases: readonly string[],
  value: number,
  delta: number,
  pairedSmile = false,
  onlyWithoutSideBlink = false,
) {
  const target = MathUtils.clamp(value, 0, 1);
  for (const mesh of meshes) {
    const dictionary = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    if (!dictionary || !influences) continue;

    // Mixed ARKit and generic eyeBlink shapes must not close eyelids twice.
    if (onlyWithoutSideBlink && (
      getMorphBinding(dictionary, FACE_MORPH_ALIASES.blinkLeft).length ||
      getMorphBinding(dictionary, FACE_MORPH_ALIASES.blinkRight).length
    )) continue;
    const indices = getMorphBinding(dictionary, aliases, pairedSmile);
    for (const index of indices) {
      if (index >= influences.length) continue;
      influences[index] = MathUtils.damp(influences[index] ?? 0, target, 14, delta);
    }
  }
}

function applyFaceMorphs(
  rig: Rig,
  animation: AnimationType,
  autoBlink: { left: number; right: number },
  previewMouthOpen: number,
  delta: number,
  expression: ReviewExpression,
  reviewActive: boolean,
) {
  const pose = getReviewExpressionPose(expression);
  const open = previewMouthOpen > 0 ? previewMouthOpen :
    reviewActive ? pose.mouthOpen : (faceState.mouthOpen > 0.06 ? faceState.mouthOpen : 0);
  const smile = reviewActive ? pose.smile :
    Math.max(faceState.smile, animation === "happy" ? 0.72 : 0);
  const blinkLeft = MathUtils.clamp(Math.max(reviewActive ? 0 : faceState.blinkLeft, autoBlink.left), 0, 1);
  const blinkRight = MathUtils.clamp(Math.max(reviewActive ? 0 : faceState.blinkRight, autoBlink.right), 0, 1);
  const browUp = reviewActive ? pose.browUp : faceState.browUp;

  setMorph(rig.morphMeshes, FACE_MORPH_ALIASES.mouthOpen, open, delta);
  setMorph(rig.morphMeshes, FACE_MORPH_ALIASES.smile, smile, delta, true);
  setMorph(rig.morphMeshes, FACE_MORPH_ALIASES.blinkLeft, blinkLeft, delta);
  setMorph(rig.morphMeshes, FACE_MORPH_ALIASES.blinkRight, blinkRight, delta);
  setMorph(rig.morphMeshes, FACE_MORPH_ALIASES.blinkBoth, Math.max(blinkLeft, blinkRight), delta, false, true);
  setMorph(rig.morphMeshes, FACE_MORPH_ALIASES.browUp, browUp, delta);

  const lookX = MathUtils.clamp(reviewActive ? pose.eyeX : faceState.eyeX, -1, 1);
  const lookY = MathUtils.clamp(reviewActive ? pose.eyeY : faceState.eyeY, -1, 1);
  setMorph(rig.morphMeshes, FACE_MORPH_ALIASES.lookLeft, Math.max(0, lookX), delta);
  setMorph(rig.morphMeshes, FACE_MORPH_ALIASES.lookRight, Math.max(0, -lookX), delta);
  setMorph(rig.morphMeshes, FACE_MORPH_ALIASES.lookUp, Math.max(0, -lookY), delta);
  setMorph(rig.morphMeshes, FACE_MORPH_ALIASES.lookDown, Math.max(0, lookY), delta);
}

function dampBone(
  bone: Bone | null,
  base: Euler | null,
  target: { x?: number; y?: number; z?: number },
  delta: number,
  speed = 8,
) {
  if (!bone || !base) return;
  bone.rotation.x = MathUtils.damp(bone.rotation.x, base.x + (target.x ?? 0), speed, delta);
  bone.rotation.y = MathUtils.damp(bone.rotation.y, base.y + (target.y ?? 0), speed, delta);
  bone.rotation.z = MathUtils.damp(bone.rotation.z, base.z + (target.z ?? 0), speed, delta);
}

export default function ReadyPlayerMeAvatar({ type, url, animation, spin, previewSpeech = false, reviewMode = false, reviewExpression = "neutral", onDiagnostics }: Props) {
  const profile = getAvatarProfile(type);
  const root = useRef<Group>(null);
  const gltf = useGLTF(url);
  const gpuAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const avatar = useMemo(() => cloneSkeleton(gltf.scene), [gltf.scene]);
  const surface = useMemo(() => {
    const enhancedTextureCount = enhanceSurfaceSampling(avatar, gpuAnisotropy);
    return { ...inspectSurfaceQuality(avatar), enhancedTextureCount };
  }, [avatar, gpuAnisotropy]);
  const rig = useMemo(() => collectRig(avatar), [avatar]);
  const boneFaceDriver = useMemo(() => createBoneFaceDriver(rig.facialBones), [rig]);
  const basePose = useRef<BonePose>(capturePose(rig));

  // Read the geometry in its bind pose, not after runtime animations change the bones.
  const presentation = useMemo(() => {
    const bounds = new Box3().setFromObject(avatar);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const dimensions = { width: size.x, height: size.y, depth: size.z };
    const headPosition = rig.head?.getWorldPosition(new Vector3());
    const headHeightRatio = headPosition && size.y > 0
      ? Math.min(1, Math.max(0, (headPosition.y - bounds.min.y) / size.y))
      : undefined;
    const fit = calculateModelFit(dimensions, profile.rpmScale);
    const morphNames = [...new Set(rig.morphMeshes.flatMap((mesh) => Object.keys(mesh.morphTargetDictionary ?? {})))];
    const boneNames: string[] = [];
    let meshCount = 0;
    let skinnedMeshCount = 0;
    const materialIds = new Set<string>();
    avatar.traverse((object) => {
      if (object.type === "Bone") boneNames.push(object.name);
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      meshCount++;
      if (object.type === "SkinnedMesh") skinnedMeshCount++;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) if (material) materialIds.add(material.uuid);
    });
    const capability = detectFaceCapabilities(morphNames);
    const diagnostics: AvatarDiagnostics = {
      status: "ready",
      modelUrl: url,
      dimensions,
      normalizedScale: fit.scale,
      ...(headHeightRatio === undefined ? {} : { headHeightRatio }),
      boneCount: boneNames.length,
      morphCount: morphNames.length,
      meshCount,
      skinnedMeshCount,
      materialCount: materialIds.size,
      ...surface,
      animationClipCount: gltf.animations.length,
      hasHeadRig: Boolean(rig.head),
      hasArmRig: Boolean(rig.leftArm && rig.rightArm),
      hasLipSync: capability.hasLipSync,
      hasBlink: capability.hasBlink,
      hasSmile: capability.hasSmile,
      hasBrowUp: capability.hasBrowUp,
      hasJawBone: boneFaceDriver.hasJaw,
      hasEyeBones: boneFaceDriver.hasEyes,
      boneNames: boneNames.slice(0, 36),
      morphNames: morphNames.slice(0, 36),
      ...(!fit.valid ? { message: "تعذر قراءة أبعاد النموذج؛ تم استخدام المقياس الافتراضي." } : {}),
    };
    return {
      scale: fit.valid ? fit.scale : profile.rpmScale,
      offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number],
      diagnostics,
    };
  }, [avatar, rig, boneFaceDriver, profile.rpmScale, gltf.animations.length, url, surface]);

  useEffect(() => {
    onDiagnostics?.(presentation.diagnostics);
  }, [onDiagnostics, presentation]);

  useEffect(() => {
    basePose.current = capturePose(rig);
  }, [rig]);

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;

    const t = state.clock.elapsedTime;
    if (spin) group.rotation.y += delta * 0.52;
    if (animation === "spin") group.rotation.y += delta * 2.1;
    // Recenter the real mesh after a user stops rotation, so photo angles are repeatable.
    if (reviewMode && !spin && animation !== "spin" && animation !== "dance") {
      group.rotation.y = MathUtils.damp(group.rotation.y, 0, 8, delta);
    }

    let targetY = profile.rpmYOffset;
    let targetZ = 0;

    if (animation === "jump") {
      targetY += Math.abs(Math.sin(t * 3.5)) * 0.48;
    } else if (animation === "happy") {
      targetY += Math.abs(Math.sin(t * 4.1)) * 0.2;
      targetZ = Math.sin(t * 4.1) * 0.025;
    } else if (animation === "dance") {
      targetY += Math.abs(Math.sin(t * 5)) * 0.11;
      targetZ = Math.sin(t * 2.8) * 0.1;
      group.rotation.y = MathUtils.damp(group.rotation.y, Math.sin(t * 1.7) * 0.4, 5, delta);
    } else if (animation === "sad") {
      targetY -= 0.05;
    } else if (animation !== "spin") {
      targetY += Math.sin(t * 1.5) * 0.018;
    }

    group.position.y = MathUtils.damp(group.position.y, targetY, 8, delta);
    group.rotation.z = MathUtils.damp(group.rotation.z, targetZ, 8, delta);

    const pose = basePose.current;
    const tracking = useStudioStore.getState().isFaceTrackingEnabled;
    const reviewActive = reviewMode && !tracking;
    const expressionPose = getReviewExpressionPose(reviewActive ? reviewExpression : "neutral");
    let headX = reviewActive ? expressionPose.headPitch : faceState.pitch * 0.45;
    let headY = reviewActive ? expressionPose.headYaw : -faceState.yaw * 0.58;
    let headZ = reviewActive ? expressionPose.headRoll : -faceState.roll * 0.46;
    // Micro-movements only while face tracking is disabled; never fight MediaPipe.
    if (!tracking && animation === "idle") {
      headX += Math.sin(t * 0.83) * 0.014;
      headY += Math.sin(t * 0.52 + 0.5) * 0.026;
      headZ += Math.sin(t * 0.74) * 0.012;
    }

    if (animation === "nod") headX += Math.sin(t * 5.1) * 0.2;
    if (animation === "sad") headX += 0.18;
    if (animation === "think") {
      headZ += 0.18;
      headY += 0.12;
    }
    if (animation === "happy") headX -= 0.05;

    dampBone(rig.head, pose.head, { x: headX, y: headY, z: headZ }, delta, 9);
    dampBone(rig.neck, pose.neck, { x: headX * 0.22, y: headY * 0.2, z: headZ * 0.2 }, delta, 9);

    let leftArm = { x: 0, y: 0, z: 0 };
    let rightArm = { x: 0, y: 0, z: 0 };
    let leftForeArm = { x: 0, y: 0, z: 0 };
    let rightForeArm = { x: 0, y: 0, z: 0 };

    if (animation === "wave" || animation === "bye") {
      rightArm = { x: -0.18, y: 0.12, z: -1.45 };
      rightForeArm = { x: 0, y: 0.12, z: -0.85 + Math.sin(t * (animation === "wave" ? 8 : 5)) * 0.42 };
    } else if (animation === "clap") {
      leftArm = { x: -0.4, y: 0.42, z: 0.9 };
      rightArm = { x: -0.4, y: -0.42, z: -0.9 };
      leftForeArm = { x: -0.22, y: 0.18, z: 0.65 };
      rightForeArm = { x: -0.22, y: -0.18, z: -0.65 };
    } else if (animation === "happy") {
      leftArm = { x: 0, y: 0, z: 1.35 };
      rightArm = { x: 0, y: 0, z: -1.35 };
      leftForeArm = { x: 0, y: 0, z: 0.2 };
      rightForeArm = { x: 0, y: 0, z: -0.2 };
    } else if (animation === "dance") {
      const sway = Math.sin(t * 4.5) * 0.65;
      leftArm = { x: 0, y: 0, z: 0.75 + sway };
      rightArm = { x: 0, y: 0, z: -0.75 - sway };
    } else if (animation === "think") {
      rightArm = { x: -0.3, y: 0.18, z: -1.05 };
      rightForeArm = { x: -0.35, y: 0.25, z: -1.15 };
    }

    dampBone(rig.leftArm, pose.leftArm, leftArm, delta);
    dampBone(rig.rightArm, pose.rightArm, rightArm, delta);
    dampBone(rig.leftForeArm, pose.leftForeArm, leftForeArm, delta);
    dampBone(rig.rightForeArm, pose.rightForeArm, rightForeArm, delta);

    const autoBlink = tracking ? { left: 0, right: 0 } : getNaturalBlink(t);
    // This is a silent mouth demonstration, NOT calibrated audio / phoneme sync.
    const testOpen = previewSpeech && reviewActive ? Math.pow(Math.sin(t * 7), 2) * 0.70 : 0;
    applyFaceMorphs(rig, animation, autoBlink, testOpen, Math.min(delta, 0.1), reviewExpression, reviewActive);
    // MPFB / MakeHuman GLBs have real jaw and eyeball joints even without
    // ARKit morphs. Use only those actual joints; never synthesize an eyelid.
    // Avoid doubling motion when a morph already drives the same feature.
    const poseMouth = reviewActive ? expressionPose.mouthOpen : Math.max(0, faceState.mouthOpen);
    const mouth = testOpen > 0 ? testOpen : poseMouth;
    const morphNames = presentation.diagnostics.morphNames ?? [];
    const hasEyeMorphs = morphNames.some((name) =>
      matchMorphAlias(name, FACE_MORPH_ALIASES.lookLeft) ||
      matchMorphAlias(name, FACE_MORPH_ALIASES.lookRight) ||
      matchMorphAlias(name, FACE_MORPH_ALIASES.lookUp) ||
      matchMorphAlias(name, FACE_MORPH_ALIASES.lookDown));
    const eyeX = reviewActive ? expressionPose.eyeX :
      tracking ? faceState.eyeX : Math.sin(t * 0.45) * 0.14;
    const eyeY = reviewActive ? expressionPose.eyeY :
      tracking ? faceState.eyeY : Math.sin(t * 0.37 + 0.6) * 0.09;
    boneFaceDriver.apply(mouth, eyeX, eyeY, Math.min(delta, 0.1),
      !presentation.diagnostics.hasLipSync, !hasEyeMorphs);
  });

  return (
    <group
      ref={root}
      position={[0, profile.rpmYOffset, 0]}
      scale={presentation.scale}
    >
      <group position={presentation.offset}>
        <primitive object={avatar} />
      </group>
    </group>
  );
}
