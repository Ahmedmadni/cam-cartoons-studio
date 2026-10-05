import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { MathUtils } from "three";
import type { Group, Mesh } from "three";

import { mergeAvatarProfile, type AvatarProfile } from "@/lib/avatarCatalog";
import { useAvatarCustomizationStore } from "@/lib/avatarCustomization";
import { faceState } from "@/lib/faceState";
import type { AnimationType, CharacterType } from "@/lib/store";

type Props = {
  type: CharacterType;
  animation: AnimationType;
  spin: boolean;
};

type JointRefs = {
  head: RefObject<Group | null>;
  eyes: RefObject<Group | null>;
  mouth: RefObject<Mesh | null>;
  leftArm: RefObject<Group | null>;
  rightArm: RefObject<Group | null>;
};

function SkinMaterial({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.6}
      sheen={0.45}
      sheenRoughness={0.65}
      sheenColor="#FFD8C5"
      clearcoat={0.05}
      clearcoatRoughness={0.8}
      specularIntensity={0.28}
    />
  );
}

function ClothMaterial({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.92}
      sheen={0.55}
      sheenRoughness={0.9}
      sheenColor="#FFFFFF"
    />
  );
}

function HairMaterial({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.58}
      sheen={0.7}
      sheenRoughness={0.4}
      sheenColor="#B98460"
      clearcoat={0.12}
      clearcoatRoughness={0.55}
    />
  );
}

