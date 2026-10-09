import { ContactShadows, Environment, Lightformer, useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, Suspense, useEffect, type ReactNode } from "react";

import { mergeAvatarProfile } from "@/lib/avatarCatalog";
import { useCharacterLibrary } from "@/lib/characterLibrary";
import { useLocalGlbUrl } from "@/lib/useLocalGlbUrl";
import type { AvatarDiagnostics } from "@/lib/modelPresentation";
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
  onError?: (error: Error) => void;
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

  override componentDidCatch(error: Error) {
    this.props.onError?.(error);
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
  onDiagnostics,
}: {
  type: CharacterType;
  animation: AnimationType;
  spin: boolean;
  onDiagnostics?: ((details: AvatarDiagnostics) => void) | undefined;
}) {
  const customization = useAvatarCustomizationStore((state) => state.customizations[type]);
  const profile = mergeAvatarProfile(type, customization);
  const assetId = useCharacterLibrary((s) => s.characters.find((item) => item.id === type)?.assetId);
  const localAsset = useLocalGlbUrl(assetId);
  // Local geometry has priority; do not accidentally show the old remote preset while loading.
  const modelUrl = assetId ? localAsset.url : profile.modelUrl;
  useEffect(() => {
    if (assetId && localAsset.error) {
      onDiagnostics?.({
        status: "error",
        modelUrl: "local:" + assetId,
        message: localAsset.error,
      });
    }
  }, [assetId, localAsset.error, onDiagnostics]);
  const renderMode = useAvatarCustomizationStore((state) => state.renderModes[type]) ?? "auto";
  const fallback = <ProceduralAvatar type={type} animation={animation} spin={spin} />;

  if (renderMode === "custom") return fallback;
  if (!modelUrl) return fallback;
  if (renderMode === "readyplayerme" || renderMode === "auto") {
    return (
    <AvatarErrorBoundary
      resetKey={type + ":" + modelUrl}
      fallback={fallback}
      onError={(error) => onDiagnostics?.({
        status: "error", modelUrl,
        message: error.message || "تعذر تحميل أو قراءة ملف GLB.",
      })}
    >
      <Suspense fallback={fallback}>
        <ReadyPlayerMeAvatar
          type={type}
          url={modelUrl}
          animation={animation}
          spin={spin}
          onDiagnostics={onDiagnostics}
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
  onDiagnostics?: ((details: AvatarDiagnostics) => void) | undefined;
};

export default function ThreeDCharacter({
  type,
  animation = "idle",
  spin = true,
  transparent = false,
  className,
  backgroundUrl,
  onCanvasReady,
  onDiagnostics,
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
        <Avatar type={type} animation={animation} spin={spin} onDiagnostics={onDiagnostics} />
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
