import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { useRef } from "react";
import { MathUtils } from "three";
import type { Group, Mesh } from "three";

import type { AnimationType, CharacterType } from "@/lib/store";
import { faceState } from "@/lib/faceState";

type ModelProps = {
  type: CharacterType;
  animation: AnimationType;
  spin: boolean;
};

type PartRefs = {
  headRef: React.RefObject<Group | null>;
  eyesRef: React.RefObject<Group | null>;
  mouthRef: React.RefObject<Mesh | null>;
};

const PALETTE: Record<CharacterType, { main: string; accent: string; extra: string }> = {
  robot: { main: "#14B8A6", accent: "#F59E0B", extra: "#FDE047" },
  bear: { main: "#C1783C", accent: "#FDE047", extra: "#F59E0B" },
  rabbit: { main: "#F8E7DC", accent: "#F59E0B", extra: "#14B8A6" },
  dino: { main: "#3FBF6F", accent: "#FDE047", extra: "#F59E0B" },
};

function Eyes({
  y = 0,
  z = 0.62,
  spread = 0.24,
  groupRef,
}: {
  y?: number;
  z?: number;
  spread?: number;
  groupRef?: React.RefObject<Group | null>;
}) {
  return (
    <group ref={groupRef ?? null} position={[0, y, z]}>
      {[-spread, spread].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <sphereGeometry args={[0.09, 20, 20]} />
          <meshStandardMaterial color="#1F2937" />
        </mesh>
      ))}
    </group>
  );
}

