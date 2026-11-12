import type { SocialProject } from "./socialStudio";
import { MAX_AUDIO_BYTES, MAX_DURATION_SECONDS, projectSeconds } from "./socialStudio";
import { renderSocialFrame } from "./socialCanvas";
import { selectWebmMime } from "./mediaCapabilities";
import { planSceneAudio, sceneVoiceEnergyAt } from "./socialAudioTimeline";

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

/** Each scene is keyed by its stable ID, independent of ordering. */
const sceneAudioKey = (id: string) => {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error("معرّف المشهد غير صالح لحفظ الصوت.");
  return "scene-voice:" + id;
};
export async function saveSceneVoice(id: string, blob: Blob | null): Promise<void> {
  if (blob && (blob.size === 0 || blob.size > MAX_AUDIO_BYTES)) throw new Error("حجم الصوت غير صالح (30MB كحد أقصى).");
  const key = sceneAudioKey(id);
  if (blob) await withStore("readwrite", s => s.put(blob,key));
  else await withStore("readwrite", s => s.delete(key));
}
export async function loadSceneVoices(ids: string[]): Promise<Map<string, Blob>> {
  const entries = await Promise.all(ids.slice(0,20).map(async id => {
    const value = await withStore<Blob | undefined>("readonly",s=>s.get(sceneAudioKey(id)));
    return [id,value] as const;
  }));
  return new Map(entries.filter((x): x is readonly [string, Blob] => x[1] instanceof Blob));
}
function audioContext(): AudioContext {
  if (typeof AudioContext === "undefined") throw new Error("المتصفح لا يدعم محرك Web Audio.");
  return new AudioContext();
}
function pcmEnvelope(buffer: AudioBuffer): Float32Array {
  const samples = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(buffer.sampleRate / 30));
  const envelope = new Float32Array(Math.ceil(samples.length / step));
  for (let i=0;i<envelope.length;i++) {
    let total=0;
    const from=i*step,end=Math.min(samples.length,from+step);
    for(let j=from;j<end;j++) total += samples[j]! * samples[j]!;
    envelope[i] = Math.min(1,Math.sqrt(total/Math.max(1,end-from))*4.5);
  }
  return envelope;
}
export async function analyzeSocialAudio(blob: Blob): Promise<{ duration: number; envelope: Float32Array }> {
  if (!blob.size || blob.size > MAX_AUDIO_BYTES) throw new Error("حجم الصوت يجب ألا يتجاوز 30 ميجابايت.");
  const context=audioContext();
  try{
    const buffer=await context.decodeAudioData(await blob.arrayBuffer());
    return { duration:buffer.duration, envelope:pcmEnvelope(buffer) };
  } finally { await context.close(); }
}
export function amplitudeAt(envelope: Float32Array | null, seconds: number) {
  return envelope?.[Math.max(0,Math.floor(seconds*30))] ?? 0;
}
export type ExportOptions = {
  project: SocialProject;
  narration: Blob | null;
  sceneNarrations?: ReadonlyMap<string, Blob>;
  quality?: "standard" | "high";
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};
/**
 * Mux real uploaded/recorded voice tracks into WebM.
 * In scene mode each clip starts at its authored scene boundary plus delay,
 * and is TRUNCATED to that scene's duration (no accidental speech overlap).
 */
