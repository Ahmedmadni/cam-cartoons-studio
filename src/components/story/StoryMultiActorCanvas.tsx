import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import { ContactShadows } from "@react-three/drei";
import { Avatar, Backdrop } from "@/components/characters/ThreeDCharacter";
import type { StoryScene } from "@/lib/storyProject";
import type { AnimationType } from "@/lib/store";

type Props = {
  scene: StoryScene;
  backgroundUrl?: string | undefined;
  actorAnimations: Record<string, AnimationType>;
  characterIds: readonly string[];
};

function StoryCamera({ framing, actorCount }: { framing: StoryScene["camera"]["framing"]; actorCount: number }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    const wide = actorCount > 1;
    const distance = framing === "close" && !wide ? 4.2 : framing === "medium" && !wide ? 5.1 : wide ? 7.2 : 6.7;
    const eyeLevel = framing === "close" && !wide ? 0.72 : 0.35;
    camera.position.set(0, eyeLevel, distance);
    camera.fov = aspect < 1 ? 49 : 43;
    camera.lookAt(0, eyeLevel, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, framing, actorCount, size.width, size.height, invalidate]);
  return null;
}

/**
 * One WebGL context for the whole scene. Restrict preview to three genuine
 * GLB characters to avoid loading up to 20 high-resolution rigs on a phone.
 */
export default function StoryMultiActorCanvas({ scene, backgroundUrl, actorAnimations, characterIds }: Props) {
  const visible = scene.actors.filter(a => characterIds.includes(a.characterId)).slice(0, 3);
  const centered = visible.every(actor => actor.x === 0);
  return (
    <Canvas
      className="h-full w-full"
      shadows
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.35, 6.8], fov: 43, near: 0.1, far: 80 }}
    >
      <StoryCamera framing={scene.camera.framing} actorCount={visible.length}/>
      <color attach="background" args={["#192032"]} />
      {backgroundUrl && <Suspense fallback={null}><Backdrop url={backgroundUrl} /></Suspense>}
      <ambientLight intensity={1.1}/>
      <hemisphereLight intensity={1.2} groundColor="#8592b3" />
      <directionalLight position={[4, 6, 5]} intensity={2.1} castShadow />
      <directionalLight position={[-4, 3, 3]} intensity={0.9} />
      <Suspense fallback={null}>
        {visible.map((actor, index) => (
          <group key={actor.id}
            position={[centered ? (index - (visible.length - 1) / 2) * 2 : actor.x * 2.3, 0, 0]}
            scale={actor.scale}>
            <Avatar type={actor.characterId}
              animation={actorAnimations[actor.id] ?? "idle"}
              spin={false} previewSpeech={false}
              reviewMode={false} reviewExpression="neutral" surfaceCleanup={true}/>
          </group>
        ))}
      </Suspense>
      <ContactShadows position={[0, -1.42, 0]} opacity={0.3} scale={9} blur={2.8} far={3} />
    </Canvas>
  );
}
