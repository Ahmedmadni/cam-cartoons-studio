import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Palette, Play, Sparkles, Square, Video, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StoryRecording } from "@/lib/storyRecording";
import { playStorySpeech } from "@/lib/storySpeech";
import type { AvatarDiagnostics } from "@/lib/modelPresentation";
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
import { selectWebmMime } from "@/lib/mediaCapabilities";

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
  const [bgId, setBgId] = useState(BACKGROUNDS[0]?.id ?? "");
  const [bgFilter, setBgFilter] = useState<BackgroundFilter>("premium");
  const [action, setAction] = useState<AnimationType>("idle");
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [currentLine, setCurrentLine] = useState<string>("");
  const [note, setNote] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<StoryRecording | null>(null);
  const activeSpeechRef = useRef<ReturnType<typeof playStorySpeech> | null>(null);
  const generationRef = useRef(0);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const [diagnostics, setDiagnostics] = useState<AvatarDiagnostics | null>(null);
  const mouthTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const voiceBusRef = useRef<VoicePlaybackBus | null>(null);

  const remoteVoiceConfigured = isRemoteVoiceConfigured();
  const background = BACKGROUNDS.find((b) => b.id === bgId) ?? BACKGROUNDS[0];
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

  const speakBrowser = useCallback(async (line: string) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setNote("قراءة النص غير متاحة في هذا المتصفح؛ جرّب جهازًا يدعم قراءة النصوص.");
      return;
    }
    stopMouth();
    const utter = new SpeechSynthesisUtterance(line);
    const semitones = VOICE_PRESETS[selectedVoice].semitones + voicePitch;
    utter.lang = "ar-SA";
    utter.rate = 0.95;
    utter.pitch = Math.max(0.5, Math.min(2, 1 + (semitones / 12) * 0.45));
    const arabic = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith("ar"));
    if (arabic) utter.voice = arabic;
    const speech = playStorySpeech({ synth: window.speechSynthesis, utterance: utter,
      onMouth: amount => { faceState.mouthOpen = amount; } });
    activeSpeechRef.current = speech;
    await speech.done;
    if (activeSpeechRef.current === speech) activeSpeechRef.current = null;
  }, [selectedVoice, stopMouth, voicePitch]);

  const speak = useCallback(
    async (line: string) => {
      const generation = generationRef.current;
      if (remoteVoiceConfigured) {
        try {
          const audio = await synthesizeRemoteVoice(line, selectedVoice, {
            language: "ar-SA",
            pitch: voicePitch,
            tone: voiceTone,
          });

          if (cancelledRef.current || generation !== generationRef.current) return;
          if (audio) {
            stopMouth();
            const bus = getVoiceBus();
            await bus.play(audio, (level) => {
              faceState.mouthOpen = Math.max(0, Math.min(1, level));
            });
            return;
          }
        } catch {
          if (cancelledRef.current || generation !== generationRef.current) return;
          setNote("تعذّر محرك الصوت الذكي؛ تم استخدام صوت الجهاز كبديل. قد لا يُسجَّل الصوت البديل داخل الفيديو.");
        }
      }

      if (!cancelledRef.current && generation === generationRef.current) await speakBrowser(line);
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
    async (steps: StoryStep[], generation: number) => {
      for (const step of steps) {
        if (cancelledRef.current || generation !== generationRef.current) break;
        performAction(step.action);
        setCurrentLine(step.text);
        startMouth();
        await speak(step.text);
        if (cancelledRef.current || generation !== generationRef.current) return;
        stopMouth();
        await new Promise((r) => window.setTimeout(r, 350));
      }
      if (generation !== generationRef.current) return;
      performAction("idle");
      setCurrentLine("");
    },
    [performAction, speak, startMouth, stopMouth],
  );

  const stopRecorder = useCallback(() => recorderRef.current?.finish(), []);

  const handleStop = useCallback(() => {
    cancelledRef.current = true;
    generationRef.current += 1;
    activeSpeechRef.current?.cancel();
    activeSpeechRef.current = null;
    window.speechSynthesis?.cancel();
    voiceBusRef.current?.stop();
    stopMouth();
    performAction("idle");
    setCurrentLine("");
    setPlaying(false);
    // Manual stop keeps a valid partial clip; unmount/error discards it.
    stopRecorder();
  }, [performAction, stopMouth, stopRecorder]);

  const handlePlay = useCallback(async (withRecording: boolean) => {
    if (busyRef.current) return;
    const steps = parseStory(text);
    if (!steps.length) { setNote("اكتب نص القصة أولًا."); return; }
    if (diagnostics?.status !== "ready") { setNote("انتظر حتى تصبح الشخصية جاهزة."); return; }
    const videoMime = withRecording ? selectWebmMime("video") : null;
    const canvas = canvasRef.current;
    if (withRecording && (!videoMime || !canvas || typeof canvas.captureStream !== "function")) {
      setNote("تسجيل الفيديو غير متاح في هذا المتصفح؛ يمكنك تشغيل القصة دون تسجيل.");
      return;
    }
    busyRef.current = true;
    const generation = ++generationRef.current;
    const active = () => mountedRef.current && generation === generationRef.current && !cancelledRef.current;
    cancelledRef.current = false;
    setPlaying(true);
    setNote(null);
    let stream: MediaStream | null = null;
    try {
      if (withRecording && canvas && videoMime) {
        stream = canvas.captureStream(30);
        if (remoteVoiceConfigured) {
          const audioTrack = getVoiceBus().captureStream.getAudioTracks()[0];
          if (audioTrack) stream.addTrack(audioTrack);
          setNote("سيتم دمج صوت الشخصية مباشرة داخل الفيديو.");
        } else {
          try {
            if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("unsupported");
            const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            if (!active()) { display.getTracks().forEach(track => track.stop()); return; }
            const audio = display.getAudioTracks()[0];
            display.getTracks().filter(track => track !== audio).forEach(track => track.stop());
            if (audio) stream.addTrack(audio);
            else setNote("سيكون الفيديو بدون صوت؛ لم تتم مشاركة صوت التبويب.");
          } catch {
            if (!active()) return;
            setNote("سيكون الفيديو بدون صوت؛ لم تتم مشاركة صوت التبويب.");
          }
        }
        if (!active()) return;
        recorderRef.current = new StoryRecording(stream, videoMime,
          blob => {
            recorderRef.current = null;
            if (!mountedRef.current) return;
            setRecordedVideo(blob);
            setRecording(false);
            void navigate({ to: "/save" });
          },
          message => {
            recorderRef.current = null;
            if (!mountedRef.current) return;
            setRecording(false);
            setNote(message);
            handleStop();
          });
        stream = null; // ownership has passed to StoryRecording
        setRecording(true);
      }
      if (!active()) return;
      await runStory(steps, generation);
      if (!active()) return;
      if (withRecording) {
        await new Promise(resolve => window.setTimeout(resolve, 400));
        if (active()) stopRecorder();
      }
    } catch {
      if (active()) { setNote("تعذّر بدء التسجيل؛ حاول مرة أخرى أو شغّل القصة دون تسجيل."); handleStop(); }
    } finally {
      stream?.getTracks().forEach(track => track.stop());
      const bus = voiceBusRef.current;
      voiceBusRef.current = null;
      void bus?.close();
      busyRef.current = false;
      if (mountedRef.current) setPlaying(false);
    }
  }, [diagnostics?.status, getVoiceBus, handleStop, navigate, remoteVoiceConfigured, runStory, setRecordedVideo, stopRecorder, text]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelledRef.current = true;
      generationRef.current += 1;
      activeSpeechRef.current?.cancel();
      window.speechSynthesis?.cancel();
      recorderRef.current?.discard();
      recorderRef.current = null;
      stopMouth();
      const bus = voiceBusRef.current;
      voiceBusRef.current = null;
      void bus?.close();
    };
  }, [stopMouth]);

  if (!selectedCharacter || !background) return null;

  const steps = parseStory(text);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black text-foreground sm:text-4xl">
            اكتب قصة لـ {getCharacterLabel(selectedCharacter)} 📖
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost"
              type="button"
              onClick={() => navigate({ to: "/customize" })}
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 font-bold text-secondary-foreground"
            >
              <Palette className="size-5" />
              تعديل الشخصية
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-2.5 font-bold text-foreground"
            >
              <ArrowRight className="size-5" />
              تغيير الشخصية
            </Button>
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
              disabled={playing || recording}
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
                <Button variant="ghost"
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
                </Button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visibleBackgrounds.map((b) => (
                <Button variant="ghost"
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
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-foreground/80 px-2 py-1 text-[10px] font-black text-background backdrop-blur">
                        <Sparkles className="size-3" />
                        Premium
                      </span>
                    )}
                  </div>
                  <span className="block truncate px-2.5 py-2 text-xs font-black text-foreground">
                    {b.label}
                  </span>
                </Button>
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
                <Button variant="ghost"
                  type="button"
                  onClick={handleStop}
                  className="inline-flex items-center gap-2 rounded-full bg-destructive px-7 py-4 text-xl font-black text-destructive-foreground shadow-lg"
                >
                  <Square className="size-6" />
                  إيقاف
                </Button>
              ) : (
                <>
                  <Button variant="ghost"
                    type="button"
                    disabled={diagnostics?.status !== "ready" || !text.trim() || recording}
                    onClick={() => void handlePlay(false)}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 text-xl font-black text-primary-foreground shadow-lg transition hover:brightness-105"
                  >
                    <Play className="size-6" />
                    تشغيل القصة
                  </Button>
                  <Button variant="ghost"
                    type="button"
                    disabled={diagnostics?.status !== "ready" || !text.trim() || recording}
                    onClick={() => void handlePlay(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-sunny px-7 py-4 text-xl font-black text-sunny-foreground shadow-lg transition hover:brightness-105"
                  >
                    <Video className="size-6" />
                    سجّل القصة
                  </Button>
                </>
              )}
            </div>
            {note && <p role="status" className="mt-3 text-sm font-bold text-muted-foreground">{note}</p>}
          </section>

          <section className="relative overflow-hidden rounded-3xl border-4 border-primary bg-card shadow-xl">
            <div className="aspect-video w-full">
              <CharacterStage
                type={selectedCharacter}
                animation={action}
                spin={false}
                backgroundUrl={background.src}
                onDiagnostics={setDiagnostics}
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
