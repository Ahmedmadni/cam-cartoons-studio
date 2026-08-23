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
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setLoading(false);
        setIsTracking(true);

        const loop = () => {
          rafRef.current = requestAnimationFrame(loop);
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
            lerpFaceState({ yaw: 0, pitch: 0, roll: 0, eyeX: 0, eyeY: 0, mouthOpen: 0 }, 0.1);
            return;
          }

          const nose = lm[1];
          const leftEye = lm[33];
          const rightEye = lm[263];
          const chin = lm[152];
          const forehead = lm[10];
          const upperLip = lm[13];
          const lowerLip = lm[14];
          if (!nose || !leftEye || !rightEye || !chin || !forehead || !upperLip || !lowerLip)
            return;

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
          const mouthOpen = clamp((Math.abs(lowerLip.y - upperLip.y) / faceHeight - 0.02) * 8, 0, 1);

          lerpFaceState({
            yaw,
            pitch,
            roll,
            eyeX: clamp(yaw * 0.5, -0.5, 0.5),
            eyeY: clamp(pitch * 0.5, -0.5, 0.5),
            mouthOpen,
          });
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
      const l = landmarkerRef.current as { close?: () => void } | null;
      l?.close?.();
      landmarkerRef.current = null;
      setIsTracking(false);
      resetFaceState();
    };
  }, [enabled, videoRef]);

  return { loading, isTracking, error, faceState };
}