function Eye({
  x,
  profile,
}: {
  x: number;
  profile: AvatarProfile;
}) {
  return (
    <group position={[x, 0, 0]} scale={profile.eyeScale}>
      <mesh scale={[1, 1.07, 0.52]}>
        <sphereGeometry args={[0.105, 28, 28]} />
        <meshPhysicalMaterial color="#FCFAF6" roughness={0.25} clearcoat={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.066]} scale={[1, 1, 0.45]}>
        <sphereGeometry args={[0.058, 24, 24]} />
        <meshPhysicalMaterial color={profile.eye} roughness={0.2} clearcoat={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.087]} scale={[1, 1, 0.45]}>
        <sphereGeometry args={[0.027, 18, 18]} />
        <meshStandardMaterial color="#101010" />
      </mesh>
      <mesh position={[0.017, 0.025, 0.101]}>
        <sphereGeometry args={[0.011, 10, 10]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function Hair({ profile }: { profile: AvatarProfile }) {
  const mat = <HairMaterial color={profile.hair} />;

  if (profile.hairStyle === "curls") {
    const curls = [
      [-0.35, 0.22, 0.1],
      [-0.18, 0.34, 0.22],
      [0, 0.38, 0.2],
      [0.2, 0.34, 0.18],
      [0.36, 0.2, 0.08],
      [-0.39, 0.03, -0.02],
      [0.39, 0.04, -0.03],
      [-0.22, 0.35, -0.16],
      [0.22, 0.35, -0.16],
    ] as const;

    return (
      <group position={[0, 0.11, -0.02]}>
        <mesh scale={[1.01, 0.88, 0.98]}>
          <sphereGeometry args={[0.47, 36, 36]} />
          {mat}
        </mesh>
        {curls.map(([x, y, z], index) => (
          <mesh key={index} position={[x, y, z]}>
            <sphereGeometry args={[0.135, 18, 18]} />
            {mat}
          </mesh>
        ))}
      </group>
    );
  }

  if (profile.hairStyle === "bun") {
    return (
      <group>
        <mesh position={[0, 0.14, -0.05]} scale={[1.02, 0.86, 0.99]}>
          <sphereGeometry args={[0.475, 40, 40]} />
          {mat}
        </mesh>
        <mesh position={[0, 0.55, -0.17]} scale={[1, 0.92, 1]}>
          <sphereGeometry args={[0.18, 24, 24]} />
          {mat}
        </mesh>
        {[-0.41, 0.41].map((x) => (
          <mesh key={x} position={[x, -0.03, -0.02]} scale={[0.55, 1.2, 0.7]}>
            <sphereGeometry args={[0.16, 20, 20]} />
            {mat}
          </mesh>
        ))}
      </group>
    );
  }

  if (profile.hairStyle === "waves") {
    return (
      <group>
        <mesh position={[0, 0.13, -0.04]} scale={[1.03, 0.88, 1]}>
          <sphereGeometry args={[0.48, 40, 40]} />
          {mat}
        </mesh>
        {[-0.4, 0.4].map((x) => (
          <group key={x}>
            <mesh position={[x, -0.22, -0.08]} scale={[0.7, 1.45, 0.72]}>
              <sphereGeometry args={[0.2, 24, 24]} />
              {mat}
            </mesh>
            <mesh position={[x * 1.02, -0.5, -0.07]} scale={[0.82, 1.2, 0.75]}>
              <sphereGeometry args={[0.15, 20, 20]} />
              {mat}
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.3, -0.36]} scale={[1, 1.6, 0.55]}>
          <sphereGeometry args={[0.3, 28, 28]} />
          {mat}
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, 0.13, -0.05]} scale={[1.03, 0.86, 0.99]}>
        <sphereGeometry args={[0.47, 40, 40]} />
        {mat}
      </mesh>
      {[
        [-0.22, 0.48, 0.16, -0.2],
        [-0.04, 0.53, 0.2, 0.08],
        [0.15, 0.5, 0.18, 0.24],
        [0.3, 0.41, 0.12, 0.42],
      ].map(([x, y, z, rz], index) => (
        <mesh key={index} position={[x!, y!, z!]} rotation={[0.12, 0, rz!]}>
          <coneGeometry args={[0.105, 0.25, 14]} />
          {mat}
        </mesh>
      ))}
    </group>
  );
}

function SquareGlassesFrame({ x, scale }: { x: number; scale: number }) {
  const material = <meshPhysicalMaterial color="#2D2D33" roughness={0.42} clearcoat={0.35} />;
  return (
    <group position={[x, 0, 0]} scale={scale}>
      <mesh position={[0, 0.115, 0]}>
        <boxGeometry args={[0.25, 0.018, 0.018]} />
        {material}
      </mesh>
      <mesh position={[0, -0.115, 0]}>
        <boxGeometry args={[0.25, 0.018, 0.018]} />
        {material}
      </mesh>
      <mesh position={[-0.116, 0, 0]}>
        <boxGeometry args={[0.018, 0.23, 0.018]} />
        {material}
      </mesh>
      <mesh position={[0.116, 0, 0]}>
        <boxGeometry args={[0.018, 0.23, 0.018]} />
        {material}
      </mesh>
    </group>
  );
}

function Glasses({ profile }: { profile: AvatarProfile }) {
  if (profile.glassesStyle === "none") return null;

  const eyeX = 0.165 * profile.eyeSpacing;
  const bridgeWidth = Math.max(0.055, eyeX * 2 - 0.23 * profile.eyeScale);

  return (
    <group position={[0, 0.055, 0.492]}>
      {profile.glassesStyle === "round" ? (
        <>
          {[-eyeX, eyeX].map((x) => (
            <mesh key={x} position={[x, 0, 0]} scale={profile.eyeScale}>
              <torusGeometry args={[0.122, 0.014, 10, 36]} />
              <meshPhysicalMaterial color="#2D2D33" roughness={0.42} clearcoat={0.35} />
            </mesh>
          ))}
        </>
      ) : (
        <>
          <SquareGlassesFrame x={-eyeX} scale={profile.eyeScale} />
          <SquareGlassesFrame x={eyeX} scale={profile.eyeScale} />
        </>
      )}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[bridgeWidth, 0.018, 0.018]} />
        <meshPhysicalMaterial color="#2D2D33" roughness={0.42} clearcoat={0.35} />
      </mesh>
    </group>
  );
}

