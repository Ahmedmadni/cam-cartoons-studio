import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Upload } from "lucide-react";
import { selectWebmMime } from "@/lib/mediaCapabilities";
import { deleteStoryVoiceClip, getStoryVoiceClip, saveStoryVoiceClip, type StoryVoiceClip } from "@/lib/storyVoiceClips";

type Props = { projectId: string; sceneId: string; cueId: string };

export default function StoryVoiceClipControl({ projectId, sceneId, cueId }: Props) {
  const [clip, setClip] = useState<StoryVoiceClip | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abandoned = useRef(false);

  useEffect(() => {
    let live = true;
    void getStoryVoiceClip(projectId, sceneId, cueId).then(value => {
      if (live) setClip(value);
    }).catch(failure => { if (live) setError(String(failure)); });
    return () => { live = false; };
  }, [projectId, sceneId, cueId]);

  useEffect(() => {
    if (!clip) { setUrl(null); return; }
    const local = URL.createObjectURL(clip.blob);
    setUrl(local);
    return () => URL.revokeObjectURL(local);
  }, [clip]);

  useEffect(() => {
    abandoned.current = false;
    return () => {
      abandoned.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  async function save(file: File) {
    setBusy(true); setError("");
    try {
      await saveStoryVoiceClip(projectId, sceneId, cueId, file);
      setClip(await getStoryVoiceClip(projectId, sceneId, cueId));
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteStoryVoiceClip(projectId, sceneId, cueId);
      setClip(null); setError("");
    } catch (failure) { setError(String(failure)); }
    finally { setBusy(false); }
  }

  async function startRecording() {
    const mime = selectWebmMime("audio");
    if (!mime || !navigator.mediaDevices?.getUserMedia) {
      setError("الميكروفون أو تسجيل WebM الصوتي غير مدعوم في هذا المتصفح.");
      return;
    }
    setError(""); setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (abandoned.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => setError("تعذّر تسجيل الصوت من الميكروفون");
      recorder.onstop = () => {
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null; recorderRef.current = null;
        if (!abandoned.current) {
          setRecording(false);
          const file = new File(chunks, "voice-" + cueId + ".webm", { type: mime });
          if (file.size) void save(file);
          else setError("لم يتم التقاط صوت؛ جرّب التسجيل مجددًا");
        }
      };
      recorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      timeoutRef.current = setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 20_000);
    } catch (failure) {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setError("تعذر الوصول للميكروفون: " + String(failure));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1 text-xs">
          <Upload className="size-3"/> رفع ملف صوتي
          <input aria-label="رفع ملف صوتي للحوار" type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/ogg,audio/mp4,audio/x-m4a,.mp3,.wav,.webm,.ogg,.m4a"
            disabled={busy || recording} className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void save(file); event.target.value = ""; }}/>
        </label>
        {recording ? (
          <button type="button" className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-destructive"
            onClick={() => { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); }}>
            <Square className="size-3"/> إنهاء التسجيل
          </button>
        ) : (
          <button type="button" disabled={busy} className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs"
            onClick={() => { void startRecording(); }}>
            <Mic className="size-3"/> تسجيل الصوت
          </button>
        )}
        {clip && <button type="button" disabled={busy || recording} onClick={() => { void remove(); }}
          aria-label="حذف صوت الحوار" className="rounded-lg border px-2 py-1 text-destructive"><Trash2 className="size-3"/></button>}
      </div>
      {url && <audio aria-label="معاينة صوت الحوار" src={url} controls preload="none" className="h-9 w-full"/>}
      <p className="text-xs text-muted-foreground">{recording ? "جارٍ التسجيل — ينتهي تلقائيًا بعد 20 ثانية." : clip ? "الصوت محفوظ محليًا: " + clip.name : "لا يوجد تسجيل؛ سيظهر هذا الحوار كنص فقط في الفيديو."}</p>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
