import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
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
