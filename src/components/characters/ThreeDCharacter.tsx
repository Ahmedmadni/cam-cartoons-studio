import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, useTexture } from "@react-three/drei";
import { Suspense, useRef } from "react";
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

type HairStyle = "shortMessy" | "curly" | "bun" | "longWavy";

type Look = {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes: string;
  eye: string;
  hairStyle: HairStyle;
  /** نسب طفولية (رأس أكبر) مقابل نسب أكبر سناً */
  kid: boolean;
};

const LOOKS: Record<CharacterType, Look> = {
  boy: {
    skin: "#F4C9A6",
    hair: "#5B3421",
    shirt: "#FFFFFF",
    pants: "#27364F",
    shoes: "#FDE047",
    eye: "#5B3421",
    hairStyle: "shortMessy",
    kid: true,
  },
  girl: {
    skin: "#F7D2B4",
    hair: "#3F2416",
    shirt: "#FFF6EF",
    pants: "#7FA9D6",
    shoes: "#FFFFFF",
    eye: "#4A2C17",
    hairStyle: "bun",
    kid: true,
  },
  man: {
    skin: "#EFC09B",
    hair: "#2E1C12",
    shirt: "#1F2937",
    pants: "#EFE6D6",
    shoes: "#FFFFFF",
    eye: "#3B2314",
    hairStyle: "curly",
    kid: false,
  },
  woman: {
    skin: "#F6CDAE",
    hair: "#4A2A18",
    shirt: "#F59E0B",
    pants: "#8FB2D9",
    shoes: "#FFFFFF",
    eye: "#4A2A18",
    hairStyle: "longWavy",
    kid: false,
  },
};

/** بشرة شبه واقعية: لمعان ناعم (sheen) وانعكاس خفيف يحاكي التشتت تحت السطح */
function SkinMat({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.48}
      sheen={0.6}
      sheenRoughness={0.5}
      sheenColor="#FFB8A0"
      clearcoat={0.08}
      clearcoatRoughness={0.6}
      specularIntensity={0.35}
    />
  );
}

/** قماش: خشونة عالية مع لمعان أطراف خفيف */
function FabricMat({ color }: { color: string }) {
  return <meshPhysicalMaterial color={color} roughness={0.85} sheen={1} sheenRoughness={0.8} sheenColor="#FFFFFF" />;
}

/** شعر: لمعان اتجاهي خفيف */
function HairMat({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial color={color} roughness={0.42} sheen={0.8} sheenRoughness={0.35} sheenColor="#B98A60" clearcoat={0.25} clearcoatRoughness={0.4} />
  );
}

