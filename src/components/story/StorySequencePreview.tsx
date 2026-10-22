import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX, Video, Download, XCircle } from "lucide-react";
import StoryMultiActorStage from "@/components/story/StoryMultiActorStage";
import { BACKGROUNDS } from "@/lib/story";
import { ANIMATION_LABELS, type AnimationType } from "@/lib/store";
import type { CharacterDefinition } from "@/lib/characterLibrary";
import type { StoryProject } from "@/lib/storyProject";
import { buildStoryPlaybackPlan, getPlaybackFrame } from "@/lib/storyPlaybackPlan";
import { BrowserStoryNarrator, speechCuesStartingBetween } from "@/lib/storyNarration";
import { recordVisualStoryPreview } from "@/lib/storyVisualCapture";
import { previewDurationMs } from "@/lib/storyExportPlan";
import { selectWebmMime } from "@/lib/mediaCapabilities";

type Props = { project: StoryProject; characters: CharacterDefinition[] };
const seconds = (ms: number) => (ms / 1000).toFixed(1);

export default function StorySequencePreview({ project, characters }: Props) {
  const plan = useMemo(() => buildStoryPlaybackPlan(project), [project]);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioMessage, setAudioMessage] = useState("");
  const narratorRef = useRef<BrowserStoryNarrator | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureAbortRef = useRef<AbortController | null>(null);
  const previewTickRef = useRef(-1);
  const [capturing, setCapturing] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => () => { captureAbortRef.current?.abort(); }, []);
  useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); }, [downloadUrl]);

  async function capturePreview() {
    if (capturing) return;
    const controller = new AbortController();
    captureAbortRef.current = controller;
    setCapturing(true);
    setPlaying(false);
    setAudioEnabled(false);
    narratorRef.current?.stop();
    setPosition(0);
    setExportMessage("جارٍ تجهيز فيديو معاينة صامت بأقصى مدة 30 ثانية...");
    try {
      const blob = await recordVisualStoryPreview({
        project,
        backgrounds: new Map(BACKGROUNDS.map(bg => [bg.id, bg.src])),
        getWebglCanvas: () => canvasRef.current?.isConnected ? canvasRef.current : null,
        onPosition: ms => {
          const tick = Math.floor(ms / 100);
          if (tick !== previewTickRef.current) {
            previewTickRef.current = tick;
            setPosition(ms);
          }
        },
        signal: controller.signal,
      });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setExportMessage("اكتمل ملف المعاينة الصامتة. يمكنك تنزيله بتنسيق WebM.");
    } catch (caught) {
      setExportMessage(caught instanceof Error ? caught.message : "فشل تسجيل المعاينة.");
    } finally {
      captureAbortRef.current = null;
      previewTickRef.current = -1;
      setCapturing(false);
    }
  }

  // Elapsed-time transport with voice cues triggered only on forward boundary crossings.
  // Browser TTS is preview-only; it is not mixed into exported video.
  useEffect(() => {
    if (!playing || plan.durationMs <= 0) {
      narratorRef.current?.stop();
      return;
    }
    let raf = 0;
    const from = Math.min(position, plan.durationMs);
    const startedAt = performance.now();
    let previousTime = from === 0 ? -1 : from;
    const narrator = audioEnabled ? (narratorRef.current ??= new BrowserStoryNarrator()) : null;
    const tick = (now: number) => {
      const nextTime = Math.min(plan.durationMs, from + Math.max(0, now - startedAt));
      if (narrator?.supported) {
        narrator.reconcile(nextTime);
        const starts = speechCuesStartingBetween(plan, previousTime, nextTime);
        const latestAudibleCue = starts.filter(c => nextTime < c.endMs).at(-1);
        if (latestAudibleCue) {
          const voice = characters.find(c => c.id === latestAudibleCue.characterId)?.voicePreset ?? "normal";
          narrator.speak(latestAudibleCue, voice);
        }
      }
      previousTime = nextTime;
      setPosition(nextTime);
      if (nextTime < plan.durationMs) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onVisibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      narrator?.stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  // Position is an initial transport offset only; including it would restart on every animation frame.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, plan, audioEnabled, characters]);

  useEffect(() => {
    setPlaying(false);
    setPosition(0);
  }, [project.id]);

  useEffect(() => {
    if (playing && position >= plan.durationMs) setPlaying(false);
  }, [playing, position, plan.durationMs]);

  const safePosition = Math.min(position, plan.durationMs);
  const frame = plan.durationMs > 0
    ? getPlaybackFrame(plan, Math.min(safePosition, plan.durationMs - 1))
    : null;
  const scene = frame ? project.scenes[frame.sceneIndex] : null;
  const backdrop = BACKGROUNDS.find(b => b.id === scene?.backgroundId);
  const speechCues = frame?.activeCues.filter(c => c.kind === "speech") ?? [];
  const visibleCharacters = scene?.actors.filter(actor => characters.some(ch => ch.id === actor.characterId)) ?? [];
  const actorAnimations: Record<string, AnimationType> = {};
  for (const cue of frame?.activeCues ?? []) {
    if (cue.kind === "animation" && Object.prototype.hasOwnProperty.call(ANIMATION_LABELS, cue.value)) {
      actorAnimations[cue.actorId] = cue.value as AnimationType;
    }
  }

  return (
    <section aria-label="معاينة القصة الزمنية" className="space-y-3 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="font-black">معاينة القصة</h2><p className="text-xs text-muted-foreground">معاينة المشاهد والحركات؛ يمكنك تفعيل صوت عربي تجريبي من المتصفح. الصوت لا يدخل في الفيديو المصدّر.</p></div>
        <span className="rounded-lg bg-muted px-3 py-1 font-mono text-xs" dir="ltr">{seconds(safePosition)}s / {seconds(plan.durationMs)}s</span>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted" style={backdrop
        ? { backgroundImage: `url("${backdrop.src}")`, backgroundSize: "cover", backgroundPosition: "center" }
        : undefined}>
        {visibleCharacters.length && scene ? (
          <StoryMultiActorStage
            scene={scene}
            backgroundUrl={backdrop?.src}
            actorAnimations={actorAnimations}
            characterIds={characters.map(c => c.id)}
            onCanvasReady={canvas => { canvasRef.current = canvas; }}
          />
        ) : <div className="flex h-full items-center justify-center bg-black/30 text-sm font-bold text-white">
          {scene ? "المشهد بدون شخصية قابلة للمعاينة" : "أضف مشهدًا لمعاينة القصة"}
        </div>}
        {scene && <div className="pointer-events-none absolute right-2 top-2 rounded-lg bg-black/70 px-3 py-1 text-xs text-white">
          {frame!.sceneIndex + 1}. {scene.title}
        </div>}
        {!!speechCues.length && <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-xl bg-black/75 p-3 text-center text-sm font-bold text-white">
          {speechCues.map(c => c.value).join(" — ")}
        </div>}
      </div>
      {!!scene?.actors.length && <p className="text-xs text-muted-foreground">الشخصيات: {scene.actors.map(a => characters.find(c => c.id === a.characterId)?.name ?? "شخصية غير متاحة").join("، ")}. تعرض المعاينة ثلاثية الأبعاد أول ثلاث شخصيات متاحة في المشهد، داخل عارض WebGL واحد. مواضع الشخصيات تقريبية ولا يشمل هذا تصدير فيديو.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={capturing} aria-pressed={audioEnabled} onClick={() => {
          if (audioEnabled) {
            narratorRef.current?.stop();
            setAudioEnabled(false);
            setAudioMessage("");
          } else {
            const narrator = narratorRef.current ??= new BrowserStoryNarrator();
            if (!narrator.supported) {
              setAudioMessage("الصوت العربي غير مدعوم بواسطة هذا المتصفح.");
              return;
            }
            setAudioMessage("سيبدأ الكلام عند بداية كل حوار جديد. قد لا ينتهي نطق الجملة بالضبط عند نهاية مدتها.");
            setAudioEnabled(true);
          }
        }} className="flex items-center gap-2 rounded-xl border px-3 py-2">
          {audioEnabled ? <Volume2 className="size-4"/> : <VolumeX className="size-4"/>}
          {audioEnabled ? "إيقاف الصوت" : "تفعيل الصوت"}
        </button>
        <button type="button" disabled={capturing || !plan.durationMs} onClick={() => {
          if (!playing && safePosition >= plan.durationMs) setPosition(0);
          setPlaying(v => !v);
        }} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />} {playing ? "إيقاف مؤقت" : "تشغيل"}
        </button>
        <button type="button" disabled={capturing} onClick={() => { setPlaying(false); setPosition(0); }} className="flex items-center gap-2 rounded-xl border px-3 py-2">
          <RotateCcw className="size-4"/> البداية
        </button>
        <input aria-label="الانتقال إلى توقيت القصة" className="min-w-40 flex-1 accent-primary"
          type="range" min={0} max={Math.max(1, plan.durationMs)} step={100}
          disabled={capturing || !plan.durationMs} value={safePosition} onChange={e => { setPlaying(false); narratorRef.current?.stop(); setPosition(Number(e.target.value)); }} />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
        {capturing ? (
          <button type="button" className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-destructive-foreground"
            onClick={() => captureAbortRef.current?.abort()}>
            <XCircle className="size-4"/> إلغاء التسجيل
          </button>
        ) : (
          <button type="button" className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 disabled:opacity-50"
            disabled={!previewDurationMs(project) || !selectWebmMime("video")}
            onClick={() => { void capturePreview(); }}>
            <Video className="size-4"/> تسجيل معاينة WebM صامتة
          </button>
        )}
        {downloadUrl && !capturing && <a href={downloadUrl} download={`story-preview-${project.id}.webm`}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground">
          <Download className="size-4"/> تنزيل الفيديو
        </a>}
        <span className="text-xs text-muted-foreground">بحد أقصى 30 ثانية، 854×480، بلا صوت. حوار النص يظهر داخل الفيديو، وSRT منفصل.</span>
      </div>
      {exportMessage && <p role="status" className="text-xs text-muted-foreground">{exportMessage}</p>}
      {audioMessage && <p role="status" className="text-xs text-muted-foreground">{audioMessage}</p>}
      <div className="flex gap-1" aria-label="الشريط الزمني للمشاهد">
        {plan.scenes.map(item => (
          <button type="button" key={item.sceneId} title={project.scenes[item.index]?.title}
            onClick={() => { if (capturing) return; setPlaying(false); setPosition(item.startMs); }}
            className={"min-w-0 rounded-md border p-2 text-xs " + (frame?.sceneId === item.sceneId ? "border-primary bg-primary/10" : "bg-muted")}
            style={{ flex: Math.max(1, item.endMs - item.startMs) }}>
            <span className="block truncate">{project.scenes[item.index]?.title}</span>
            <span className="block text-[10px] text-muted-foreground">{seconds(item.endMs-item.startMs)} ث</span>
          </button>
        ))}
      </div>
    </section>
  );
}
