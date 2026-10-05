import { ContactShadows, Environment, Lightformer, useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, Suspense, type ReactNode } from "react";

import { mergeAvatarProfile } from "@/lib/avatarCatalog";
import { useAvatarCustomizationStore } from "@/lib/avatarCustomization";
import type { AnimationType, CharacterType } from "@/lib/store";

import ProceduralAvatar from "./ProceduralAvatar";
import ReadyPlayerMeAvatar from "./ReadyPlayerMeAvatar";

function Backdrop({ url }: { url: string }) {
  const texture = useTexture(url);
  return (
    <mesh position={[0, 0.25, -6]}>
      <planeGeometry args={[26, 14.6]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

type BoundaryProps = {
  resetKey: string;
  fallback: ReactNode;
  children: ReactNode;
};

type BoundaryState = {
  failed: boolean;
};

class AvatarErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidUpdate(previous: BoundaryProps) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Avatar({
  type,
  animation,
  spin,
}: {
  type: CharacterType;
  animation: AnimationType;
  spin: boolean;
}) {
  const customization = useAvatarCustomizationStore((state) => state.customizations[type]);
  const profile = mergeAvatarProfile(type, customization);
  const renderMode = useAvatarCustomizationStore((state) => state.renderModes[type]);
  const fallback = <ProceduralAvatar type={type} animation={animation} spin={spin} />;

  if (renderMode === "custom") return fallback;
  if (!profile.modelUrl) return fallback;
  if (renderMode === "readyplayerme" || renderMode === "auto") {
    return (
    <AvatarErrorBoundary resetKey={profile.modelUrl} fallback={fallback}>
      <Suspense fallback={fallback}>
        <ReadyPlayerMeAvatar
          type={type}
          url={profile.modelUrl}
          animation={animation}
          spin={spin}
        />
      </Suspense>
    </AvatarErrorBoundary>
    );
  }

  return fallback;
}

export type ThreeDCharacterProps = {
  type: CharacterType;
  animation?: AnimationType;
  spin?: boolean;
  transparent?: boolean;
  className?: string;
  /** صورة خلفية تُرسم داخل المشهد وتظهر أيضاً في الفيديو المسجل. */
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
      dpr={[1, 1.75]}
      gl={{
        alpha: true,
        preserveDrawingBuffer: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 0.35, 4.35], fov: 39, near: 0.1, far: 100 }}
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

      <hemisphereLight args={["#FFF8EE", "#6E7A86", 0.65]} />
      <directionalLight
        position={[3.2, 5, 4.2]}
        intensity={2.2}
        color="#FFF4E8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00035}
        shadow-radius={6}
      />
      <directionalLight position={[-3.5, 2.2, 3]} intensity={0.7} color="#D7E8FF" />
      <spotLight
        position={[0, 4.5, -3.5]}
        intensity={4.2}
        angle={0.65}
        penumbra={1}
        color="#FFE0B8"
      />

      <Suspense fallback={null}>
        <Avatar type={type} animation={animation} spin={spin} />
      </Suspense>

      {!transparent && (
        <ContactShadows
          position={[0, -1.42, 0]}
          opacity={0.38}
          blur={2.6}
          scale={5.5}
          far={3.2}
          resolution={1024}
        />
      )}

      {/* إضاءة استوديو محلية بالكامل (بدون تحميل ملفات HDR خارجية قد يفشل جلبها) */}
      <Environment resolution={256} environmentIntensity={0.62}>
        <Lightformer form="rect" intensity={3} color="#FFF4E8" position={[0, 4, 2]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#D7E8FF" position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#FFE0B8" position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="ring" intensity={1} color="#FFFFFF" position={[0, 1, -5]} scale={3} />
      </Environment>
    </Canvas>
  );
}