function Head({
  profile,
  headRef,
  eyesRef,
  mouthRef,
}: {
  profile: AvatarProfile;
  headRef: RefObject<Group | null>;
  eyesRef: RefObject<Group | null>;
  mouthRef: RefObject<Mesh | null>;
}) {
  const headScale = profile.headScale;
  const cheekColor = profile.child ? "#E99786" : "#D98978";

  return (
    <group ref={headRef} scale={headScale}>
      <mesh castShadow scale={[0.91, 1.02, 0.84]}>
        <sphereGeometry args={[0.47, 64, 64]} />
        <SkinMaterial color={profile.skin} />
      </mesh>

      {[-0.43, 0.43].map((x) => (
        <mesh key={x} position={[x, -0.015, -0.015]} scale={[0.48, 1, 0.6]}>
          <sphereGeometry args={[0.095, 24, 24]} />
          <SkinMaterial color={profile.skin} />
        </mesh>
      ))}

      <Hair profile={profile} />

      <group ref={eyesRef} position={[0, 0.055, 0.382]}>
        <Eye x={-0.165} profile={profile} />
        <Eye x={0.165} profile={profile} />
      </group>

      {[-0.165, 0.165].map((x) => (
        <mesh
          key={x}
          position={[x, 0.215, 0.375]}
          rotation={[0.04, 0, x < 0 ? -0.12 : 0.12]}
          scale={[1.45, 0.32, 0.28]}
        >
          <capsuleGeometry args={[0.034, 0.13, 5, 12]} />
          <HairMaterial color={profile.hair} />
        </mesh>
      ))}

      <mesh position={[0, -0.045, 0.4]} scale={[0.62, 1.08, 0.72]}>
        <sphereGeometry args={[0.075, 22, 22]} />
        <SkinMaterial color={profile.skin} />
      </mesh>
      <mesh position={[0, 0.025, 0.35]} rotation={[Math.PI / 2, 0, 0]} scale={[0.6, 0.6, 1.35]}>
        <capsuleGeometry args={[0.035, 0.12, 5, 12]} />
        <SkinMaterial color={profile.skin} />
      </mesh>

      {[-0.27, 0.27].map((x) => (
        <mesh key={x} position={[x, -0.115, 0.345]} scale={[1.25, 0.62, 0.26]}>
          <sphereGeometry args={[0.092, 20, 20]} />
          <meshStandardMaterial color={cheekColor} transparent opacity={0.18} depthWrite={false} />
        </mesh>
      ))}

      <mesh ref={mouthRef} position={[0, -0.245, 0.386]} scale={[1.2, 0.36, 0.36]}>
        <sphereGeometry args={[0.092, 28, 28]} />
        <meshPhysicalMaterial color="#6E2932" roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.214, 0.411]} scale={[1.28, 0.18, 0.22]}>
        <sphereGeometry args={[0.085, 24, 24]} />
        <meshPhysicalMaterial color="#BE746E" roughness={0.48} sheen={0.35} />
      </mesh>
      <mesh position={[0, -0.278, 0.407]} scale={[1.22, 0.17, 0.22]}>
        <sphereGeometry args={[0.082, 24, 24]} />
        <meshPhysicalMaterial color="#B86468" roughness={0.48} sheen={0.35} />
      </mesh>
    </group>
  );
}

function Arm({
  side,
  profile,
  jointRef,
  shoulderY,
}: {
  side: -1 | 1;
  profile: AvatarProfile;
  jointRef: RefObject<Group | null>;
  shoulderY: number;
}) {
  return (
    <group
      ref={jointRef}
      position={[side * 0.43 * profile.shoulderScale, shoulderY, 0]}
      rotation={[0, 0, side * -0.12]}
    >
      <mesh position={[0, -0.18, 0]} castShadow>
        <capsuleGeometry args={[0.085, 0.27, 8, 18]} />
        <ClothMaterial color={profile.top} />
      </mesh>
      <mesh position={[0, -0.39, 0]}>
        <sphereGeometry args={[0.09, 22, 22]} />
        <SkinMaterial color={profile.skin} />
      </mesh>
      <mesh position={[0, -0.58, 0]} castShadow>
        <capsuleGeometry args={[0.075, 0.26, 8, 18]} />
        <SkinMaterial color={profile.skin} />
      </mesh>
      <mesh position={[0, -0.78, 0.035]} scale={[0.9, 1.12, 0.55]}>
        <sphereGeometry args={[0.105, 24, 24]} />
        <SkinMaterial color={profile.skin} />
      </mesh>
    </group>
  );
}

