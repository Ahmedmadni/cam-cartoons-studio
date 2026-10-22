import type { StoryProject } from "./storyProject";
import { updateScene } from "./storyProjectOperations";

export type ScriptSpeaker = { actorId: string; displayName: string };
export type ScriptDraft = { actorId: string; text: string; estimatedMs: number };
const MAX_SCRIPT_CHARS = 10_000;
const MAX_DIALOGUE_LINES = 80;
const GAP_MS = 350;
const MAX_SCENE_MS = 600_000;

/** A conservative, editable starting estimate, not a claim of exact speech alignment. */
export function estimateArabicSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1500, Math.min(25_000, words * 440 + 650));
}

export function parseSpeakerScript(script: string, speakers: readonly ScriptSpeaker[]): ScriptDraft[] {
  if (script.length > MAX_SCRIPT_CHARS) throw new Error("النص يتجاوز الحد المسموح (10000 حرف)");
  if (!speakers.length) throw new Error("أضف شخصية واحدة على الأقل قبل توزيع الحوار");
  const lines = script.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
  if (lines.length > MAX_DIALOGUE_LINES) throw new Error("يمكن إضافة 80 سطر حوار في المرة الواحدة");
  const lookup = new Map<string, string>();
  for (const speaker of speakers) lookup.set(speaker.displayName.trim().toLocaleLowerCase("ar"), speaker.actorId);
  return lines.map((line, index) => {
    const colon = line.indexOf(":");
    const ArabicColon = line.indexOf("：");
    const separator = colon >= 0 ? colon : ArabicColon;
    let actorId = speakers[0]!.actorId;
    let text = line;
    if (separator >= 0) {
      const candidate = line.slice(0, separator).trim().toLocaleLowerCase("ar");
      if (lookup.has(candidate)) {
        actorId = lookup.get(candidate)!;
        text = line.slice(separator + 1).trim();
      } else if (separator < 70) {
        throw new Error(`السطر ${index + 1}: اسم الشخصية "${line.slice(0, separator).trim()}" غير موجود في المشهد`);
      }
    }
    if (!text) throw new Error(`السطر ${index + 1} فارغ`);
    return { actorId, text, estimatedMs: estimateArabicSpeechMs(text) };
  });
}

export function appendDialogueScript(
  project: StoryProject,
  sceneId: string,
  script: string,
  speakers: readonly ScriptSpeaker[],
  newId: () => string,
): StoryProject {
  const scene = project.scenes.find(item => item.id === sceneId);
  if (!scene) throw new Error("المشهد غير موجود");
  const validActors = new Set(scene.actors.map(actor => actor.id));
  if (speakers.some(speaker => !validActors.has(speaker.actorId))) throw new Error("الشخصية ليست ضمن المشهد");
  const lines = parseSpeakerScript(script, speakers);
  if (scene.cues.length + lines.length > 500) throw new Error("تم تجاوز الحد الأقصى لإشارات المشهد");
  let atMs = Math.max(0, ...scene.cues.map(c => c.atMs + c.durationMs));
  const cues = [...scene.cues];
  for (const line of lines) {
    if (atMs + line.estimatedMs > MAX_SCENE_MS) throw new Error("الحوار يتجاوز عشر دقائق للمشهد الواحد");
    cues.push({
      id: newId(), actorId: line.actorId, kind: "speech",
      value: line.text, atMs, durationMs: line.estimatedMs,
    });
    atMs += line.estimatedMs + GAP_MS;
  }
  return updateScene(project, {
    ...scene,
    cues,
    durationMs: Math.max(scene.durationMs, ...cues.map(c => c.atMs + c.durationMs)),
  });
}
