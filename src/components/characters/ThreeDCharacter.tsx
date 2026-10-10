import { ContactShadows, Environment, Lightformer, useTexture } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import { Component, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";

import { getAvatarProfile, mergeAvatarProfile } from "@/lib/avatarCatalog";
import { calculateFramedCameraShot, calculateReviewCameraPosition, type CameraFraming, type ReviewCameraAngle } from "@/lib/cameraComposition";
import { LIGHTING_RECIPES, type LightingStyle } from "@/lib/studioLighting";
import type { ReviewExpression } from "@/lib/facialPerformance";
import { useCharacterLibrary } from "@/lib/characterLibrary";
import { useLocalGlbUrl } from "@/lib/useLocalGlbUrl";
import type { AvatarDiagnostics } from "@/lib/modelPresentation";
import { useAvatarCustomizationStore } from "@/lib/avatarCustomization";
import type { AnimationType, CharacterType } from "@/lib/store";

import ProceduralAvatar from "./ProceduralAvatar";
import ReadyPlayerMeAvatar from "./ReadyPlayerMeAvatar";

function ResponsiveCharacterCamera({
  diagnostics,
  type,
  framing,
  reviewAngle,
}: {
  diagnostics: AvatarDiagnostics | null;
  type: CharacterType;
  framing: CameraFraming;
  reviewAngle: ReviewCameraAngle;
}) {
  const { camera, size, invalidate } = useThree();
  const yOffset = getAvatarProfile(type).rpmYOffset;

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const shot = calculateFramedCameraShot(diagnostics, size.width / Math.max(size.height, 1), yOffset, framing);
    camera.fov = shot.fov;
    const orbit = calculateReviewCameraPosition(shot.distance, reviewAngle);
    camera.position.set(orbit.x, shot.targetY, orbit.z);
    camera.lookAt(0, shot.targetY, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, diagnostics, framing, invalidate, reviewAngle, size.height, size.width, yOffset]);

  return null;
}

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
  previewSpeech,
  reviewMode,
  reviewExpression,
  onDiagnostics,
}: {
  type: CharacterType;
  animation: AnimationType;
  spin: boolean;
  previewSpeech: boolean;
  reviewMode: boolean;
  reviewExpression: ReviewExpression;
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
          previewSpeech={previewSpeech}
          reviewMode={reviewMode}
          reviewExpression={reviewExpression}
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
  /** Animate supported mouth morphs in a silent diagnostic preview. */
  previewSpeech?: boolean;
  /** Review presets; omit to retain Story/Studio full-body framing. */
  framing?: CameraFraming;
  lighting?: LightingStyle;
  /** Fixed photographic viewpoint; omitted in story/studio for legacy front view. */
  reviewAngle?: ReviewCameraAngle;
  /** Only library review recenters the model after spin stops. */
  reviewMode?: boolean;
  /** Character-library expression test; never changes story tracking or recorded animation. */
  reviewExpression?: ReviewExpression;
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
  previewSpeech = false,
  framing = "full",
  lighting = "cinematic",
  reviewAngle = "front",
  reviewMode = false,
  reviewExpression = "neutral",
  transparent = false,
  className,
  backgroundUrl,
  onCanvasReady,
  onDiagnostics,
}: ThreeDCharacterProps) {
  const [cameraDiagnostics, setCameraDiagnostics] = useState<AvatarDiagnostics | null>(null);
  const lights = LIGHTING_RECIPES[lighting];

  useEffect(() => {
    setCameraDiagnostics(null);
  }, [type]);

  const handleDiagnostics = useCallback((details: AvatarDiagnostics) => {
    setCameraDiagnostics((previous) => {
      if (previous?.modelUrl === details.modelUrl &&
          previous.status === details.status &&
          previous.normalizedScale === details.normalizedScale &&
          previous.message === details.message) return previous;
      return details;
    });
    onDiagnostics?.(details);
  }, [onDiagnostics]);

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
      <ResponsiveCharacterCamera type={type} diagnostics={cameraDiagnostics} framing={framing} reviewAngle={reviewAngle} />
      {backgroundUrl && (
        <Suspense fallback={null}>
          <Backdrop url={backgroundUrl} />
        </Suspense>
      )}

      <hemisphereLight args={[lights.ambientSky, lights.ambientGround, lights.ambience]} />
      <directionalLight
        position={[3.2, 5, 4.2]}
        intensity={lights.key}
        color={lights.keyColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00035}
        shadow-radius={6}
      />
      <directionalLight position={[-3.5, 2.2, 3]} intensity={lights.fill} color={lights.fillColor} />
      <spotLight
        position={[0, 4.5, -3.5]}
        intensity={lights.rim}
        angle={0.65}
        penumbra={1}
        color={lights.rimColor}
      />

      <Suspense fallback={null}>
        <Avatar type={type} animation={animation} spin={spin} previewSpeech={previewSpeech} reviewMode={reviewMode} reviewExpression={reviewExpression} onDiagnostics={handleDiagnostics} />
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
      <Environment resolution={256} environmentIntensity={lights.env}>
        <Lightformer form="rect" intensity={lights.key * 1.35} color={lights.keyColor} position={[0, 4, 2]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={lights.fill * 1.6} color={lights.fillColor} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={lights.rim * 0.45} color={lights.rimColor} position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="ring" intensity={1} color="#FFFFFF" position={[0, 1, -5]} scale={3} />
      </Environment>
    </Canvas>
  );
}
