import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Captions, ChevronDown, ChevronUp, Clapperboard, Download, Film, FolderDown,
  Image, Mic, Pause, Play, Plus, RotateCcw, Settings2, Sparkles, Square,
  Trash2, Upload, Video, Volume2, WandSparkles,
} from "lucide-react";
import {
  CARTOONS, EXPRESSIONS, MAX_AUDIO_BYTES, MAX_DURATION_SECONDS, MAX_SCENES, STARTER, THEMES,
  parseSocialProject, projectSeconds, sceneAt, srtForProject,
  type CartoonId, type SceneMotion, type SceneExpression, type SceneTheme, type SceneTransition,
  type SocialProject, type SocialScene,
} from "@/lib/socialStudio";
import { renderSocialFrame } from "@/lib/socialCanvas";
import { renderCartoonCharacter } from "@/lib/socialCharacterRig";
import {
  ART_LAYER_LABELS, artStatus, hydrateCharacterArt, paintIllustratedCharacter, saveCharacterArt, restoreSamiReferenceArt,
  type CharacterArtLayer,
} from "@/lib/socialCharacterArt";
import {
  amplitudeAt, analyzeSocialAudio, exportSocialVideo, loadSocialAudio, saveSocialAudio,
  loadSceneVoices, saveSceneVoice,
} from "@/lib/socialVideo";
import { sceneVoiceEnergyAt, voiceBarHeights } from "@/lib/socialAudioTimeline";
import { selectWebmMime } from "@/lib/mediaCapabilities";
import { CharacterRigEditor } from "@/components/characters/CharacterRigEditor";
import { RIG_REQUIRED_LAYERS } from "@/lib/characterRigRenderer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cartoon Content Studio | استوديو المحتوى الكرتوني" },
      { name: "description", content: "صمّم مشاهد برسومات كرتونية متحركة، أضف التعليق الصوتي، وصدّر فيديوهات 9:16 للسوشيال ميديا." },
      { property: "og:title", content: "استوديو المحتوى الكرتوني" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SocialCreator,
});

type Panel = "scenes" | "characters" | "rig" | "audio" | "export";
const input = "w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100";
const primary = "inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50";
function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "scene-" + Date.now() + "-" + Math.random();
}
function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
function formatSeconds(seconds: number) {
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
}
function timelineStart(project: SocialProject, index: number) {
  return project.scenes.slice(0, index).reduce((a, scene) => a + scene.duration, 0);
}

/** Actual miniature rig preview, rather than misleading stock emoji for each actor. */
function CartoonThumbnail({character,revision}:{character:CartoonId;revision:number}) {
  const ref=useRef<HTMLCanvasElement|null>(null);
  useEffect(()=>{
    const canvas=ref.current,ctx=canvas?.getContext("2d");
    if(!canvas||!ctx)return;
    const colors:Record<CartoonId,string>={sami:"#fff0cf",layla:"#f0defc",omar:"#ddf4e9",nour:"#d7e9fe"};
    ctx.fillStyle=colors[character];ctx.fillRect(0,0,160,160);
    ctx.save();
    ctx.translate(80-360*.23,80-510*.23);
    ctx.scale(.23,.23);
    if(!paintIllustratedCharacter(ctx,character,.7,0,"idle","happy"))
      renderCartoonCharacter(ctx,character,.7,0,"idle","happy");
    ctx.restore();
  },[character,revision]);
  return <canvas ref={ref} width={160} height={160} role="img" aria-label={"رسم شخصية "+character} className="mx-auto mb-2 h-17 w-17 rounded-2xl border border-white/60 shadow-sm" />;
}