function Eyes({
  look,
  groupRef,
  spread = 0.2,
  z = 0.5,
  y = 0.02,
  size = 0.115,
}: {
  look: Look;
  groupRef?: React.RefObject<Group | null>;
  spread?: number;
  z?: number;
  y?: number;
  size?: number;
}) {
  return (
    <group ref={groupRef ?? null} position={[0, y, z]}>
      {[-spread, spread].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {/* بياض العين */}
          <mesh>
            <sphereGeometry args={[size, 24, 24]} />
            <meshPhysicalMaterial color="#F7F4F0" roughness={0.15} clearcoat={1} clearcoatRoughness={0.05} />
          </mesh>
          {/* القزحية */}
          <mesh position={[0, 0, size * 0.72]}>
            <sphereGeometry args={[size * 0.62, 20, 20]} />
            <meshPhysicalMaterial color={look.eye} roughness={0.25} clearcoat={1} clearcoatRoughness={0.02} sheen={0.4} sheenColor="#C08850" />
          </mesh>
          {/* البؤبؤ + لمعة */}
          <mesh position={[0, 0, size * 0.95]}>
            <sphereGeometry args={[size * 0.3, 16, 16]} />
            <meshPhysicalMaterial color="#0A0A0A" roughness={0.05} clearcoat={1} />
          </mesh>
          <mesh position={[size * 0.22, size * 0.28, size * 1.0]}>
            <sphereGeometry args={[size * 0.16, 12, 12]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.5} />
          </mesh>
          {/* الجفن العلوي ورموش لإحساس أكثر واقعية */}
          <mesh position={[0, size * 0.18, size * 0.05]} rotation={[-0.35, 0, 0]}>
            <sphereGeometry args={[size * 1.07, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
            <SkinMat color={look.skin} />
          </mesh>
          <mesh position={[0, size * 0.62, size * 0.78]} rotation={[0.5, 0, 0]}>
            <torusGeometry args={[size * 0.82, size * 0.07, 6, 24, Math.PI]} />
            <meshStandardMaterial color="#1A0F0A" roughness={0.6} />
          </mesh>
          {/* الحاجب */}
          <mesh position={[0, size * 1.5, size * 0.6]} rotation={[0, 0, Math.PI / 2 + (x > 0 ? -0.12 : 0.12)]}>
            <capsuleGeometry args={[size * 0.12, size * 1.2, 4, 12]} />
            <HairMat color={look.hair} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Hair({ look }: { look: Look }) {
  const { hair, hairStyle } = look;
  const mat = <HairMat color={hair} />;

  if (hairStyle === "curly") {
    return (
      <group>
        <mesh position={[0, 0.16, -0.02]} scale={[1.06, 0.95, 1.06]}>
          <sphereGeometry args={[0.53, 48, 48]} />
          {mat}
        </mesh>
        {[
          [-0.36, 0.4, 0.16],
          [0.36, 0.4, 0.16],
          [0, 0.58, 0.22],
          [-0.2, 0.6, -0.2],
          [0.24, 0.56, -0.24],
          [-0.44, 0.24, -0.18],
          [0.44, 0.24, -0.18],
        ].map(([x, y, z], i) => (
          <mesh key={i} position={[x!, y!, z!]}>
            <sphereGeometry args={[0.17, 18, 18]} />
            {mat}
          </mesh>
        ))}
      </group>
    );
  }

  if (hairStyle === "bun") {
    return (
      <group>
        <mesh position={[0, 0.14, -0.02]} scale={[1.04, 0.92, 1.04]}>
          <sphereGeometry args={[0.52, 48, 48]} />
          {mat}
        </mesh>
        <mesh position={[0, 0.66, -0.12]}>
          <sphereGeometry args={[0.22, 20, 20]} />
          {mat}
        </mesh>
        {[-0.46, 0.46].map((x) => (
          <mesh key={x} position={[x, 0.05, 0.05]} scale={[0.5, 1.1, 0.6]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            {mat}
          </mesh>
        ))}
      </group>
    );
  }

  if (hairStyle === "longWavy") {
    return (
      <group>
        <mesh position={[0, 0.15, -0.02]} scale={[1.06, 0.95, 1.06]}>
          <sphereGeometry args={[0.53, 48, 48]} />
          {mat}
        </mesh>
        {[-0.44, 0.44].map((x) => (
          <group key={x}>
            <mesh position={[x, -0.25, -0.06]} scale={[0.65, 1.5, 0.8]}>
              <sphereGeometry args={[0.24, 18, 18]} />
              {mat}
            </mesh>
            <mesh position={[x * 1.02, -0.62, -0.06]}>
              <sphereGeometry args={[0.16, 16, 16]} />
              {mat}
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.2, -0.4]} scale={[1, 1.5, 0.7]}>
          <sphereGeometry args={[0.36, 20, 20]} />
          {mat}
        </mesh>
      </group>
    );
  }

  // shortMessy
  return (
    <group>
      <mesh position={[0, 0.17, -0.03]} scale={[1.04, 0.9, 1.04]}>
        <sphereGeometry args={[0.52, 48, 48]} />
        {mat}
      </mesh>
      {[
        [-0.16, 0.56, 0.2],
        [0.14, 0.6, 0.1],
        [0.3, 0.5, 0.24],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x!, y!, z!]} rotation={[0.3, 0, i * 0.4 - 0.3]}>
          <coneGeometry args={[0.13, 0.26, 12]} />
          {mat}
        </mesh>
      ))}
    </group>
  );
}

function Human({ type, headRef, eyesRef, mouthRef }: { type: CharacterType } & PartRefs) {
  const look = LOOKS[type];
  const headScale = look.kid ? 1.08 : 0.92;
  const headY = look.kid ? 1.0 : 1.12;
  const bodyH = look.kid ? 0.9 : 1.05;

  return (
    <group>
      {/* الرأس */}
      <group ref={headRef} position={[0, headY, 0]} scale={headScale}>
        <mesh castShadow scale={[1, 1.08, 0.95]}>
          <sphereGeometry args={[0.5, 64, 64]} />
          <SkinMat color={look.skin} />
        </mesh>
        {/* الأذنان */}
        {[-0.48, 0.48].map((x) => (
          <mesh key={x} position={[x, -0.02, 0]} scale={[0.5, 1, 0.7]}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <SkinMat color={look.skin} />
          </mesh>
        ))}
        <Hair look={look} />
        <Eyes look={look} groupRef={eyesRef} y={0.05} z={0.4} spread={0.19} />
        {/* الأنف */}
        <mesh position={[0, -0.09, 0.47]}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <SkinMat color={look.skin} />
        </mesh>
        {/* الوجنتان */}
        {[-0.28, 0.28].map((x) => (
          <mesh key={x} position={[x, -0.1, 0.4]} scale={[1, 0.7, 0.4]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#E8907E" transparent opacity={0.22} roughness={0.9} depthWrite={false} />
          </mesh>
        ))}
        {/* الفم (يتحرك مع تتبع الوجه) */}
        <mesh ref={mouthRef} position={[0, -0.26, 0.42]}>
          <sphereGeometry args={[0.11, 20, 20]} />
          <meshPhysicalMaterial color="#8E2F3C" roughness={0.35} clearcoat={0.5} clearcoatRoughness={0.25} />
        </mesh>
        <mesh position={[0, -0.235, 0.46]} scale={[1, 0.35, 0.3]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshPhysicalMaterial color="#C9746F" roughness={0.3} clearcoat={0.7} sheen={0.5} sheenColor="#F2B0A8" />
        </mesh>
      </group>

      {/* الرقبة */}
      <mesh position={[0, headY - 0.5, 0]}>
        <cylinderGeometry args={[0.11, 0.13, 0.16, 16]} />
        <SkinMat color={look.skin} />
      </mesh>

      {/* الجذع (قميص) */}
      <mesh position={[0, headY - 1.05, 0]} scale={[1, 1, 0.72]} castShadow>
        <capsuleGeometry args={[0.32, bodyH * 0.6, 10, 24]} />
        <FabricMat color={look.shirt} />
      </mesh>

      {/* الذراع اليسرى (اليمنى تُحرَّك في Model) */}
      <group position={[-0.4, headY - 0.95, 0]} rotation={[0, 0, 0.15]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.09, 0.42, 8, 16]} />
          <FabricMat color={look.shirt} />
        </mesh>
        <mesh position={[0, -0.34, 0]}>
          <sphereGeometry args={[0.1, 32, 32]} />
          <SkinMat color={look.skin} />
        </mesh>
      </group>

      {/* السروال والأرجل */}
      {[-0.16, 0.16].map((x) => (
        <group key={x} position={[x, headY - 1.72, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.115, 0.5, 8, 16]} />
            <FabricMat color={look.pants} />
          </mesh>
          <mesh position={[0, -0.42, 0.07]} scale={[1, 0.6, 1.5]} castShadow>
            <sphereGeometry args={[0.13, 18, 18]} />
            <meshPhysicalMaterial color={look.shoes} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.3} />
          </mesh>
        </group>
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
  const look = LOOKS[type];
  const headY = look.kid ? 1.0 : 1.12;

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    if (spin) g.rotation.y += delta * 0.6;
    if (animation === "spin") g.rotation.y += delta * 2.4;

    // ===== مكتبة الحركات (performAction) =====
    if (animation === "jump" || animation === "happy") {
      const speed = animation === "happy" ? 4.2 : 3.2;
      g.position.y = Math.abs(Math.sin(t * speed)) * (animation === "happy" ? 0.32 : 0.55);
      g.rotation.z = Math.sin(t * speed) * 0.05;
    } else if (animation === "dance") {
      g.position.y = Math.abs(Math.sin(t * 5)) * 0.14;
      g.rotation.z = Math.sin(t * 2.5) * 0.16;
      g.rotation.y = MathUtils.damp(g.rotation.y, Math.sin(t * 1.6) * 0.5, 4, delta);
    } else if (animation === "sad") {
      g.position.y = MathUtils.damp(g.position.y, -0.12 + Math.sin(t * 0.9) * 0.02, 3, delta);
      g.rotation.z = 0;
    } else {
      g.position.y = Math.sin(t * 1.6) * 0.06;
      g.rotation.z = 0;
    }

    if (armGroup.current) {
      const arm = armGroup.current;
      let targetZ = -0.15 + Math.sin(t * 1.6) * 0.08;
      let targetX = 0;
      if (animation === "wave") targetZ = -2.2 + Math.sin(t * 8) * 0.5;
      else if (animation === "bye") targetZ = -2.4 + Math.sin(t * 4) * 0.6;
      else if (animation === "clap") targetZ = -1.5 + Math.abs(Math.sin(t * 9)) * 0.9;
      else if (animation === "happy") targetZ = -2.6 + Math.sin(t * 6) * 0.2;
      else if (animation === "dance") targetZ = -1.9 + Math.sin(t * 5) * 0.7;
      else if (animation === "think") {
        targetZ = -2.75;
        targetX = 0.35;
      } else if (animation === "sad") targetZ = 0.1;
      arm.rotation.z = MathUtils.damp(arm.rotation.z, targetZ, 8, delta);
      arm.rotation.x = MathUtils.damp(arm.rotation.x, targetX, 8, delta);
    }

    // ===== حركة الرأس حسب الحركة (وتبقى طبقة faceState متوافقة) =====
    const head = headRef.current;
    if (head) {
      let hx = faceState.pitch * 0.5 + (animation === "jump" ? 0 : Math.sin(t * 1.6) * 0.01);
      let hy = -faceState.yaw * 0.7;
      let hz = -faceState.roll * 0.5;
      if (animation === "nod") hx += 0.28 + Math.sin(t * 5) * 0.22;
      else if (animation === "sad") {
        hx += 0.34;
        hz += 0.1;
      } else if (animation === "think") {
        hz += 0.28;
        hy += 0.2;
      } else if (animation === "happy") hx -= 0.1;
      else if (animation === "bye" || animation === "wave") hz += Math.sin(t * 4) * 0.06;
      head.rotation.y = MathUtils.damp(head.rotation.y, hy, 6, delta);
      head.rotation.x = MathUtils.damp(head.rotation.x, hx, 6, delta);
      head.rotation.z = MathUtils.damp(head.rotation.z, hz, 6, delta);
    }

    const eyes = eyesRef.current;
    if (eyes) {
      if (!eyesBase.current) eyesBase.current = { x: eyes.position.x, y: eyes.position.y };
      eyes.position.x = MathUtils.damp(
        eyes.position.x,
        eyesBase.current.x - faceState.eyeX * 0.1,
        8,
        delta,
      );
      eyes.position.y = MathUtils.damp(
        eyes.position.y,
        eyesBase.current.y - faceState.eyeY * 0.07,
        8,
        delta,
      );
    }

    const mouth = mouthRef.current;
    if (mouth) {
      const open = faceState.mouthOpen > 0.1 ? faceState.mouthOpen : 0;
      mouth.scale.y = MathUtils.damp(mouth.scale.y, 0.5 + open * 2.2, 10, delta);
      mouth.scale.x = MathUtils.damp(mouth.scale.x, 1.15 - open * 0.15, 10, delta);
      mouth.scale.z = MathUtils.damp(mouth.scale.z, 0.6 + open * 0.4, 10, delta);
    }
  });

  return (
    <group ref={group}>
      <Human type={type} headRef={headRef} eyesRef={eyesRef} mouthRef={mouthRef} />
      <group ref={armGroup} position={[0.4, headY - 0.95, 0]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.42, 8, 16]} />
          <FabricMat color={look.shirt} />
        </mesh>
        <mesh position={[0, -0.46, 0]}>
          <sphereGeometry args={[0.1, 32, 32]} />
          <SkinMat color={look.skin} />
        </mesh>
      </group>
    </group>
  );
}

function Backdrop({ url }: { url: string }) {
  const texture = useTexture(url);
  return (
    <mesh position={[0, 0.4, -6]}>
      <planeGeometry args={[26, 14.6]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

export type ThreeDCharacterProps = {
  type: CharacterType;
  animation?: AnimationType;
  spin?: boolean;
  transparent?: boolean;
  className?: string;
  /** صورة خلفية تُرسم داخل المشهد (تظهر في الفيديو المسجَّل) */
  backgroundUrl?: string;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

export default function ThreeDCharacter({
  type,
  animation = "idle",
  spin = true,
  transparent = false,
  className,
  backgroundUrl,
  onCanvasReady,
}: ThreeDCharacterProps) {
  return (
    <Canvas
      className={className}
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true, preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [0, 0.5, 4.6], fov: 42 }}
      onCreated={({ gl }) => {
        gl.setClearAlpha(0);
        onCanvasReady?.(gl.domElement);
      }}
    >
      {backgroundUrl && (
        <Suspense fallback={null}>
          <Backdrop url={backgroundUrl} />
        </Suspense>
      )}
      {/* إضاءة ثلاثية (رئيسية/تعبئة/حافة) بأسلوب التصوير السينمائي */}
      <hemisphereLight args={["#FFF4E6", "#8A6A55", 0.45]} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={2}
        color="#FFF1E0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-radius={6}
      />
      <directionalLight position={[-3.5, 1.5, 3]} intensity={0.55} color="#CFE3FF" />
      <spotLight position={[0, 3, -4]} intensity={6} angle={0.7} penumbra={1} color="#FFE2B8" />
      <group position={[0, -0.4, 0]}>
        <Model type={type} animation={animation} spin={spin} />
        {!transparent && (
          <ContactShadows position={[0, -1.45, 0]} opacity={0.5} blur={2.2} scale={6} far={3} resolution={1024} />
        )}
      </group>
      <Environment preset="apartment" environmentIntensity={0.7} />
    </Canvas>
  );
}
