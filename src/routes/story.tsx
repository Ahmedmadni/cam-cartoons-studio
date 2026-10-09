import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Palette, Play, Sparkles, Square, Video, Wand2 } from "lucide-react";

import CharacterStage from "@/components/characters/CharacterStage";
import { faceState } from "@/lib/faceState";
import {
  BACKGROUND_FILTER_LABELS,
  BACKGROUND_FILTERS,
  BACKGROUNDS,
  filterBackgrounds,
  parseStory,
  type BackgroundFilter,
  type StoryStep,
} from "@/lib/story";
import { ANIMATION_LABELS, useStudioStore, type AnimationType } from "@/lib/store";
import { getCharacterLabel } from "@/lib/characterLibrary";
import { VOICE_PRESETS } from "@/lib/voiceChanger";
import { VoicePlaybackBus, isRemoteVoiceConfigured, synthesizeRemoteVoice } from "@/lib/voiceEngine";

export const Route = createFileRoute("/story")({
  head: () => ({
    meta: [
      { title: "اكتب قصتك — استوديو الشخصيات 3D" },
      {
        name: "description",
        content: "اكتب قصة قصيرة ودع شخصيتك الكرتونية تقرأها وتؤدي الحركات أمامك.",
      },
      { property: "og:title", content: "اكتب قصتك — استوديو الشخصيات 3D" },
      {
        property: "og:description",
        content: "اكتب قصة قصيرة ودع شخصيتك الكرتونية تقرأها وتؤدي الحركات أمامك.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoryPage,
});

const EXAMPLE = "قل مرحبا بفرح، ثم ارفع يدك، ثم قفز، ثم صفق وقل وداعا";

function StoryPage() {
  const navigate = useNavigate();
  const selectedCharacter = useStudioStore((s) => s.selectedCharacter);
  const setRecordedVideo = useStudioStore((s) => s.setRecordedVideo);
  const selectedVoice = useStudioStore((s) => s.selectedVoice);
  const voicePitch = useStudioStore((s) => s.voicePitch);
  const voiceTone = useStudioStore((s) => s.voiceTone);

  const [text, setText] = useState(EXAMPLE);
  const [bgId, setBgId] = useState(BACKGROUNDS[0]!.id);
  const [bgFilter, setBgFilter] = useState<BackgroundFilter>("premium");
  const [action, setAction] = useState<AnimationType>("idle");
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [currentLine, setCurrentLine] = useState<string>("");
  const [note, setNote] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const extraTracksRef = useRef<MediaStreamTrack[]>([]);
  const mouthTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const voiceBusRef = useRef<VoicePlaybackBus | null>(null);

  const remoteVoiceConfigured = isRemoteVoiceConfigured();
  const background = BACKGROUNDS.find((b) => b.id === bgId) ?? BACKGROUNDS[0]!;
  const visibleBackgrounds = filterBackgrounds(bgFilter);

  useEffect(() => {
    if (!selectedCharacter) navigate({ to: "/" });
  }, [selectedCharacter, navigate]);

  const getVoiceBus = useCallback(() => {
    if (!voiceBusRef.current) voiceBusRef.current = new VoicePlaybackBus();
    return voiceBusRef.current;
  }, []);

  const stopMouth = useCallback(() => {
    if (mouthTimerRef.current) window.clearInterval(mouthTimerRef.current);
    mouthTimerRef.current = null;
    faceState.mouthOpen = 0;
  }, []);

  const startMouth = useCallback(() => {
    stopMouth();
    mouthTimerRef.current = window.setInterval(() => {
      faceState.mouthOpen = 0.25 + Math.random() * 0.6;
    }, 110);
  }, [stopMouth]);

  /** ينفّذ حركة واحدة (مكتبة الحركات) لمدة محددة */
  const performAction = useCallback((next: AnimationType) => setAction(next), []);

  const speakBrowser = useCallback(
    (line: string) =>
      new Promise<void>((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          setTimeout(resolve, 1200);
          return;
        }

        const utter = new SpeechSynthesisUtterance(line);
        const preset = VOICE_PRESETS[selectedVoice];
        const semitones = preset.semitones + voicePitch;
        utter.lang = "ar-SA";
        utter.rate = 0.95;
        utter.pitch = Math.max(0.5, Math.min(2, 1 + (semitones / 12) * 0.45));
        const arabic = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("ar"));
        if (arabic) utter.voice = arabic;

        let gotBoundary = false;
        let rafId = 0;
        let target = 0;
        const animate = () => {
          faceState.mouthOpen += (target - faceState.mouthOpen) * 0.35;
          target *= 0.88;
          rafId = requestAnimationFrame(animate);
        };

        utter.onstart = () => {
          rafId = requestAnimationFrame(animate);
        };
        utter.onboundary = (e) => {
          if (e.name && e.name !== "word") return;
          if (!gotBoundary) {
            gotBoundary = true;
            stopMouth();
          }
          const len = e.charLength || line.slice(e.charIndex).split(/\\s/)[0]?.length || 3;
          target = Math.min(1, 0.45 + len * 0.07);
          if (len > 4) {
            window.setTimeout(() => {
              target = Math.max(target, 0.55 + Math.random() * 0.3);
            }, 140);
          }
        };

        const done = () => {
          cancelAnimationFrame(rafId);
          faceState.mouthOpen = 0;
          resolve();
        };
        utter.onend = done;
        utter.onerror = done;
        window.speechSynthesis.speak(utter);
      }),
    [selectedVoice, stopMouth, voicePitch],
  );

  const speak = useCallback(
    async (line: string) => {
      if (remoteVoiceConfigured) {
        try {
          const audio = await synthesizeRemoteVoice(line, selectedVoice, {
            language: "ar-SA",
            pitch: voicePitch,
            tone: voiceTone,
          });

          if (audio) {
            stopMouth();
            const bus = getVoiceBus();
            await bus.play(audio, (level) => {
              faceState.mouthOpen = Math.max(0, Math.min(1, level));
            });
            return;
          }
        } catch {
          setNote("تعذّر محرك الصوت الذكي؛ تم استخدام صوت الجهاز كبديل. قد لا يُسجَّل الصوت البديل داخل الفيديو.");
        }
      }

      await speakBrowser(line);
    },
    [
      getVoiceBus,
      remoteVoiceConfigured,
      selectedVoice,
      speakBrowser,
      stopMouth,
      voicePitch,
      voiceTone,
    ],
  );

  const runStory = useCallback(
    async (steps: StoryStep[]) => {
      for (const step of steps) {
        if (cancelledRef.current) break;
        performAction(step.action);
        setCurrentLine(step.text);
        startMouth();
        await speak(step.text);
        stopMouth();
        await new Promise((r) => window.setTimeout(r, 350));
      }
      performAction("idle");
      setCurrentLine("");
    },
    [performAction, speak, startMouth, stopMouth],
  );

  const stopRecorder = useCallback(() => {
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    extraTracksRef.current.forEach((t) => t.stop());
    extraTracksRef.current = [];
  }, []);

  const handleStop = useCallback(() => {
    cancelledRef.current = true;
    window.speechSynthesis?.cancel();
    voiceBusRef.current?.stop();
    stopMouth();
    performAction("idle");
    setCurrentLine("");
    setPlaying(false);
    stopRecorder();
  }, [performAction, stopMouth, stopRecorder]);

  const handlePlay = useCallback(
    async (withRecording: boolean) => {
      const steps = parseStory(text);
      if (!steps.length) return;
      cancelledRef.current = false;
      setPlaying(true);
      setNote(null);

      if (withRecording && canvasRef.current) {
        try {
          const stream = canvasRef.current.captureStream(30);

          if (remoteVoiceConfigured) {
            const bus = getVoiceBus();
            const aiAudioTrack = bus.captureStream.getAudioTracks()[0];
            if (aiAudioTrack) {
              stream.addTrack(aiAudioTrack);
              setNote("سيتم دمج صوت الشخصية الذكي مباشرة داخل الفيديو.");
            }
          } else {
            try {
              const display = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
              });
              const audio = display.getAudioTracks()[0];
              display.getVideoTracks().forEach((t) => t.stop());
              if (audio) {
                stream.addTrack(audio);
                extraTracksRef.current = [audio];
              } else {
                setNote("تم التسجيل بدون صوت (لم تتم مشاركة صوت التبويب).");
              }
            } catch {
              setNote("تم التسجيل بدون صوت (لم تتم مشاركة صوت التبويب).");
            }
          }

          chunksRef.current = [];
          const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
          recorder.ondataavailable = (e) => {
            if (e.data.size) chunksRef.current.push(e.data);
          };
          recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: "video/webm" });
            setRecordedVideo(blob);
            setRecording(false);
            const bus = voiceBusRef.current;
            voiceBusRef.current = null;
            void bus?.close();
            navigate({ to: "/save" });
          };
          recorderRef.current = recorder;
          recorder.start();
          setRecording(true);
        } catch {
          setNote("تعذّر بدء التسجيل على هذا المتصفح.");
          const bus = voiceBusRef.current;
          voiceBusRef.current = null;
          void bus?.close();
        }
      }

      await runStory(steps);
      setPlaying(false);

      if (withRecording) {
        window.setTimeout(() => stopRecorder(), 400);
      } else {
        const bus = voiceBusRef.current;
        voiceBusRef.current = null;
        await bus?.close();
      }
    },
    [
      getVoiceBus,
      navigate,
      remoteVoiceConfigured,
      runStory,
      setRecordedVideo,
      stopRecorder,
      text,
    ],
  );

  useEffect(
    () => () => {
      cancelledRef.current = true;
      window.speechSynthesis?.cancel();
      if (mouthTimerRef.current) window.clearInterval(mouthTimerRef.current);
      extraTracksRef.current.forEach((t) => t.stop());
      const bus = voiceBusRef.current;
      voiceBusRef.current = null;
      void bus?.close();
    },
    [],
  );

  if (!selectedCharacter) return null;

  const steps = parseStory(text);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black text-foreground sm:text-4xl">
            اكتب قصة لـ {getCharacterLabel(selectedCharacter)} 📖
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: "/customize" })}
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 font-bold text-secondary-foreground"
            >
              <Palette className="size-5" />
              تعديل الشخصية
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-2.5 font-bold text-foreground"
            >
              <ArrowRight className="size-5" />
              تغيير الشخصية
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-3xl border-4 border-secondary bg-card p-5 shadow-lg">
            <label htmlFor="story" className="text-lg font-black text-foreground">
              نص القصة
            </label>
            <textarea
              id="story"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="mt-3 w-full rounded-2xl border-2 border-border bg-background p-4 text-lg font-semibold text-foreground outline-none focus:border-primary"
              placeholder="مثال: قل مرحبا بفرح، ثم ارفع يدك، ثم قفز"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  remoteVoiceConfigured
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {remoteVoiceConfigured ? "محرك صوت AI" : "صوت الجهاز"}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {VOICE_PRESETS[selectedVoice].emoji} {VOICE_PRESETS[selectedVoice].label}
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-foreground">الخلفية</p>
                <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                  اختر مشهدًا سينمائيًا مناسبًا للقصة.
                </p>
              </div>
              {background.premium && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-black text-primary">
                  <Sparkles className="size-3.5" />
                  احترافية
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {BACKGROUND_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setBgFilter(filter)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                    bgFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {BACKGROUND_FILTER_LABELS[filter]}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visibleBackgrounds.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBgId(b.id)}
                  className={`overflow-hidden rounded-2xl border-4 bg-background text-right transition hover:-translate-y-0.5 hover:shadow-md ${
                    b.id === bgId
                      ? "border-primary shadow-md"
                      : "border-transparent hover:border-border"
                  }`}
                  title={b.label}
                >
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <img
                      src={b.src}
                      alt={b.label}
                      loading="lazy"
                      width={960}
                      height={540}
                      className="h-full w-full object-cover"
                    />
                    {b.premium && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-black text-white backdrop-blur">
                        <Sparkles className="size-3" />
                        Premium
                      </span>
                    )}
                  </div>
                  <span className="block truncate px-2.5 py-2 text-xs font-black text-foreground">
                    {b.label}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm font-bold text-muted-foreground">الحركات المكتشفة</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {steps.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground"
                >
                  {ANIMATION_LABELS[s.action]}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {playing ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="inline-flex items-center gap-2 rounded-full bg-destructive px-7 py-4 text-xl font-black text-destructive-foreground shadow-lg"
                >
                  <Square className="size-6" />
                  إيقاف
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void handlePlay(false)}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 text-xl font-black text-primary-foreground shadow-lg transition hover:brightness-105"
                  >
                    <Play className="size-6" />
                    تشغيل القصة
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePlay(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-sunny px-7 py-4 text-xl font-black text-sunny-foreground shadow-lg transition hover:brightness-105"
                  >
                    <Video className="size-6" />
                    سجّل القصة
                  </button>
                </>
              )}
            </div>
            {note && <p className="mt-3 text-sm font-bold text-muted-foreground">{note}</p>}
          </section>

          <section className="relative overflow-hidden rounded-3xl border-4 border-primary bg-card shadow-xl">
            <div className="aspect-video w-full">
              <CharacterStage
                type={selectedCharacter}
                animation={action}
                spin={false}
                backgroundUrl={background.src}
                onCanvasReady={(c) => (canvasRef.current = c)}
              />
            </div>
            {currentLine && (
              <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl bg-card/90 px-4 py-3 text-center text-lg font-black text-foreground shadow">
                {currentLine}
              </div>
            )}
            {recording && (
              <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-1.5 text-sm font-black text-destructive-foreground">
                <Wand2 className="size-4" />
                جاري التسجيل
              </span>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