function SocialCreator() {
  const [project, setProject] = useState<SocialProject>(STARTER);
  const [artRevision, setArtRevision] = useState(0);
  const [artUploading, setArtUploading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState(0);
  const [panel, setPanel] = useState<Panel>("scenes");
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioName, setAudioName] = useState("");
  const [audioDuration, setAudioDuration] = useState(0);
  const [envelope, setEnvelope] = useState<Float32Array | null>(null);
  const [sceneAudio, setSceneAudio] = useState<Map<string, Blob>>(() => new Map());
  const [sceneAnalyses, setSceneAnalyses] = useState<Map<string, {duration:number; envelope:Float32Array}>>(() => new Map());
  const [quality, setQuality] = useState<"standard"|"high">("standard");
  const [recordingMic, setRecordingMic] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportPercent, setExportPercent] = useState(0);
  const [video, setVideo] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const previewCanvas = useRef<HTMLCanvasElement | null>(null);
  const mic = useRef<MediaRecorder | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  const activeSceneVoice = useRef<{id:string; player: HTMLAudioElement; url:string}|null>(null);
  const exportAbort = useRef<AbortController | null>(null);
  const projectRef = useRef(project);
  projectRef.current = project;
  const duration = projectSeconds(project);
  const selected = project.scenes[Math.min(active, project.scenes.length - 1)]!;
  const setNotice = (text: string) => { setMessage(text); setError(""); };
  const activeSceneAudio = sceneAudio.get(selected.id) ?? null;
  const currentAnalysis = sceneAnalyses.get(selected.id);
  const hasNarration = project.narrationMode === "scenes" ? sceneAudio.size > 0 : audio !== null;
  function stopSceneVoice() {
    const current = activeSceneVoice.current;
    if (!current) return;
    current.player.pause(); URL.revokeObjectURL(current.url);
    activeSceneVoice.current = null;
  }
  async function hydrateSceneClips(ids: string[]) {
    const voices = await loadSceneVoices(ids);
    const analyses = new Map<string, {duration:number; envelope:Float32Array}>();
    for (const [id,clip] of voices) {
      try { analyses.set(id, await analyzeSocialAudio(clip)); } catch { /* corrupted legacy audio is skipped */ }
    }
    setSceneAudio(voices); setSceneAnalyses(analyses);
  }

  useEffect(() => {
    let initial = STARTER;
    try {
      const saved = localStorage.getItem("cam-social-project-v1");
      if (saved) initial = parseSocialProject(JSON.parse(saved) as unknown);
      setProject(initial);
    } catch {
      setError("تعذر استعادة المشروع المحفوظ؛ لم يتم حذف بياناتك القديمة.");
    }
    setHydrated(true);
    let live = true;
    void hydrateCharacterArt().then(() => { if(live)setArtRevision(x=>x+1); })
      .catch(() => { if(live)setMessage("تعذر استعادة بعض صور الشخصيات؛ ستظهر الرسومات الاحتياطية."); });
    void hydrateSceneClips(initial.scenes.map(s=>s.id)).catch(() => { if(live) setMessage("تعذر استعادة بعض ملفات صوت المشاهد."); });
    loadSocialAudio().then(async blob => {
      if (!blob || !live) return;
      const analysis = await analyzeSocialAudio(blob);
      if (!live) return;
      setAudio(blob); setEnvelope(analysis.envelope); setAudioDuration(analysis.duration);
      setAudioName("تعليق صوتي محفوظ");
    }).catch(() => { if (live) setMessage("لم يمكن استرجاع ملف الصوت السابق؛ أعد تحميله."); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("cam-social-project-v1", JSON.stringify(project)); }
    catch { setError("لم ينجح الحفظ التلقائي. نزّل نسخة JSON من المشروع."); }
  }, [project, hydrated]);
  useEffect(() => {
    if (!audio) { audioPlayer.current = null; return; }
    const url = URL.createObjectURL(audio);
    const element = new Audio(url);
    element.preload = "auto";
    audioPlayer.current = element;
    return () => { element.pause(); URL.revokeObjectURL(url); if (audioPlayer.current === element) audioPlayer.current = null; };
  }, [audio]);
  useEffect(() => {
    if (!video) { setVideoUrl(null); return; }
    const url = URL.createObjectURL(video);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);
  useEffect(() => () => {
    stopSceneVoice();
    try { if (mic.current && mic.current.state !== "inactive") mic.current.stop(); } catch { /* noop */ }
    micStream.current?.getTracks().forEach(track => track.stop());
    exportAbort.current?.abort();
  }, []);

  useEffect(() => {
    const canvas = previewCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let raf = 0;
    let lastUi = 0;
    const startClock = performance.now();
    const initial = playing ? 0 : timelineStart(project, Math.min(active, project.scenes.length - 1)) + .6;
    const sceneCurves = new Map([...sceneAnalyses].map(([id,a])=>[id,a.envelope] as const));
    const tick = (now: number) => {
      const t = playing ? Math.min(duration, (now - startClock) / 1000) : initial;
      const energy = project.narrationMode==="scenes" ? sceneVoiceEnergyAt(project,t,sceneCurves) : amplitudeAt(envelope,t);
      renderSocialFrame(ctx, project, t, energy);
      if (playing && project.narrationMode==="scenes") {
        const {scene,elapsed} = sceneAt(project,t);
        const voice = sceneAudio.get(scene.id);
        if (voice && elapsed >= scene.audioDelayMs/1000 && elapsed < scene.duration && activeSceneVoice.current?.id!==scene.id) {
          stopSceneVoice();
          const url=URL.createObjectURL(voice);
          const player=new Audio(url); player.preload="auto";
          player.currentTime=Math.max(0,elapsed-scene.audioDelayMs/1000);
          activeSceneVoice.current={id:scene.id,player,url};
          void player.play().catch(()=>setError("تعذر تشغيل صوت المشهد؛ تحقق من إعدادات المتصفح."));
        } else if (!voice || elapsed < scene.audioDelayMs/1000 || elapsed >= scene.duration) stopSceneVoice();
      }
      if (playing && now - lastUi > 120) { lastUi = now; setPosition(t); }
      if (playing && t >= duration) {
        stopSceneVoice(); audioPlayer.current?.pause();
        setPlaying(false); setPosition(0);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [project, playing, active, envelope, duration, sceneAudio, sceneAnalyses, artRevision]);

  async function uploadArtwork(file: File|undefined, layer: CharacterArtLayer) {
    if(!file || artUploading)return;
    setArtUploading(true); setError("");
    try {
      await saveCharacterArt(selected.character,layer,file);
      setArtRevision(x=>x+1); setVideo(null);
      setPlaying(false); stopSceneVoice(); audioPlayer.current?.pause();
      setNotice(layer==="base"
        ? "تمت إضافة الشخصية المرسومة. سيستخدم التصدير الصورة نفسها، ويمكن رفع طبقات الفم والعينين لإضافة التحريك."
        : "تم حفظ طبقة التعبير ودمجها مع الشخصية.");
    } catch(e) { setError(e instanceof Error?e.message:"تعذر استيراد الرسم."); }
    finally { setArtUploading(false); }
  }
  async function deleteArtwork(layer: CharacterArtLayer) {
    setArtUploading(true); setError("");
    try{
      await saveCharacterArt(selected.character,layer,null);
      if(layer==="base" && selected.character==="sami")await restoreSamiReferenceArt();
      setArtRevision(x=>x+1); setVideo(null);
      setNotice(layer==="base"
        ? (selected.character==="sami"?"تمت استعادة الرسم المرجعي الأصلي لسامي.":"تمت العودة إلى الشخصية الاحتياطية.")
        : "تم حذف الطبقة.");
    } catch(e) {setError(e instanceof Error?e.message:"تعذر حذف الطبقة.");}
    finally {setArtUploading(false);}
  }
  function patchProject(change: Partial<SocialProject>) {
    setPlaying(false);
    audioPlayer.current?.pause(); stopSceneVoice();
    setVideo(null);
    setProject(previous => ({ ...previous, ...change }));
  }
  function patchScene(change: Partial<SocialScene>) {
    setPlaying(false);
    audioPlayer.current?.pause(); stopSceneVoice();
    setVideo(null);
    setProject(previous => ({
      ...previous,
      scenes: previous.scenes.map((item, index) => index === active ? { ...item, ...change } : item),
    }));
  }
  function addScene() {
    if (project.scenes.length >= MAX_SCENES || duration + 5 > MAX_DURATION_SECONDS) {
      setError("الحد الأقصى 20 مشهداً ودقيقتان لكل فيديو."); return;
    }
    const next: SocialScene = {
      id: createId(), headline: "عنوان المشهد", caption: "اكتب هنا الجملة التي ستظهر على الشاشة.",
      character: selected.character, theme: selected.theme, motion: "talk", expression:"happy", audioDelayMs:0, transition: "fade", duration: 5,
    };
    setProject(previous => ({ ...previous, scenes: [...previous.scenes, next] }));
    setActive(project.scenes.length); setPlaying(false); setVideo(null); setNotice("تمت إضافة مشهد جديد.");
  }
  function moveScene(index: number, step: number) {
    const to = index + step;
    if (to < 0 || to >= project.scenes.length) return;
    setProject(previous => {
      const scenes = [...previous.scenes];
      [scenes[index], scenes[to]] = [scenes[to]!, scenes[index]!];
      return { ...previous, scenes };
    });
    stopSceneVoice(); setActive(to); setPlaying(false); setVideo(null);
  }
  function removeScene(index: number) {
    if (project.scenes.length === 1) { setError("يجب الاحتفاظ بمشهد واحد على الأقل."); return; }
    setProject(previous => ({ ...previous, scenes: previous.scenes.filter((_, i) => i !== index) }));
    setActive(Math.max(0, Math.min(index, project.scenes.length - 2)));
    stopSceneVoice(); setSceneAudio(prev=>{const next=new Map(prev);next.delete(project.scenes[index]!.id);return next;});
    setSceneAnalyses(prev=>{const next=new Map(prev);next.delete(project.scenes[index]!.id);return next;});
    void saveSceneVoice(project.scenes[index]!.id,null).catch(()=>setError("تعذر حذف صوت المشهد من التخزين."));
    setPlaying(false); setVideo(null);
  }
  function togglePreview() {
    if (playing) { stopSceneVoice(); audioPlayer.current?.pause(); setPlaying(false); setPosition(0); return; }
    setError("");
    const element = audioPlayer.current;
    if (element && project.narrationMode==="global") {
      element.pause();
      element.currentTime = 0;
      void element.play().catch(() => { setError("تعذر تشغيل الصوت؛ يرجى التحقق من إعدادات المتصفح."); });
    } else element?.pause();
    stopSceneVoice();
    setPosition(0);
    setPlaying(true);
  }
  async function useAudio(blob: Blob, name: string) {
    setError("");
    try {
      if (blob.size > MAX_AUDIO_BYTES || !blob.size) throw new Error("الحد الأقصى للصوت 30 ميجابايت.");
      const result = await analyzeSocialAudio(blob);
      await saveSocialAudio(blob);
      setPlaying(false);
      setAudio(blob); setEnvelope(result.envelope); setAudioDuration(result.duration);
      setAudioName(name); setVideo(null);
      setNotice("تم تجهيز التعليق الصوتي وتخزينه محلياً في هذا المتصفح.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر قراءة الملف الصوتي."); }
  }
  async function useSceneAudio(blob: Blob, sceneId: string) {
    setError("");
    try {
      const analysis = await analyzeSocialAudio(blob);
      await saveSceneVoice(sceneId,blob);
      setSceneAudio(prev=>new Map(prev).set(sceneId,blob));
      setSceneAnalyses(prev=>new Map(prev).set(sceneId,analysis));
      stopSceneVoice(); setPlaying(false); setVideo(null);
      setNotice("تم حفظ التعليق الصوتي للمشهد الحالي، ويمكن استخدامه بعد إعادة ترتيب المشاهد.");
    } catch(caught) { setError(caught instanceof Error?caught.message:"تعذر حفظ صوت المشهد."); }
  }
  async function removeSceneAudio(id:string) {
    try {
      await saveSceneVoice(id,null);
      stopSceneVoice(); setPlaying(false);
      setSceneAudio(prev=>{const next=new Map(prev);next.delete(id);return next;});
      setSceneAnalyses(prev=>{const next=new Map(prev);next.delete(id);return next;});
      setVideo(null);setNotice("تم حذف صوت المشهد.");
    } catch {setError("تعذر حذف صوت المشهد.");}
  }
  async function removeAudio() {
    try {
      await saveSocialAudio(null);
      audioPlayer.current?.pause(); setPlaying(false); setAudio(null); setEnvelope(null);
      setAudioDuration(0); setAudioName(""); setVideo(null);
      setNotice("تم حذف التعليق الصوتي من هذا المتصفح.");
    } catch { setError("تعذر حذف الملف الصوتي."); }
  }
  async function startMic() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("الميكروفون غير متاح. استخدم اتصال HTTPS أو ارفع ملف صوتي.");
      const mimeType = selectWebmMime("audio");
      if (!mimeType) throw new Error("المتصفح لا يدعم تسجيل الصوت. ارفع ملف MP3 أو WAV.");
      const targetScene = project.narrationMode==="scenes" ? selected.id : null;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.current = stream;
      const parts: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      mic.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) parts.push(event.data); };
      recorder.onerror = () => setError("حدث خطأ أثناء تسجيل الميكروفون.");
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        micStream.current = null; mic.current = null; setRecordingMic(false);
        if (parts.length) {
          const recording=new Blob(parts, { type: mimeType });
          if(targetScene) void useSceneAudio(recording,targetScene);
          else void useAudio(recording, "تسجيل الميكروفون");
        }
      };
      recorder.start();
      setRecordingMic(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر فتح الميكروفون."); }
  }
  function stopMic() {
    if (mic.current?.state === "recording") mic.current.stop();
  }
  async function exportVideo() {
    if (exporting) return;
    setError(""); setMessage(""); setExporting(true); setExportPercent(0); setVideo(null);
    const controller = new AbortController();
    exportAbort.current = controller;
    try {
      setPlaying(false); audioPlayer.current?.pause(); stopSceneVoice();
      const result = await exportSocialVideo({
        project, narration: audio, sceneNarrations:sceneAudio, quality,
        signal: controller.signal, onProgress: value => setExportPercent(Math.round(value * 100)),
      });
      setVideo(result);
      setNotice("تم إنتاج الفيديو. يمكنك تحميله ومراجعته قبل النشر.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "فشل التصدير."); }
    finally { setExporting(false); exportAbort.current = null; }
  }
  async function importProject(file?: File) {
    if (!file) return;
    if (file.size > 150_000) { setError("ملف JSON كبير جداً."); return; }
    try {
      const parsed = parseSocialProject(JSON.parse(await file.text()) as unknown);
      stopSceneVoice(); setProject(parsed); setActive(0); setPlaying(false); setVideo(null);
      void hydrateSceneClips(parsed.scenes.map(s=>s.id)).catch(()=>setError("تعذر استعادة أصوات بعض المشاهد."));
      setNotice("تم استيراد المشاهد. الصوت يُخزن بصورة منفصلة على الجهاز، فراجع التعليق الصوتي قبل التصدير.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر استيراد الملف."); }
  }
  function resetProject() {
    if (!window.confirm("إنشاء مشروع جديد؟ سيُستبدل المشروع الحالي. حمّل نسخة JSON أولاً إذا أردت الاحتفاظ به.")) return;
    stopSceneVoice();setProject(STARTER); setActive(0); setPlaying(false); setVideo(null); setNotice("تم فتح قالب جديد. ملفات الصوت القديمة لم تُحذف من التخزين المحلي.");
    void hydrateSceneClips(STARTER.scenes.map(s=>s.id)).catch(()=>{});
  }
  const exportSupported = typeof window === "undefined" || Boolean(selectWebmMime("video"));

  return (
    <main dir="rtl" className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-cyan-500 text-white shadow-lg shadow-cyan-100"><Clapperboard className="size-7" /></div>
            <div>
              <div className="text-xl font-black tracking-tight sm:text-2xl">Cartoon Content <span className="text-cyan-600">Studio</span></div>
              <p className="text-xs font-semibold text-slate-500">صناعة فيديوهات كرتونية متحركة للسوشيال ميديا</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 sm:inline-flex">مشروعك محفوظ على هذا الجهاز</span>
            <button type="button" className={secondary} onClick={resetProject}><RotateCcw className="size-4" /> مشروع جديد</button>
          </div>
        </header>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-7 sm:px-7">
        <div className="mb-6 rounded-3xl bg-gradient-to-l from-[#14223e] to-[#25395b] p-5 text-white sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200"><Sparkles className="size-4" /> استوديو 2D</span>
              <h1 className="text-2xl font-black leading-relaxed sm:text-3xl">من الفكرة إلى فيديو بشخصية كرتونية</h1>
              <p className="mt-2 text-sm leading-7 text-slate-200">اكتب مشاهدك، اختر الشخصية والخلفية، أضف صوتك أو ملف التعليق، ثم صدّر فيديو رأسيًا جاهزًا للمونتاج أو النشر.</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-extrabold"><Video className="size-5 text-cyan-300" /> 9:16 · رسوم 2D · صوت متعدد المشاهد</div>
          </div>
        </div>

        {(message || error) && <div role={error ? "alert" : "status"} className={"mb-5 rounded-2xl border p-4 text-sm font-bold " + (error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-teal-200 bg-teal-50 text-teal-900")}>{error || message}</div>}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(315px,430px)]">
          <section className="min-w-0 space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-black"><Film className="size-5 text-cyan-600" /> إعداد الفيديو</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{project.scenes.length} مشاهد · {formatSeconds(duration)}</span>
              </div>
              <label className="block text-xs font-extrabold text-slate-600" htmlFor="social-title">عنوان المشروع</label>
              <input id="social-title" className={input + " mt-2"} maxLength={100} value={project.title} onChange={e => patchProject({ title: e.target.value })} />
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {([
                  ["scenes", "المشاهد", Film], ["characters", "الشخصيات", WandSparkles],
                  ["rig", "المفاصل", Settings2], ["audio", "الصوت", Mic], ["export", "التصدير", Download],
                ] as const).map(([key, label, Icon]) => (
                  <button type="button" key={key} onClick={() => setPanel(key)} aria-pressed={panel === key}
                    className={"flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-xs font-extrabold transition " + (panel === key ? "bg-cyan-500 text-white shadow-lg shadow-cyan-100" : "bg-slate-50 text-slate-600 hover:bg-cyan-50")}>
                    <Icon className="size-5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {panel === "scenes" && <>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-black">تسلسل المشاهد</h2>
                  <button type="button" className={secondary} onClick={addScene} disabled={project.scenes.length >= MAX_SCENES || duration + 5 > MAX_DURATION_SECONDS}><Plus className="size-4" /> مشهد جديد</button>
                </div>
                <div className="space-y-2">
                  {project.scenes.map((scene, index) => (
                    <div key={scene.id} className={"flex items-center gap-2 rounded-2xl border p-2.5 transition " + (active === index ? "border-cyan-400 bg-cyan-50" : "border-slate-200")}>
                      <button type="button" onClick={() => { stopSceneVoice(); setActive(index); setPlaying(false); audioPlayer.current?.pause(); }} className="min-w-0 flex flex-1 items-center gap-3 text-right">
                        <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black " + (active === index ? "bg-cyan-500 text-white" : "bg-slate-100 text-slate-700")}>{index + 1}</span>
                        <span className="min-w-0"><strong className="block truncate text-sm">{scene.headline || "مشهد بلا عنوان"}</strong><span className="block text-xs text-slate-500">{CARTOONS.find(c => c.id === scene.character)?.name} · {scene.duration} ثوانٍ</span></span>
                      </button>
                      <button type="button" aria-label="تحريك المشهد للأعلى" title="لأعلى" disabled={index === 0} className="rounded-lg p-2 text-slate-500 disabled:opacity-30" onClick={() => moveScene(index, -1)}><ChevronUp className="size-4" /></button>
                      <button type="button" aria-label="تحريك المشهد للأسفل" title="لأسفل" disabled={index === project.scenes.length - 1} className="rounded-lg p-2 text-slate-500 disabled:opacity-30" onClick={() => moveScene(index, 1)}><ChevronDown className="size-4" /></button>
                      <button type="button" aria-label="حذف المشهد" title="حذف" disabled={project.scenes.length === 1} className="rounded-lg p-2 text-rose-600 disabled:opacity-30" onClick={() => removeScene(index)}><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-6 text-slate-500">اختر أي مشهد لتعديل النص وحركة الشخصية. مجموع الفيديو بحد أقصى دقيقتين.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="mb-5 text-lg font-black">تحرير المشهد {active + 1}</h3>
                <div className="space-y-4">
                  <label className="block text-sm font-bold">عنوان المشهد<input className={input + " mt-2"} maxLength={80} value={selected.headline} onChange={e => patchScene({ headline: e.target.value })} /></label>
                  <label className="block text-sm font-bold">النص الظاهر على الفيديو<textarea className={input + " mt-2 min-h-30 resize-y"} maxLength={140} value={selected.caption} onChange={e => patchScene({ caption: e.target.value })} placeholder="جملة قصيرة وواضحة تناسب سرعة القراءة" /></label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block text-sm font-bold">مدة المشهد
                      <select className={input + " mt-2"} value={selected.duration} onChange={e => {
                        const next = Number(e.target.value);
                        if (duration - selected.duration + next > MAX_DURATION_SECONDS) { setError("لا يمكن تجاوز دقيقتين."); return; }
                        patchScene({ duration: next, audioDelayMs: Math.min(selected.audioDelayMs, Math.max(0, next*1000-250)) });
                      }}>
                        {Array.from({ length: 29 }, (_, i) => i + 2).map(n => <option key={n} value={n}>{n} ثانية</option>)}
                      </select>
                    </label>
                    <label className="block text-sm font-bold">طريقة الانتقال
                      <select className={input + " mt-2"} value={selected.transition} onChange={e => patchScene({ transition: e.target.value as SceneTransition })}>
                        <option value="cut">قطع مباشر</option><option value="fade">ظهور تدريجي</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            </>}

            {panel === "rig" && <CharacterRigEditor character={selected.character} durationSeconds={selected.duration}
              revision={artRevision} rig={selected.rig} onChange={value=>patchScene({rig:value})} />}
            {panel === "characters" && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black">شخصيات كرتونية مرسومة 2D</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">الشخصيات أصلية مرسومة بأشكال قابلة للتحريك، لا تعتمد على صور أشخاص حقيقيين ولا على الكاميرا.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {CARTOONS.map(character => (
                  <button type="button" key={character.id} aria-pressed={selected.character === character.id}
                    onClick={() => patchScene({ character: character.id as CartoonId })} className={"rounded-2xl border p-4 text-center transition " + (selected.character === character.id ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100")}>
                    <CartoonThumbnail character={character.id} revision={artRevision} />
                    <strong className="block text-sm">{character.name}</strong><span className="text-xs text-slate-500">{character.description}</span>
                  </button>
                ))}
              </div>
              <label className="mt-6 block text-sm font-bold">الحركة
                <select className={input + " mt-2"} value={selected.motion} onChange={e => patchScene({ motion: e.target.value as SceneMotion })}>
                  <option value="talk">تحدث</option><option value="explain">شرح وإشارة باليد</option><option value="wave">ترحيب</option><option value="idle">وقوف طبيعي</option>
                </select>
              </label>
              <label className="mt-4 block text-sm font-bold">تعبير الوجه
                <select aria-label="تعبير الوجه" className={input + " mt-2"} value={selected.expression} onChange={e=>patchScene({expression:e.target.value as SceneExpression})}>
                  {EXPRESSIONS.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
              <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                <h3 className="text-sm font-black text-cyan-950">أصول الشخصيات المرسومة — بدون أشكال هندسية</h3>
                <p className="mt-2 text-xs leading-6 text-cyan-900">
                  يمكنك رفع رسم متكامل شفاف للشخصية المحددة بدل الرسم البرمجي.
                  ستظهر الصورة نفسها في المكتبة والمعاينة والفيديو، محفوظة محليًا دون تسجيل دخول.
                </p>
                <p className="mt-2 text-xs font-bold text-cyan-900">
                  {artStatus(selected.character).hasBase
                    ? "الشخصية لها رسم مصور"
                    : "لم يضاف رسم مصور لهذه الشخصية — يظهر الرسم الاحتياطي"}
                  {artStatus(selected.character).hasMouth ? " · الشفاه قابلة للتحريك" : " · الشفاه ثابتة حتى تضاف طبقات الفم"}
                  {artStatus(selected.character).hasRig ? " · المفاصل جاهزة للتحريك" : " · المفاصل تحتاج طبقات مستقلة"}
                </p>
                <div className="mt-3 space-y-2">
                  {(["base","mouthClosed","mouthOpen","eyesClosed"] as CharacterArtLayer[]).map(layer=>(
                    <div key={layer} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-100 bg-white p-2">
                      <span className="text-xs font-extrabold text-slate-700">{ART_LAYER_LABELS[layer]}</span>
                      <label className={secondary+" cursor-pointer !px-3 !py-2 !text-xs"}>
                        {artUploading?"...":"رفع صورة"}
                        <input type="file" accept={layer==="base"?"image/png,image/webp,image/jpeg": "image/png,image/webp"}
                          aria-label={"رفع "+ART_LAYER_LABELS[layer]}
                          className="sr-only" disabled={artUploading}
                          onChange={e=>{void uploadArtwork(e.target.files?.[0],layer);e.currentTarget.value="";}} />
                      </label>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-6 text-cyan-900">
                  طبقات الفم والعينين اختيارية، ويجب أن تكون صور PNG أو WebP شفافة بأبعاد مطابقة للرسم الأساسي.
                  الرسم المفرد لا يملك مزامنة شفاه أو حركة يد حقيقية. لا تُستبدل التسجيلات الصوتية عند تغيير الرسم.
                </p>
                {artStatus(selected.character).hasBase && <button type="button" disabled={artUploading}
                  className="mt-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700"
                  onClick={()=>void deleteArtwork("base")}>{selected.character==="sami"?"استعادة الرسم المرجعي":"العودة إلى الرسم الاحتياطي"}</button>}
              </div>
              <h3 className="mb-3 mt-6 text-sm font-black">الخلفية</h3>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map(theme => <button type="button" key={theme.id} onClick={() => patchScene({ theme: theme.id as SceneTheme })} aria-pressed={selected.theme === theme.id}
                  className={"rounded-2xl border p-2 text-xs font-bold " + (selected.theme === theme.id ? "border-cyan-500 ring-2 ring-cyan-100" : "border-slate-200")}>
                  <span className="mb-2 block h-14 rounded-xl" style={{ background: theme.color }} /><span>{theme.name}</span>
                </button>)}
              </div>
            </div>}

            {panel === "audio" && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-black"><Volume2 className="size-5 text-cyan-500" /> التعليق الصوتي</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">اختر تسجيلًا واحدًا للفيديو أو تعليقًا مستقلًا لكل مشهد. الفيديو النهائي يدمج المقاطع المسجلة فعليًا، ويحرك الفم وفق مستوى الصوت، وليس تعرفًا دقيقًا على الحروف.</p>
              <div role="radiogroup" aria-label="طريقة التعليق الصوتي" className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" role="radio" aria-checked={project.narrationMode==="global"}
                  className={"rounded-xl border p-3 text-xs font-extrabold "+(project.narrationMode==="global"?"border-cyan-500 bg-cyan-50 text-cyan-900":"border-slate-200")}
                  onClick={()=>patchProject({narrationMode:"global"})}>صوت للفيديو بالكامل</button>
                <button type="button" role="radio" aria-checked={project.narrationMode==="scenes"}
                  className={"rounded-xl border p-3 text-xs font-extrabold "+(project.narrationMode==="scenes"?"border-cyan-500 bg-cyan-50 text-cyan-900":"border-slate-200")}
                  onClick={()=>patchProject({narrationMode:"scenes"})}>صوت مستقل لكل مشهد</button>
              </div>
              {project.narrationMode==="scenes" && <div className="mt-4 rounded-xl bg-cyan-50 p-3 text-sm font-bold text-cyan-950">
                الصوت الجاري تعديله: المشهد {active+1} — {selected.headline || "مشهد بلا عنوان"}
                <p className="mt-1 text-xs font-normal">يمكن اختيار أي مشهد من الأزرار التالية وإرفاق صوت مختلف له. يظل الصوت مرتبطًا بالمشهد عند تغيير الترتيب.</p>
                <div aria-label="اختيار مشهد الصوت" className="mt-3 flex flex-wrap gap-2">
                  {project.scenes.map((s,i)=><button type="button" key={s.id}
                    onClick={()=>{stopSceneVoice();audioPlayer.current?.pause();setPlaying(false);setActive(i);}}
                    aria-pressed={active===i}
                    className={"rounded-lg border px-3 py-2 text-xs font-bold "+(active===i?"border-cyan-500 bg-cyan-600 text-white":"border-cyan-200 bg-white text-cyan-900")}>
                    المشهد {i+1} {sceneAudio.has(s.id)?"●":""}
                  </button>)}
                </div>
              </div>}
              <div className="mt-5 flex flex-wrap gap-2">
                <label className={secondary + " cursor-pointer"}><Upload className="size-4" /> رفع MP3 / WAV / WebM
                  <input type="file" className="sr-only" accept="audio/*,.mp3,.wav,.webm,.m4a" onChange={e => { const file = e.target.files?.[0]; if (file) { if(project.narrationMode==="scenes")void useSceneAudio(file,selected.id);else void useAudio(file,file.name); } e.currentTarget.value = ""; }} />
                </label>
                {recordingMic ?
                  <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white" onClick={stopMic}><Square className="size-4" /> إنهاء التسجيل</button> :
                  <button type="button" className={primary} onClick={() => void startMic()}><Mic className="size-4" /> تسجيل صوت</button>}
              </div>
              {recordingMic && <p role="status" className="mt-3 text-sm font-bold text-rose-600">الميكروفون يسجل الآن. اضغط إنهاء التسجيل لحفظه.</p>}
              {project.narrationMode==="global" && audio ? <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><strong className="block text-sm text-emerald-900">{audioName}</strong><span className="text-xs text-emerald-700">المدة: {formatSeconds(audioDuration)} · الحجم {(audio.size / 1024 / 1024).toFixed(1)} MB</span></div>
                  <button type="button" className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-600" onClick={() => void removeAudio()}>حذف الصوت</button>
                </div>
                {Math.abs(audioDuration - duration) > 1 && <p className="mt-3 text-xs leading-6 text-amber-900">مدة التعليق مختلفة عن مدة المشاهد ({formatSeconds(duration)}). سيُقطع الصوت الزائد أو يبقى باقي الفيديو صامتًا. اضبط أزمنة المشاهد لتتوافق معه.</p>}
              </div> : null}
              {project.narrationMode==="scenes" && <>
                {activeSceneAudio && currentAnalysis ? <div className="mt-5 space-y-3 rounded-2xl bg-emerald-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-emerald-900">التعليق الصوتي للمشهد {active+1} — {formatSeconds(currentAnalysis.duration)}</strong>
                    <button type="button" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-rose-600" onClick={()=>void removeSceneAudio(selected.id)}>حذف تسجيل المشهد</button>
                  </div>
                  <div aria-label="الموجة الصوتية للمشهد" className="flex h-17 items-center justify-center gap-[2px] rounded-lg bg-white px-2">
                    {voiceBarHeights(currentAnalysis.envelope,42).map((height,i)=><span key={i} className="w-1 flex-1 rounded-full bg-cyan-500" style={{height:height+"%"}} />)}
                  </div>
                  <label className="block text-sm font-bold">تأخير بداية الصوت داخل المشهد
                    <select aria-label="تأخير بداية الصوت" className={input+" mt-2"} value={selected.audioDelayMs} onChange={e=>patchScene({audioDelayMs:Number(e.target.value)})}>
                      {[0,250,500,750,1000,1500,2000,3000].filter(n=>n<selected.duration*1000-249).map(n=><option value={n} key={n}>{(n/1000).toFixed(2)} ثانية</option>)}
                    </select>
                  </label>
                  {currentAnalysis.duration+selected.audioDelayMs/1000>selected.duration+.2 && <p className="text-xs text-amber-800">التعليق أطول من الوقت المتاح؛ سيتم قص الصوت تلقائيًا عند نهاية المشهد.</p>}
                </div> : <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">لم تُضف تسجيلًا للمشهد {active+1} بعد. يمكنك رفع ملف أو تسجيل صوت الآن.</div>}
                <div className="mt-3 text-xs font-bold text-slate-500">المشاهد التي تحتوي على صوت: {sceneAudio.size} من {project.scenes.length}</div>
              </>}
              {project.narrationMode==="global" && !audio && <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">لا يوجد ملف صوتي بعد. يمكن تصدير فيديو صامت، لكن إنشاء تعليق صوتي آلي غير مفعّل دون مزود توليد صوت حقيقي.</div>}
              <p className="mt-4 text-xs leading-6 text-slate-500">ملفات الصوت محفوظة محليًا في IndexedDB وليست جزءًا من نسخة JSON. احتفظ بنسخ ملفاتك الصوتية الأصلية بشكل مستقل.</p>
            </div>}

            {panel === "export" && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-black"><Settings2 className="size-5 text-cyan-500" /> إعدادات وتصدير الفيديو</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold">تذييل أو اسم القناة<input className={input + " mt-2"} maxLength={60} value={project.watermark} onChange={e => patchProject({ watermark: e.target.value })} /></label>
                <label className="block text-sm font-bold">لون النص
                  <select className={input + " mt-2"} value={project.captionColor} onChange={e => patchProject({ captionColor: e.target.value as SocialProject["captionColor"] })}>
                    <option value="white">أبيض</option><option value="yellow">أصفر</option>
                  </select>
                </label>
              </div>
              <label className="mt-4 block text-sm font-bold">أسلوب ظهور الكلمات
                <select aria-label="أسلوب ظهور الكلمات" className={input+" mt-2"} value={project.captionAnimation} onChange={e=>patchProject({captionAnimation:e.target.value as SocialProject["captionAnimation"]})}>
                  <option value="static">عرض النص بالكامل</option>
                  <option value="reveal">إظهار الكلمات بالتتابع (توقيت تقديري)</option>
                </select>
              </label>
              <label className="mt-4 block text-sm font-bold">دقة التصدير
                <select aria-label="دقة التصدير" className={input+" mt-2"} value={quality} onChange={e=>setQuality(e.target.value as "standard"|"high")}>
                  <option value="standard">720×1280 — أسرع وأخف</option>
                  <option value="high">1080×1920 — أعلى دقة، يتطلب جهازًا أقوى</option>
                </select>
              </label>
              <label className="mt-4 flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={project.showCaptions} onChange={e => patchProject({ showCaptions: e.target.checked })} className="size-5 accent-cyan-500" /> إظهار نصوص المشاهد داخل الفيديو</label>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                <strong className="block text-slate-900">مواصفات النسخة الحالية</strong>
                فيديو رأسي 9:16 · دقة {quality==="high"?"1080×1920":"720×1280"} · 24 إطار/ثانية · WebM. التصدير يعمل في الوقت الحقيقي، ويجب إبقاء علامة تبويب الموقع ظاهرة طوال العملية. MP4 غير متاح حاليًا.
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className={secondary} onClick={() => saveFile(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), "cartoon-project.json")}><FolderDown className="size-4" /> نسخة JSON</button>
                <label className={secondary + " cursor-pointer"}><Upload className="size-4" /> استيراد JSON
                  <input type="file" accept=".json,application/json" className="sr-only" onChange={e => { void importProject(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                </label>
                <button type="button" className={secondary} onClick={() => saveFile(new Blob(["\ufeff", srtForProject(project)], { type: "text/plain;charset=utf-8" }), "cartoon-subtitles.srt")}><Captions className="size-4" /> ترجمة SRT</button>
              </div>
              <button type="button" disabled={exporting || recordingMic || !exportSupported} className={primary + " mt-5 w-full !bg-cyan-600 hover:!bg-cyan-700"} onClick={() => void exportVideo()}><Download className="size-5" /> تصدير فيديو WebM {hasNarration ? "بالصوت" : "صامت"}</button>
              {exporting && <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold"><span>جاري تركيب المشاهد والصوت</span><span>{exportPercent}%</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: exportPercent + "%" }} /></div>
                <button type="button" className={secondary} onClick={() => exportAbort.current?.abort()}>إلغاء التصدير</button>
              </div>}
              {!exportSupported && <p className="mt-3 text-sm font-bold text-rose-600">المتصفح الحالي لا يدعم تسجيل WebM.</p>}
              {video && videoUrl && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <strong className="text-sm text-emerald-900">الفيديو جاهز للمعاينة والتحميل</strong>
                <video key={video.size} className="mx-auto mt-3 max-h-95 rounded-xl bg-black" controls playsInline src={videoUrl} />
                <button type="button" className={primary + " mt-4 w-full"} onClick={() => saveFile(video, "cartoon-content-" + Date.now() + ".webm")}><Download className="size-4" /> تنزيل الفيديو</button>
              </div>}
            </div>}
          </section>

          <aside className="min-w-0 lg:sticky lg:top-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-black"><Image className="size-5 text-cyan-500" /> معاينة الفيديو</h2><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-extrabold">9:16</span></div>
              <div className="mx-auto w-full max-w-[330px] overflow-hidden rounded-3xl border-4 border-slate-800 bg-cyan-200 shadow-xl">
                <canvas ref={previewCanvas} width={360} height={640} aria-label="معاينة مباشرة للشخصية الكرتونية والمشهد" role="img" className="block h-auto w-full" />
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button type="button" className={primary + " min-w-31"} onClick={togglePreview}>{playing ? <Pause className="size-4" /> : <Play className="size-4" />}{playing ? "إيقاف" : "معاينة"}</button>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between text-xs font-bold text-slate-500"><span>{formatSeconds(playing ? position : timelineStart(project, active))}</span><span>{formatSeconds(duration)}</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: (playing ? position / duration : timelineStart(project, active) / duration) * 100 + "%" }} /></div>
                </div>
              </div>
              <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-center text-xs leading-6 text-slate-600">طبقات وجه وتعبيرات مختلفة، وحركة فم تقريبية حسب شدة الصوت. يمكن تخصيص تعليق مستقل لكل مشهد. إظهار الكلمات بالتتابع تقديري وليس توقيتًا مستخرجًا من الصوت.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setPanel("audio")} className="flex-1 rounded-xl bg-cyan-50 px-3 py-3 text-xs font-extrabold text-cyan-800">1 · التعليق الصوتي</button>
                <button type="button" onClick={() => setPanel("export")} className="flex-1 rounded-xl bg-slate-100 px-3 py-3 text-xs font-extrabold text-slate-800">2 · تحميل الفيديو</button>
              </div>
            </div>
          </aside>
        </div>
        <footer className="mt-8 text-center text-xs leading-7 text-slate-500">يعمل المحرر بدون حساب أو قاعدة بيانات سحابية. احتفظ بنسخة احتياطية من المشروع والصوت قبل تنظيف بيانات المتصفح. <a href="/projects" className="mr-2 font-bold text-cyan-700 underline">استرجاع مشاريع الإصدار القديم</a></footer>
      </div>
    </main>
  );
}
