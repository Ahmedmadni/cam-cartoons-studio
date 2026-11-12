import type { SocialProject } from "./socialStudio";
import { MAX_AUDIO_BYTES, MAX_DURATION_SECONDS, projectSeconds } from "./socialStudio";
import { renderSocialFrame } from "./socialCanvas";
import { selectWebmMime } from "./mediaCapabilities";

const DB = "cam-social-content-v1";
const STORE = "assets";
const AUDIO_KEY = "narration";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("التخزين المحلي غير متاح.")); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onerror = () => reject(req.error ?? new Error("تعذر فتح التخزين المحلي"));
    req.onblocked = () => reject(new Error("التخزين المحلي محجوب من نافذة أخرى"));
    req.onsuccess = () => resolve(req.result);
  });
}
async function withStore<T>(mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    let output: T;
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    request.onsuccess = () => { output = request.result; };
    tx.oncomplete = () => { db.close(); resolve(output); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("تعذر حفظ الصوت")); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("أُلغيت عملية حفظ الصوت")); };
  });
}
/** Stores voice clips locally, not in JSON backup and never sends them to any server. */
export async function saveSocialAudio(blob: Blob | null): Promise<void> {
  if (blob && (blob.size === 0 || blob.size > MAX_AUDIO_BYTES)) throw new Error("حجم الصوت يتجاوز 30 ميجابايت أو الملف فارغ.");
  if (blob) await withStore("readwrite", store => store.put(blob, AUDIO_KEY));
  else await withStore("readwrite", store => store.delete(AUDIO_KEY));
}
export async function loadSocialAudio(): Promise<Blob | null> {
  const result = await withStore<Blob | undefined>("readonly", store => store.get(AUDIO_KEY));
  return result instanceof Blob ? result : null;
}
function audioContext(): AudioContext {
  const Ctor = typeof AudioContext !== "undefined" ? AudioContext : undefined;
  if (!Ctor) throw new Error("المتصفح لا يدعم معالجة الصوت المطلوبة.");
  return new Ctor();
}
export async function analyzeSocialAudio(blob: Blob): Promise<{ duration: number; envelope: Float32Array }> {
  if (!blob.size || blob.size > MAX_AUDIO_BYTES) throw new Error("حجم الصوت يجب ألا يتجاوز 30 ميجابايت.");
  const context = audioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(buffer.sampleRate / 30));
    const envelope = new Float32Array(Math.ceil(samples.length / step));
    for (let i = 0; i < envelope.length; i++) {
      let sum = 0;
      const from = i * step, end = Math.min(samples.length, from + step);
      for (let j = from; j < end; j++) sum += samples[j]! * samples[j]!;
      envelope[i] = Math.min(1, Math.sqrt(sum / Math.max(1, end - from)) * 4.5);
    }
    return { duration: buffer.duration, envelope };
  } finally { await context.close(); }
}
export function amplitudeAt(envelope: Float32Array | null, seconds: number) {
  return envelope?.[Math.max(0, Math.floor(seconds * 30))] ?? 0;
}
export type ExportOptions = {
  project: SocialProject;
  narration: Blob | null;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};
/** Real-time browser WebM export with baked-in RTL captions and optional actual audio. */
export async function exportSocialVideo({ project, narration, onProgress, signal }: ExportOptions): Promise<Blob> {
  const duration = projectSeconds(project);
  if (!duration || duration > MAX_DURATION_SECONDS) throw new Error("مدة الفيديو يجب ألا تتجاوز دقيقتين.");
  if (signal?.aborted) throw new Error("تم إلغاء التصدير.");
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") throw new Error("التصدير غير مدعوم على هذا الجهاز.");
  const mime = selectWebmMime("video");
  if (!mime) throw new Error("المتصفح لا يدعم تصدير WebM؛ جرّب Chrome على الكمبيوتر.");
  const canvas = document.createElement("canvas");
  canvas.width = 720; canvas.height = 1280;
  const draw = canvas.getContext("2d", { alpha: false });
  if (!draw || typeof canvas.captureStream !== "function") throw new Error("المتصفح لا يدعم تسجيل اللوحة.");
  if (document.fonts) await document.fonts.ready;
  const videoStream = canvas.captureStream(24);
  const stream = new MediaStream(videoStream.getTracks());
  let context: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let audioEnvelope: Float32Array | null = null;
  let recorder: MediaRecorder | null = null;
  let raf = 0;
  let finished = false;
  let aborted = false;
  const chunks: Blob[] = [];
  let onAbort = () => {};
  let onHidden = () => {};
  const clean = async () => {
    cancelAnimationFrame(raf);
    signal?.removeEventListener("abort", onAbort);
    document.removeEventListener("visibilitychange", onHidden);
    try { source?.stop(); } catch { /* source may already have ended */ }
    stream.getTracks().forEach(track => track.stop());
    if (context && context.state !== "closed") await context.close();
  };
  try {
    if (narration) {
      if (!narration.size || narration.size > MAX_AUDIO_BYTES) throw new Error("الملف الصوتي غير صالح.");
      context = audioContext();
      const buffer = await context.decodeAudioData(await narration.arrayBuffer());
      const step = Math.max(1, Math.floor(buffer.sampleRate / 30));
      const samples = buffer.getChannelData(0);
      audioEnvelope = new Float32Array(Math.ceil(samples.length / step));
      for (let i = 0; i < audioEnvelope.length; i++) {
        let total = 0;
        const from = i * step, end = Math.min(samples.length, from + step);
        for (let j = from; j < end; j++) total += samples[j]! * samples[j]!;
        audioEnvelope[i] = Math.min(1, Math.sqrt(total / Math.max(1, end - from)) * 4.5);
      }
      const destination = context.createMediaStreamDestination();
      source = context.createBufferSource();
      source.buffer = buffer; source.connect(destination);
      destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
      await context.resume();
    }
    renderSocialFrame(draw, project, 0, 0);
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3_000_000 });
    const activeRecorder = recorder;
    const result = new Promise<Blob>((resolve, reject) => {
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        void clean().then(() => {
          if (error) reject(error);
          else {
            const blob = new Blob(chunks, { type: activeRecorder.mimeType || "video/webm" });
            if (!blob.size) reject(new Error("تعذّر إنتاج فيديو صالح."));
            else resolve(blob);
          }
        }).catch(reject);
      };
      activeRecorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      activeRecorder.onerror = () => finish(new Error("فشل مسجل الفيديو في المتصفح."));
      activeRecorder.onstop = () => finish(aborted ? new Error("أُلغي التصدير أو توقفت الصفحة أثناءه.") : undefined);
      onAbort = () => {
        aborted = true;
        if (activeRecorder.state !== "inactive") activeRecorder.stop();
      };
      onHidden = () => {
        if (document.hidden) onAbort();
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      document.addEventListener("visibilitychange", onHidden);
    });
    activeRecorder.start(1000);
    const startClock = context ? context.currentTime : performance.now() / 1000;
    if (source && context) source.start(startClock + .05);
    const tick = () => {
      if (finished || aborted) return;
      const elapsed = (context ? context.currentTime : performance.now() / 1000) - startClock;
      const progress = Math.min(duration, Math.max(0, elapsed));
      renderSocialFrame(draw, project, progress, amplitudeAt(audioEnvelope, progress));
      onProgress?.(Math.min(1, progress / duration));
      if (elapsed >= duration) {
        if (activeRecorder.state !== "inactive") activeRecorder.stop();
      } else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return await result;
  } catch (error) {
    await clean();
    throw error;
  }
}