export async function exportSocialVideo({
  project, narration, sceneNarrations = new Map(), quality = "standard", onProgress, signal,
}: ExportOptions): Promise<Blob> {
  const duration=projectSeconds(project);
  if (!duration || duration>MAX_DURATION_SECONDS) throw new Error("مدة الفيديو يجب ألا تتجاوز دقيقتين.");
  if(signal?.aborted)throw new Error("تم إلغاء التصدير.");
  if(typeof document==="undefined" || typeof MediaRecorder==="undefined")throw new Error("التصدير غير مدعوم في هذا المتصفح.");
  const mime=selectWebmMime("video");
  if(!mime)throw new Error("المتصفح لا يدعم WebM. جرّب أحدث إصدار من Chrome.");
  const canvas=document.createElement("canvas");
  canvas.width=quality==="high"?1080:720;
  canvas.height=quality==="high"?1920:1280;
  const draw=canvas.getContext("2d",{alpha:false});
  if(!draw || typeof canvas.captureStream!=="function")throw new Error("المتصفح لا يدعم التقاط اللوحة.");
  if(document.fonts)await document.fonts.ready;
  const stream=new MediaStream(canvas.captureStream(24).getTracks());
  const sources: AudioBufferSourceNode[]=[];
  let context:AudioContext|null=null;
  let mainEnvelope:Float32Array|null=null;
  const sceneEnvelopes=new Map<string,Float32Array>();
  const clipStarts: Array<{source:AudioBufferSourceNode;start:number;duration:number}>=[];
  let raf=0,finished=false,aborted=false;
  const chunks:Blob[]=[];
  let onAbort=()=>{};
  let onHidden=()=>{};
  const clean=async()=>{
    cancelAnimationFrame(raf);
    signal?.removeEventListener("abort",onAbort);
    document.removeEventListener("visibilitychange",onHidden);
    for(const s of sources) {try{s.stop();}catch{/* already ended */}}
    stream.getTracks().forEach(track=>track.stop());
    if(context && context.state!=="closed")await context.close();
  };
  try {
    const desired = project.narrationMode==="global"
      ? (narration ? [["global",narration] as const] : [])
      : project.scenes.flatMap(scene=>{
        const blob=sceneNarrations.get(scene.id);
        return blob ? [[scene.id,blob] as const] : [];
      });
    const bytes=desired.reduce((sum,entry)=>sum+entry[1].size,0);
    if(bytes>90*1024*1024)throw new Error("الملفات الصوتية تتجاوز 90 ميجابايت في عملية تصدير واحدة.");
    if(desired.length){
      context=audioContext();
      const destination=context.createMediaStreamDestination();
      const lengths=new Map<string,number>();
      const buffers=new Map<string,AudioBuffer>();
      for(const [id,blob] of desired){
        if(!blob.size || blob.size>MAX_AUDIO_BYTES)throw new Error("حجم ملف صوتي غير صالح.");
        const buffer=await context.decodeAudioData(await blob.arrayBuffer());
        buffers.set(id,buffer);
        lengths.set(id,buffer.duration);
        if(id==="global") mainEnvelope=pcmEnvelope(buffer);
        else sceneEnvelopes.set(id,pcmEnvelope(buffer));
      }
      const cues=project.narrationMode==="global"
        ? (buffers.has("global") ? [{sceneId:"global",startSeconds:0,durationSeconds:Math.min(duration,buffers.get("global")!.duration)}] : [])
        : planSceneAudio(project,lengths);
      for(const cue of cues){
        const buffer=buffers.get(cue.sceneId);
        if(!buffer)continue;
        const source=context.createBufferSource();source.buffer=buffer;
        source.connect(destination);sources.push(source);
        clipStarts.push({source,start:cue.startSeconds,duration:cue.durationSeconds});
      }
      destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
      await context.resume();
    }
    renderSocialFrame(draw,project,0,0);
    const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:quality==="high"?5_500_000:3_000_000});
    const result=new Promise<Blob>((resolve,reject)=>{
      const settle=(error?:Error)=>{
        if(finished)return;
        finished=true;
        void clean().then(()=>{
          if(error){reject(error);return;}
          const blob=new Blob(chunks,{type:recorder.mimeType||"video/webm"});
          if(!blob.size)reject(new Error("فشل إنتاج فيديو صالح."));
          else resolve(blob);
        }).catch(reject);
      };
      recorder.ondataavailable=ev=>{if(ev.data.size)chunks.push(ev.data);};
      recorder.onerror=()=>settle(new Error("حدث خطأ في مسجل الفيديو."));
      recorder.onstop=()=>settle(aborted?new Error("أُلغي التصدير أو أُغلقت علامة التبويب."):undefined);
      onAbort=()=>{
        aborted=true;
        if(recorder.state!=="inactive")recorder.stop();
      };
      onHidden=()=>{if(document.hidden)onAbort();};
      signal?.addEventListener("abort",onAbort,{once:true});
      document.addEventListener("visibilitychange",onHidden);
    });
    recorder.start(1000);
    const startClock=context?context.currentTime:performance.now()/1000;
    for(const cue of clipStarts)cue.source.start(startClock+.04+cue.start,0,cue.duration);
    const tick=()=>{
      if(finished||aborted)return;
      const elapsed=(context?context.currentTime:performance.now()/1000)-startClock;
      const progress=Math.max(0,Math.min(duration,elapsed));
      const energy=project.narrationMode==="scenes"
        ? sceneVoiceEnergyAt(project,progress,sceneEnvelopes)
        : amplitudeAt(mainEnvelope,progress);
      renderSocialFrame(draw,project,progress,energy);
      onProgress?.(Math.min(1,progress/duration));
      if(elapsed>=duration){if(recorder.state!=="inactive")recorder.stop();}
      else raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return await result;
  } catch(error) {
    await clean();
    throw error;
  }
}
