import { lazy, Suspense, useEffect, useState } from "react";
import type { StoryScene } from "@/lib/storyProject";
import type { AnimationType } from "@/lib/store";

const StoryMultiActorCanvas = lazy(() => import("./StoryMultiActorCanvas"));

type Props = {
  scene: StoryScene;
  backgroundUrl?: string | undefined;
  actorAnimations: Record<string, AnimationType>;
  characterIds: readonly string[];
};

/** Keep R3F/WebGL completely out of server-side rendering. */
export default function StoryMultiActorStage(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-full w-full" aria-hidden />;
  return (
    <Suspense fallback={<div role="status" className="flex h-full items-center justify-center bg-black/30 text-white">تحميل المشهد ثلاثي الأبعاد…</div>}>
      <StoryMultiActorCanvas {...props}/>
    </Suspense>
  );
}