function Leg({
  side,
  profile,
  hipY,
}: {
  side: -1 | 1;
  profile: AvatarProfile;
  hipY: number;
}) {
  const legLength = profile.child ? 0.72 : 0.86;

  return (
    <group position={[side * 0.16, hipY, 0]}>
      <mesh position={[0, -legLength * 0.22, 0]} castShadow>
        <capsuleGeometry args={[0.105, legLength * 0.36, 8, 18]} />
        <ClothMaterial color={profile.bottom} />
      </mesh>
      <mesh position={[0, -legLength * 0.5, 0]}>
        <sphereGeometry args={[0.105, 18, 18]} />
        <ClothMaterial color={profile.bottom} />
      </mesh>
      <mesh position={[0, -legLength * 0.72, 0]} castShadow>
        <capsuleGeometry args={[0.095, legLength * 0.34, 8, 18]} />
        <ClothMaterial color={profile.bottom} />
      </mesh>
      <mesh
        position={[0, -legLength * 0.99, 0.07]}
        rotation={[0.12, 0, 0]}
        scale={[0.88, 0.52, 1.5]}
        castShadow
      >
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshPhysicalMaterial
          color={profile.shoes}
          roughness={0.42}
          clearcoat={0.35}
          clearcoatRoughness={0.5}
        />
      </mesh>
    </group>
  );
}

function Body({
  profile,
  refs,
}: {
  profile: AvatarProfile;
  refs: JointRefs;
}) {
  const headY = profile.child ? 1.03 : 1.18;
  const torsoY = profile.child ? 0.2 : 0.17;
  const shoulderY = profile.child ? 0.36 : 0.42;
  const hipY = profile.child ? -0.43 : -0.55;
  const torsoHeight = profile.child ? 0.69 : 0.83;

  return (
    <group scale={profile.bodyScale}>
      <group position={[0, headY, 0]}>
        <Head
          profile={profile}
          headRef={refs.head}
          eyesRef={refs.eyes}
          mouthRef={refs.mouth}
        />
      </group>

      <mesh position={[0, headY - 0.47, 0]} scale={[1, 1, 0.9]}>
        <capsuleGeometry args={[0.085, 0.12, 6, 16]} />
        <SkinMaterial color={profile.skin} />
      </mesh>

      <mesh
        position={[0, torsoY, 0]}
        scale={[profile.shoulderScale, 1, 0.7]}
        castShadow
      >
        <capsuleGeometry args={[0.31, torsoHeight, 12, 28]} />
        <ClothMaterial color={profile.top} />
      </mesh>

      <mesh position={[0, hipY + 0.17, 0]} scale={[0.95, 0.55, 0.7]} castShadow>
        <capsuleGeometry args={[0.29, 0.28, 10, 22]} />
        <ClothMaterial color={profile.bottom} />
      </mesh>

      <mesh position={[0, torsoY + 0.09, 0.29]} scale={[0.65, 0.18, 0.3]}>
        <capsuleGeometry args={[0.08, 0.28, 6, 16]} />
        <meshPhysicalMaterial color={profile.accent} roughness={0.72} />
      </mesh>

      <Arm
        side={-1}
        profile={profile}
        jointRef={refs.leftArm}
        shoulderY={shoulderY}
      />
      <Arm
        side={1}
        profile={profile}
        jointRef={refs.rightArm}
        shoulderY={shoulderY}
      />

      <Leg side={-1} profile={profile} hipY={hipY} />
      <Leg side={1} profile={profile} hipY={hipY} />
    </group>
  );
}

