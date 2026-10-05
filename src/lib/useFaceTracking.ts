import { useEffect, useRef, useState } from "react";
import { faceState, lerpFaceState, resetFaceState } from "./faceState";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

type Options = {
  videoRef: { current: HTMLVideoElement | null };
  enabled: boolean;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function getBlendshapeScores(
  categories:
    | ReadonlyArray<{ categoryName?: string | null; displayName?: string | null; score?: number | null }>
    | undefined,
) {
  const scores = new Map<string, number>();
  for (const category of categories ?? []) {
    const name = category.categoryName ?? category.displayName;
    const score = category.score;
    if (name && typeof score === "number" && Number.isFinite(score)) {
      scores.set(name, score);
    }
  }
  return scores;
}

export function useFaceTracking({ videoRef, enabled }: Options) {
  const [loading, setLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const landmarkerRef = useRef<unknown>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setIsTracking(false);
      resetFaceState();
      return;
    }

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
        const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setLoading(false);
        setIsTracking(true);

        const FRAME_SKIP = 3;
        let frame = 0;

        const loop = () => {
          rafRef.current = requestAnimationFrame(loop);
          frame += 1;
          if (frame % FRAME_SKIP !== 0) return;

          const video = videoRef.current;
          if (!video || video.readyState < 2) return;

          let results;
          try {
            results = landmarker.detectForVideo(video, performance.now());
          } catch {
            return;
          }

          const lm = results?.faceLandmarks?.[0];
          if (!lm) {
            lerpFaceState(
              {
                yaw: 0,
                pitch: 0,
                roll: 0,
                eyeX: 0,
                eyeY: 0,
                mouthOpen: 0,
                smile: 0,
                blinkLeft: 0,
                blinkRight: 0,
                browUp: 0,
              },
              0.1,
            );
            return;
          }

          const nose = lm[1];
          const leftEye = lm[33];
          const rightEye = lm[263];
          const chin = lm[152];
          const forehead = lm[10];
          const upperLip = lm[13];
          const lowerLip = lm[14];
          if (!nose || !leftEye || !rightEye || !chin || !forehead || !upperLip || !lowerLip) {
            return;
          }

          const eyeMidX = (leftEye.x + rightEye.x) / 2;
          const eyeMidY = (leftEye.y + rightEye.y) / 2;
          const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 0.001;
          const faceHeight = Math.hypot(chin.x - forehead.x, chin.y - forehead.y) || 0.001;

          const yaw = clamp(((nose.x - eyeMidX) / eyeDist) * 2.2, -1, 1);
          const pitch = clamp(((nose.y - eyeMidY) / faceHeight - 0.22) * 3, -1, 1);
          const roll = clamp(
            Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 1.4,
            -1,
            1,
          );

          const landmarkMouthOpen = clamp(
            (Math.abs(lowerLip.y - upperLip.y) / faceHeight - 0.02) * 8,
            0,
            1,
          );

          const scores = getBlendshapeScores(results?.faceBlendshapes?.[0]?.categories);
          const jawOpen = scores.get("jawOpen") ?? 0;
          const smileLeft = scores.get("mouthSmileLeft") ?? 0;
          const smileRight = scores.get("mouthSmileRight") ?? 0;
          const blinkLeft = scores.get("eyeBlinkLeft") ?? 0;
          const blinkRight = scores.get("eyeBlinkRight") ?? 0;
          const browInner = scores.get("browInnerUp") ?? 0;
          const browOuterLeft = scores.get("browOuterUpLeft") ?? 0;
          const browOuterRight = scores.get("browOuterUpRight") ?? 0;

          lerpFaceState(
            {
              yaw,
              pitch,
              roll,
              eyeX: clamp(yaw * 0.5, -0.5, 0.5),
              eyeY: clamp(pitch * 0.5, -0.5, 0.5),
              mouthOpen: Math.max(landmarkMouthOpen, jawOpen),
              smile: clamp((smileLeft + smileRight) / 2, 0, 1),
              blinkLeft: clamp(blinkLeft, 0, 1),
              blinkRight: clamp(blinkRight, 0, 1),
              browUp: clamp((browInner + browOuterLeft + browOuterRight) / 3, 0, 1),
            },
            0.24,
          );
        };

        loop();
      } catch (e) {
        if (cancelled) return;
        setLoading(false);
        setIsTracking(false);
        setError(e instanceof Error ? e.message : "تعذّر تحميل نموذج تتبع الوجه");
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      const landmarker = landmarkerRef.current as { close?: () => void } | null;
      landmarker?.close?.();
      landmarkerRef.current = null;
      setIsTracking(false);
      resetFaceState();
    };
  }, [enabled, videoRef]);

  return { loading, isTracking, error, faceState };
}
