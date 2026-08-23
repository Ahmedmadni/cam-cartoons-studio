import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw, ScanFace, Sparkles } from "lucide-react";
import CharacterStage from "@/components/characters/CharacterStage";
import { ANIMATION_LABELS, useStudioStore } from "@/lib/store";
import { useFaceTracking } from "@/lib/useFaceTracking";


const Webcam = lazy(() => import("react-webcam"));

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "استوديو التصوير — الشخصيات 3D" },
      {
        name: "description",
        content: "صوّر فيديو مع شخصيتك الكرتونية ثلاثية الأبعاد مباشرة من الكاميرا.",
      },
      { property: "og:title", content: "استوديو التصوير — الشخصيات 3D" },
      {
        property: "og:description",
        content: "صوّر فيديو مع شخصيتك الكرتونية ثلاثية الأبعاد مباشرة من الكاميرا.",
      },
    ],
  }),
  component: StudioPage,
});

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function StudioPage() {
  const navigate = useNavigate();
  const selectedCharacter = useStudioStore((s) => s.selectedCharacter);
  const animation = useStudioStore((s) => s.animation);
  const nextAnimation = useStudioStore((s) => s.nextAnimation);
  const isRecording = useStudioStore((s) => s.isRecording);
  const setIsRecording = useStudioStore((s) => s.setIsRecording);
  const setRecordedVideo = useStudioStore((s) => s.setRecordedVideo);
  const isFaceTrackingEnabled = useStudioStore((s) => s.isFaceTrackingEnabled);
  const toggleFaceTracking = useStudioStore((s) => s.toggleFaceTracking);

  const [mounted, setMounted] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const shellRef = useRef<HTMLElement | null>(null);
  const webcamRef = useRef<{ video: HTMLVideoElement | null } | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mixCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const {
    loading: faceLoading,
    isTracking,
    error: faceError,
  } = useFaceTracking({ videoRef: videoElRef, enabled: isFaceTrackingEnabled });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const id = window.setInterval(() => {
      videoElRef.current = webcamRef.current?.video ?? null;
    }, 500);
    return () => window.clearInterval(id);
  }, []);


  useEffect(() => {
    if (!selectedCharacter) navigate({ to: "/" });
  }, [selectedCharacter, navigate]);

  useEffect(() => {
    if (!isRecording) return;
    setSeconds(0);
    const id = window.setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [isRecording]);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startRecording = useCallback(async () => {
    setError(null);
    const video = webcamRef.current?.video ?? null;
    const three = threeCanvasRef.current;
    if (!video || !three || video.readyState < 2) {
      setError("الكاميرا لم تجهز بعد، حاول بعد لحظة.");
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const mix = mixCanvasRef.current ?? document.createElement("canvas");
    mixCanvasRef.current = mix;
    mix.width = width;
    mix.height = height;
    const ctx = mix.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      if (facingMode === "user") {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();
      const stageRect = three.getBoundingClientRect();
      const shellRect = shellRef.current?.getBoundingClientRect();
      if (three.width > 0 && three.height > 0 && shellRect && shellRect.width > 0) {
        const sx = width / shellRect.width;
        const sy = height / shellRect.height;
        ctx.drawImage(
          three,
          (stageRect.left - shellRect.left) * sx,
          (stageRect.top - shellRect.top) * sy,
          stageRect.width * sx,
          stageRect.height * sy,
        );
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    const stream = mix.captureStream(30);
    try {
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = audio;
      audio.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      /* التسجيل يستمر بدون صوت */
    }

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      cleanup();
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedVideo(blob);
      setIsRecording(false);
      navigate({ to: "/save" });
    };
    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  }, [cleanup, facingMode, navigate, setIsRecording, setRecordedVideo]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }, []);

  if (!selectedCharacter) return null;

  return (
    <main ref={shellRef} className="relative h-screen w-full overflow-hidden bg-black">
      {mounted && (
        <Suspense fallback={null}>
          <Webcam
            ref={webcamRef as never}
            audio={false}
            playsInline
            mirrored={facingMode === "user"}
            videoConstraints={{ facingMode }}
            className="absolute inset-0 h-full w-full object-cover"
            onUserMediaError={() => setError("تعذّر فتح الكاميرا. تأكد من منح الإذن.")}
          />
        </Suspense>
      )}

      <div className="pointer-events-none absolute bottom-24 left-1/2 h-[55%] w-[70%] max-w-md -translate-x-1/2">
        <CharacterStage
          type={selectedCharacter}
          animation={animation}
          spin={false}
          transparent
          onCanvasReady={(c) => {
            threeCanvasRef.current = c;
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => navigate({ to: "/" })}
        className="absolute top-5 right-5 inline-flex items-center gap-2 rounded-full bg-card/90 px-4 py-2 text-sm font-black text-card-foreground shadow-lg"
      >
        <ArrowRight className="size-5" />
        رجوع
      </button>

      {isRecording && (
        <div className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-full bg-card/90 px-4 py-2 text-lg font-black text-card-foreground shadow-lg">
          <span className="size-3 animate-pulse rounded-full bg-record" />
          {formatTime(seconds)}
        </div>
      )}

      {(error || faceError) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 rounded-2xl bg-card px-5 py-3 text-center font-bold text-card-foreground shadow-lg">
          {error ?? faceError}
        </div>
      )}

      {faceLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-3xl bg-card/95 px-6 py-4 text-center text-lg font-black text-card-foreground shadow-2xl">
            <span className="mb-2 block size-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            جاري تحميل الذكاء الاصطناعي...
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-5 bg-gradient-to-t from-black/70 to-transparent p-6 pb-8">
        <button
          type="button"
          onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
          disabled={isRecording}
          className="flex size-16 flex-col items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg disabled:opacity-40"
          aria-label="تبديل الكاميرا"
        >
          <RefreshCw className="size-7" />
        </button>

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className="flex size-24 items-center justify-center rounded-full border-8 border-card bg-record shadow-2xl transition active:scale-95"
          aria-label={isRecording ? "إيقاف التسجيل" : "بدء التسجيل"}
        >
          <span
            className={
              isRecording ? "size-8 rounded-md bg-card" : "size-14 rounded-full bg-card/20"
            }
          />
        </button>

        <button
          type="button"
          onClick={toggleFaceTracking}
          className={`flex size-16 flex-col items-center justify-center rounded-full shadow-lg transition ${
            isFaceTrackingEnabled
              ? "bg-primary text-primary-foreground ring-4 ring-sunny"
              : "bg-card text-card-foreground"
          }`}
          aria-label="تتبع الوجه"
        >
          <ScanFace className="size-7" />
          <span className="text-[10px] font-black">
            {isTracking ? "يتتبع" : "تتبع الوجه"}
          </span>
        </button>

        {!isFaceTrackingEnabled && (
          <button
            type="button"
            onClick={nextAnimation}
            className="flex size-16 flex-col items-center justify-center rounded-full bg-sunny text-sunny-foreground shadow-lg"
            aria-label="تغيير الحركة"
          >
            <Sparkles className="size-7" />
            <span className="text-[10px] font-black">{ANIMATION_LABELS[animation]}</span>
          </button>
        )}
      </div>

    </main>
  );
}
