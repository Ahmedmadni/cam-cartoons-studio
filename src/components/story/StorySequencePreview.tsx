import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import CharacterStage from "@/components/characters/CharacterStage";
import { BACKGROUNDS } from "@/lib/story";
import { ANIMATION_LABELS, type AnimationType } from "@/lib/store";
import type { CharacterDefinition } from "@/lib/characterLibrary";
import type { StoryProject } from "@/lib/storyProject";
import { buildStoryPlaybackPlan, getPlaybackFrame } from "@/lib/storyPlaybackPlan";

type Props = { project: StoryProject; characters: CharacterDefinition[] };
const seconds = (ms: number) => (ms / 1000).toFixed(1);

export default function StorySequencePreview({ project, characters }: Props) {
  const plan = useMemo(() => buildStoryPlaybackPlan(project), [project]);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const previousFrame = useRef<number | null>(null);

  // The preview clock is driven by elapsed time rather than counting frames.
  useEffect(() => {
    if (!playing || plan.durationMs <= 0) return;
    let raf = 0;
    previousFrame.current = null;
    const tick = (now: number) => {
      const previous = previousFrame.current;
      previousFrame.current = now;
      if (previous !== null) {
        setPosition(current => {
          const next = Math.min(plan.durationMs, current + Math.max(0, now - previous));
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onVisibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      previousFrame.current = null;
    };
  }, [playing, plan.durationMs]);

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
  const activeCue = frame?.activeCues.find(c => c.kind === "animation");
  const speechCues = frame?.activeCues.filter(c => c.kind === "speech") ?? [];
  const activeActorId = (frame?.activeCues[0]?.actorId ?? scene?.actors[0]?.id) || null;
  const leadActor = scene?.actors.find(a => a.id === activeActorId);
  const leadCharacter = characters.find(c => c.id === leadActor?.characterId);
  const cueName = activeCue?.value;
  const action: AnimationType = cueName && Object.prototype.hasOwnProperty.call(ANIMATION_LABELS, cueName)
    ? cueName as AnimationType : "idle";

  return (
    <section aria-label="معاينة القصة الزمنية" className="space-y-3 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="font-black">معاينة القصة</h2><p className="text-xs text-muted-foreground">المعاينة صامتة وتعتمد على توقيت المشاهد والحركات؛ ليست فيديو مصدّرًا.</p></div>
        <span className="rounded-lg bg-muted px-3 py-1 font-mono text-xs" dir="ltr">{seconds(safePosition)}s / {seconds(plan.durationMs)}s</span>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted" style={backdrop
        ? { backgroundImage: `url("${backdrop.src}")`, backgroundSize: "cover", backgroundPosition: "center" }
        : undefined}>
        {leadCharacter && scene ? (
          <CharacterStage
            key={leadCharacter.id}
            type={leadCharacter.id}
            animation={action}
            {...(backdrop ? { backgroundUrl: backdrop.src } : {})}
            framing={scene.camera.framing === "wide" ? "full" : scene.camera.framing === "medium" ? "upper" : "portrait"}
            spin={false}
            className="h-full w-full"
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
      {!!scene?.actors.length && <p className="text-xs text-muted-foreground">الشخصيات: {scene.actors.map(a => characters.find(c => c.id === a.characterId)?.name ?? "شخصية غير متاحة").join("، ")}. تعرض المعاينة ثلاثية الأبعاد شخصية نشطة واحدة حاليًا؛ دعم ظهور عدة شخصيات في إطار واحد قيد التطوير.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!plan.durationMs} onClick={() => {
          if (!playing && safePosition >= plan.durationMs) setPosition(0);
          setPlaying(v => !v);
        }} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />} {playing ? "إيقاف مؤقت" : "تشغيل"}
        </button>
        <button type="button" onClick={() => { setPlaying(false); setPosition(0); }} className="flex items-center gap-2 rounded-xl border px-3 py-2">
          <RotateCcw className="size-4"/> البداية
        </button>
        <input aria-label="الانتقال إلى توقيت القصة" className="min-w-40 flex-1 accent-primary"
          type="range" min={0} max={Math.max(1, plan.durationMs)} step={100}
          disabled={!plan.durationMs} value={safePosition} onChange={e => setPosition(Number(e.target.value))} />
      </div>
      <div className="flex gap-1" aria-label="الشريط الزمني للمشاهد">
        {plan.scenes.map(item => (
          <button type="button" key={item.sceneId} title={project.scenes[item.index]?.title}
            onClick={() => { setPlaying(false); setPosition(item.startMs); }}
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
