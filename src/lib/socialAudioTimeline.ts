import { sceneAt, type SocialProject } from "./socialStudio";

export type AudioCue = { sceneId: string; startSeconds: number; durationSeconds: number };

/** Fixed scene boundaries: clips must not continue speaking over the next scene. */
export function planSceneAudio(
  project: SocialProject,
  audioLengths: ReadonlyMap<string, number>,
): AudioCue[] {
  const cues: AudioCue[] = [];
  let cursor = 0;
  for (const scene of project.scenes) {
    const length = audioLengths.get(scene.id) ?? 0;
    const delay = Math.min(scene.duration-.25, Math.max(0,scene.audioDelayMs / 1000));
    const usable = Math.max(0,Math.min(length,scene.duration-delay));
    if (Number.isFinite(usable) && usable > 0)
      cues.push({ sceneId: scene.id, startSeconds: cursor+delay, durationSeconds: usable });
    cursor += scene.duration;
  }
  return cues;
}
export function sceneVoiceEnergyAt(
  project: SocialProject,
  seconds: number,
  envelopes: ReadonlyMap<string, Float32Array>,
): number {
  const { scene, elapsed } = sceneAt(project,seconds);
  const offset = elapsed - scene.audioDelayMs/1000;
  if(offset<0 || offset>=scene.duration-scene.audioDelayMs/1000)return 0;
  const curve = envelopes.get(scene.id);
  if(!curve)return 0;
  return curve[Math.floor(offset*30)] ?? 0;
}
export function voiceBarHeights(envelope: Float32Array, count=52): number[] {
  if(count<=0 || !Number.isInteger(count) || count>400) return [];
  return Array.from({length:count},(_,i)=>{
    const from=Math.floor(i*envelope.length/count);
    const end=Math.max(from+1,Math.floor((i+1)*envelope.length/count));
    let peak=0;
    for(let n=from;n<Math.min(end,envelope.length);n++)peak=Math.max(peak,envelope[n]??0);
    return Math.max(8,Math.round(peak*100));
  });
}