export default function ProceduralAvatar({ type, animation, spin }: Props) {
  const customization = useAvatarCustomizationStore((state) => state.customizations[type]);
  const profile = mergeAvatarProfile(type, customization);
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const mouth = useRef<Mesh>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const eyesBase = useRef<{ x: number; y: number } | null>(null);

  const refs = useMemo<JointRefs>(
    () => ({ head, eyes, mouth, leftArm, rightArm }),
    [],
  );

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;

    const t = state.clock.elapsedTime;
    if (spin) group.rotation.y += delta * 0.55;
    if (animation === "spin") group.rotation.y += delta * 2.2;

    let targetY = 0;
    let targetZ = 0;
    let targetYaw = group.rotation.y;

    if (animation === "jump") {
      targetY = Math.abs(Math.sin(t * 3.4)) * 0.46;
    } else if (animation === "happy") {
      targetY = Math.abs(Math.sin(t * 4.2)) * 0.24;
      targetZ = Math.sin(t * 4.2) * 0.035;
    } else if (animation === "dance") {
      targetY = Math.abs(Math.sin(t * 5)) * 0.12;
      targetZ = Math.sin(t * 2.8) * 0.13;
      targetYaw = Math.sin(t * 1.8) * 0.42;
    } else if (animation === "sad") {
      targetY = -0.08;
      targetZ = 0.02;
    } else if (animation !== "spin") {
      targetY = Math.sin(t * 1.7) * 0.025;
    }

    group.position.y = MathUtils.damp(group.position.y, targetY, 7, delta);
    group.rotation.z = MathUtils.damp(group.rotation.z, targetZ, 7, delta);
    if (animation === "dance") {
      group.rotation.y = MathUtils.damp(group.rotation.y, targetYaw, 5, delta);
    }

    const headNode = head.current;
    if (headNode) {
      let x = faceState.pitch * 0.48 + Math.sin(t * 1.5) * 0.008;
      let y = -faceState.yaw * 0.62;
      let z = -faceState.roll * 0.48;

      if (animation === "nod") x += Math.sin(t * 5.2) * 0.25;
      if (animation === "sad") {
        x += 0.24;
        z += 0.08;
      }
      if (animation === "think") {
        z += 0.2;
        y += 0.12;
      }
      if (animation === "happy") x -= 0.07;

      headNode.rotation.x = MathUtils.damp(headNode.rotation.x, x, 8, delta);
      headNode.rotation.y = MathUtils.damp(headNode.rotation.y, y, 8, delta);
      headNode.rotation.z = MathUtils.damp(headNode.rotation.z, z, 8, delta);
    }

    const eyesNode = eyes.current;
    if (eyesNode) {
      if (!eyesBase.current) {
        eyesBase.current = { x: eyesNode.position.x, y: eyesNode.position.y };
      }
      eyesNode.position.x = MathUtils.damp(
        eyesNode.position.x,
        eyesBase.current.x - faceState.eyeX * 0.045,
        10,
        delta,
      );
      eyesNode.position.y = MathUtils.damp(
        eyesNode.position.y,
        eyesBase.current.y - faceState.eyeY * 0.035,
        10,
        delta,
      );
      const blink = Math.max(faceState.blinkLeft, faceState.blinkRight);
      eyesNode.scale.y = MathUtils.damp(eyesNode.scale.y, 1 - blink * 0.72, 14, delta);
    }

    const mouthNode = mouth.current;
    if (mouthNode) {
      const open = faceState.mouthOpen > 0.08 ? faceState.mouthOpen : 0;
      const smile = MathUtils.clamp(faceState.smile + (animation === "happy" ? 0.45 : 0), 0, 1);
      mouthNode.scale.y = MathUtils.damp(mouthNode.scale.y, 0.36 + open * 1.7 - smile * 0.08, 12, delta);
      mouthNode.scale.x = MathUtils.damp(mouthNode.scale.x, 1.2 - open * 0.12 + smile * 0.35, 12, delta);
      mouthNode.scale.z = MathUtils.damp(mouthNode.scale.z, 0.36 + open * 0.42, 12, delta);
    }

    const left = leftArm.current;
    const right = rightArm.current;
    if (left && right) {
      let leftZ = 0.12;
      let rightZ = -0.12;
      let leftX = 0;
      let rightX = 0;

      if (animation === "wave" || animation === "bye") {
        rightZ = -2.25 + Math.sin(t * (animation === "wave" ? 8 : 5)) * 0.34;
        rightX = 0.18;
      } else if (animation === "clap") {
        leftZ = 1.15 + Math.abs(Math.sin(t * 8)) * 0.26;
        rightZ = -1.15 - Math.abs(Math.sin(t * 8)) * 0.26;
        leftX = rightX = 0.38;
      } else if (animation === "happy") {
        leftZ = 2.3 + Math.sin(t * 5) * 0.12;
        rightZ = -2.3 - Math.sin(t * 5) * 0.12;
      } else if (animation === "dance") {
        leftZ = 1.25 + Math.sin(t * 4.8) * 0.7;
        rightZ = -1.25 - Math.sin(t * 4.8) * 0.7;
      } else if (animation === "think") {
        rightZ = -2.05;
        rightX = 0.5;
      } else if (animation === "sad") {
        leftZ = -0.04;
        rightZ = 0.04;
      }

      left.rotation.z = MathUtils.damp(left.rotation.z, leftZ, 8, delta);
      right.rotation.z = MathUtils.damp(right.rotation.z, rightZ, 8, delta);
      left.rotation.x = MathUtils.damp(left.rotation.x, leftX, 8, delta);
      right.rotation.x = MathUtils.damp(right.rotation.x, rightX, 8, delta);
    }
  });

  return (
    <group ref={root}>
      <Body profile={profile} refs={refs} />
    </group>
  );
}