function Body({ type, headRef, eyesRef, mouthRef }: { type: CharacterType } & PartRefs) {
  const c = PALETTE[type];

  if (type === "robot") {
    return (
      <group>
        <group ref={headRef} position={[0, 0.95, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.05, 0.9, 0.9]} />
            <meshStandardMaterial color={c.main} roughness={0.35} metalness={0.25} />
          </mesh>
          <Eyes y={0.05} z={0.47} groupRef={eyesRef} />
          <mesh ref={mouthRef} position={[0, -0.24, 0.47]}>
            <boxGeometry args={[0.42, 0.09, 0.05]} />
            <meshStandardMaterial color={c.extra} emissive={c.extra} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 12]} />
            <meshStandardMaterial color={c.accent} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <sphereGeometry args={[0.14, 18, 18]} />
            <meshStandardMaterial color={c.extra} emissive={c.extra} emissiveIntensity={0.4} />
          </mesh>
        </group>
        <mesh position={[0, -0.1, 0]} castShadow>
          <boxGeometry args={[1.2, 1.2, 0.85]} />
          <meshStandardMaterial color={c.accent} roughness={0.4} />
        </mesh>
        {[-0.85, 0.85].map((x) => (
          <mesh key={x} position={[x, -0.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.6, 16]} />
            <meshStandardMaterial color={c.main} />
          </mesh>
        ))}
        {[-0.32, 0.32].map((x) => (
          <mesh key={x} position={[x, -1.05, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.75, 16]} />
            <meshStandardMaterial color={c.main} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === "bear") {
    return (
      <group>
        <group ref={headRef} position={[0, 0.95, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.62, 32, 32]} />
            <meshStandardMaterial color={c.main} roughness={0.9} />
          </mesh>
          {[-0.45, 0.45].map((x) => (
            <mesh key={x} position={[x, 0.45, 0]} castShadow>
              <sphereGeometry args={[0.2, 24, 24]} />
              <meshStandardMaterial color={c.main} roughness={0.9} />
            </mesh>
          ))}
          <Eyes y={0.07} z={0.5} spread={0.22} groupRef={eyesRef} />
          <mesh ref={mouthRef} position={[0, -0.13, 0.55]}>
            <sphereGeometry args={[0.16, 20, 20]} />
            <meshStandardMaterial color={c.accent} />
          </mesh>
        </group>
        <mesh position={[0, -0.15, 0]} scale={[1, 1.15, 0.9]} castShadow>
          <sphereGeometry args={[0.7, 32, 32]} />
          <meshStandardMaterial color={c.main} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.2, 0.55]} scale={[0.75, 0.9, 0.5]}>
          <sphereGeometry args={[0.45, 24, 24]} />
          <meshStandardMaterial color={c.accent} roughness={0.9} />
        </mesh>
        {[-0.72, 0.72].map((x) => (
          <mesh key={x} position={[x, -0.05, 0]} castShadow>
            <sphereGeometry args={[0.24, 20, 20]} />
            <meshStandardMaterial color={c.main} roughness={0.9} />
          </mesh>
        ))}
        {[-0.32, 0.32].map((x) => (
          <mesh key={x} position={[x, -1.05, 0.05]} castShadow>
            <sphereGeometry args={[0.27, 20, 20]} />
            <meshStandardMaterial color={c.main} roughness={0.9} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === "rabbit") {
    return (
      <group>
        <group ref={headRef} position={[0, 1.0, 0]}>
          {[-0.22, 0.22].map((x, i) => (
            <mesh key={x} position={[x, 0.75, 0]} rotation={[0, 0, i === 0 ? 0.18 : -0.18]} castShadow>
              <capsuleGeometry args={[0.12, 0.55, 8, 20]} />
              <meshStandardMaterial color={c.main} roughness={0.85} />
            </mesh>
          ))}
          <mesh castShadow>
            <sphereGeometry args={[0.55, 32, 32]} />
            <meshStandardMaterial color={c.main} roughness={0.85} />
          </mesh>
          <Eyes y={0.05} z={0.46} spread={0.2} groupRef={eyesRef} />
          <mesh ref={mouthRef} position={[0, -0.1, 0.53]}>
            <sphereGeometry args={[0.1, 18, 18]} />
            <meshStandardMaterial color={c.accent} />
          </mesh>
        </group>
        <mesh position={[0, -0.1, 0]} scale={[1, 1.2, 0.95]} castShadow>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial color={c.main} roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.25, -0.62]}>
          <sphereGeometry args={[0.22, 20, 20]} />
          <meshStandardMaterial color={c.extra} roughness={0.85} />
        </mesh>
        {[-0.62, 0.62].map((x) => (
          <mesh key={x} position={[x, -0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <capsuleGeometry args={[0.14, 0.3, 8, 16]} />
            <meshStandardMaterial color={c.main} roughness={0.85} />
          </mesh>
        ))}
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} position={[x, -0.95, 0.12]} castShadow>
            <capsuleGeometry args={[0.18, 0.22, 8, 16]} />
            <meshStandardMaterial color={c.main} roughness={0.85} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group>
      <group ref={headRef} position={[0.12, 0.95, 0.18]}>
        <mesh scale={[1, 0.85, 1.25]} castShadow>
          <sphereGeometry args={[0.55, 32, 32]} />
          <meshStandardMaterial color={c.main} roughness={0.7} />
        </mesh>
        <Eyes y={0.17} z={0.57} spread={0.24} groupRef={eyesRef} />
        <mesh ref={mouthRef} position={[0, -0.2, 0.5]}>
          <boxGeometry args={[0.4, 0.1, 0.12]} />
          <meshStandardMaterial color={c.accent} roughness={0.6} />
        </mesh>
      </group>
      <mesh position={[0, -0.1, 0]} scale={[1, 1.05, 1.1]} castShadow>
        <sphereGeometry args={[0.68, 32, 32]} />
        <meshStandardMaterial color={c.main} roughness={0.7} />
      </mesh>
      {[0.35, 0.75, 1.1].map((y, i) => (
        <mesh key={y} position={[0, y - 0.1, -0.55 + i * 0.08]} rotation={[0, 0, Math.PI / 4]}>
          <coneGeometry args={[0.14, 0.28, 4]} />
          <meshStandardMaterial color={c.accent} />
        </mesh>
      ))}
      <mesh position={[0, -0.35, -0.85]} rotation={[Math.PI / 2.2, 0, 0]} castShadow>
        <coneGeometry args={[0.28, 1.1, 20]} />
        <meshStandardMaterial color={c.main} roughness={0.7} />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, -0.05, 0.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.13, 0.25, 8, 16]} />
          <meshStandardMaterial color={c.main} roughness={0.7} />
        </mesh>
      ))}
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, -1.0, 0.05]} castShadow>
          <capsuleGeometry args={[0.2, 0.28, 8, 16]} />
          <meshStandardMaterial color={c.extra} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Model({ type, animation, spin }: ModelProps) {
  const group = useRef<Group>(null);
  const armGroup = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const eyesRef = useRef<Group>(null);
  const mouthRef = useRef<Mesh>(null);
  const eyesBase = useRef<{ x: number; y: number } | null>(null);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    if (spin) g.rotation.y += delta * 0.6;
    if (animation === "spin") g.rotation.y += delta * 2.4;

    if (animation === "jump") {
      g.position.y = Math.abs(Math.sin(t * 3.2)) * 0.55;
      g.rotation.z = Math.sin(t * 3.2) * 0.05;
    } else {
      g.position.y = Math.sin(t * 1.6) * 0.06;
      g.rotation.z = 0;
    }

    if (armGroup.current) {
      armGroup.current.rotation.z =
        animation === "wave" ? -0.9 + Math.sin(t * 8) * 0.5 : Math.sin(t * 1.6) * 0.08;
    }

    // ===== طبقة تتبع الوجه: تُطبّق فوق الأنميشنات الحالية (مع تنعيم damp) =====
    const head = headRef.current;
    if (head) {
      head.rotation.y = MathUtils.damp(head.rotation.y, -faceState.yaw * 0.7, 6, delta);
      head.rotation.x = MathUtils.damp(
        head.rotation.x,
        faceState.pitch * 0.5 + (animation === "jump" ? 0 : Math.sin(t * 1.6) * 0.01),
        6,
        delta,
      );
      head.rotation.z = MathUtils.damp(head.rotation.z, -faceState.roll * 0.5, 6, delta);
    }

    const eyes = eyesRef.current;
    if (eyes) {
      if (!eyesBase.current) eyesBase.current = { x: eyes.position.x, y: eyes.position.y };
      eyes.position.x = MathUtils.damp(
        eyes.position.x,
        eyesBase.current.x - faceState.eyeX * 0.12,
        8,
        delta,
      );
      eyes.position.y = MathUtils.damp(
        eyes.position.y,
        eyesBase.current.y - faceState.eyeY * 0.08,
        8,
        delta,
      );
    }

    const mouth = mouthRef.current;
    if (mouth) {
      const open = faceState.mouthOpen > 0.1 ? faceState.mouthOpen : 0;
      mouth.scale.y = MathUtils.damp(mouth.scale.y, 1 + open * 2.2, 10, delta);
      mouth.scale.z = MathUtils.damp(mouth.scale.z, 1 + open * 0.4, 10, delta);
    }

  });

  return (
    <group ref={group}>
      <Body type={type} headRef={headRef} eyesRef={eyesRef} mouthRef={mouthRef} />
      <group ref={armGroup} position={[0.85, 0.15, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.4, 8, 16]} />
          <meshStandardMaterial color={PALETTE[type].accent} />
        </mesh>
      </group>
    </group>
  );
}

export type ThreeDCharacterProps = {
  type: CharacterType;
  animation?: AnimationType;
  spin?: boolean;
  transparent?: boolean;
  className?: string;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

export default function ThreeDCharacter({
  type,
  animation = "idle",
  spin = true,
  transparent = false,
  className,
  onCanvasReady,
}: ThreeDCharacterProps) {
  return (
    <Canvas
      className={className}
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true, preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [0, 0.9, 4.6], fov: 42 }}
      onCreated={({ gl }) => {
        gl.setClearAlpha(0);
        onCanvasReady?.(gl.domElement);
      }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#FDE047" />
      <group position={[0, -0.35, 0]}>
        <Model type={type} animation={animation} spin={spin} />
        {!transparent && (
          <ContactShadows position={[0, -1.45, 0]} opacity={0.35} blur={2.6} scale={6} far={3} />
        )}
      </group>
      <Environment preset="sunset" />
    </Canvas>
  );
}
