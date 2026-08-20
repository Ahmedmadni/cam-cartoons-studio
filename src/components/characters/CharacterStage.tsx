import { Suspense, lazy, useEffect, useState } from "react";
import type { ThreeDCharacterProps } from "./ThreeDCharacter";

const ThreeDCharacter = lazy(() => import("./ThreeDCharacter"));

/**
 * Client-only wrapper: WebGL never runs during SSR.
 */
export default function CharacterStage(props: ThreeDCharacterProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-full w-full" aria-hidden />;

  return (
    <Suspense fallback={<div className="h-full w-full animate-pulse rounded-3xl bg-muted/40" />}>
      <ThreeDCharacter {...props} />
    </Suspense>
  );
}
