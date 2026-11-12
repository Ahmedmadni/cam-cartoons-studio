/**
 * Social-content-specific project model. Deliberately independent from the legacy
 * camera, GLB and face-tracking app. No remote service or user account required.
 */
export type CartoonId = "sami" | "layla" | "omar" | "nour";
export type SceneTheme = "sky" | "studio" | "classroom" | "warm" | "night" | "mint";
export type SceneMotion = "talk" | "explain" | "wave" | "idle";
export type SceneTransition = "cut" | "fade";

export type SocialScene = {
  id: string;
  caption: string;
  headline: string;
  character: CartoonId;
  theme: SceneTheme;
  motion: SceneMotion;
  transition: SceneTransition;
  duration: number;
};

export type SocialProject = {
  version: 1;
  title: string;
  watermark: string;
  captionColor: "white" | "yellow";
  showCaptions: boolean;
  scenes: SocialScene[];
};

export const CARTOONS: ReadonlyArray<{ id: CartoonId; name: string; description: string; color: string }> = [
  { id: "sami", name: "سامي", description: "مقدم شاب", color: "#f59e0b" },
  { id: "layla", name: "ليلى", description: "شخصية محجبة", color: "#aa81e8" },
  { id: "omar", name: "عمر", description: "مدرس بنظارة", color: "#54b6a4" },
  { id: "nour", name: "نور", description: "روبوت لطيف", color: "#79b7fa" },
];
export const THEMES: ReadonlyArray<{ id: SceneTheme; name: string; color: string }> = [
  { id: "sky", name: "سماء مشرقة", color: "#5ce7ea" },
  { id: "studio", name: "استوديو حديث", color: "#d8ddff" },
  { id: "classroom", name: "سبورة تعليمية", color: "#a1d3ae" },
  { id: "warm", name: "غروب دافئ", color: "#ffd29c" },
  { id: "night", name: "ليل هادئ", color: "#333e78" },
  { id: "mint", name: "نعناع", color: "#b9f8e0" },
];

export const STARTER: SocialProject = {
  version: 1,
  title: "معلومة في 30 ثانية",
  watermark: "ahmedelmadni.com",
  captionColor: "white",
  showCaptions: true,
  scenes: [
    { id: "scene-1", headline: "هل تعلم؟", caption: "معلومة بسيطة ممكن تغير طريقة تفكيرك!", character: "sami", theme: "sky", motion: "wave", transition: "cut", duration: 5 },
    { id: "scene-2", headline: "الفكرة", caption: "الفهم الجيد يبدأ بسؤال واحد واضح.", character: "omar", theme: "classroom", motion: "explain", transition: "fade", duration: 8 },
    { id: "scene-3", headline: "الخلاصة", caption: "شارك المعلومة مع شخص ممكن يستفيد منها.", character: "layla", theme: "warm", motion: "talk", transition: "fade", duration: 6 },
  ],
};

export const MAX_DURATION_SECONDS = 120;
export const MAX_SCENES = 20;
export const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
export const projectSeconds = (project: SocialProject) =>
  project.scenes.reduce((sum, scene) => sum + scene.duration, 0);

export function sceneAt(project: SocialProject, seconds: number): { scene: SocialScene; index: number; elapsed: number } {
  let start = 0;
  for (let index = 0; index < project.scenes.length; index += 1) {
    const scene = project.scenes[index]!;
    if (seconds < start + scene.duration || index === project.scenes.length - 1) {
      return { scene, index, elapsed: Math.max(0, Math.min(scene.duration, seconds - start)) };
    }
    start += scene.duration;
  }
  throw new Error("لا يوجد مشهد صالح");
}
const ids = new Set(CARTOONS.map(item => item.id));
const themeIds = new Set(THEMES.map(item => item.id));
const motions = new Set(["talk", "explain", "wave", "idle"]);
const transitions = new Set(["cut", "fade"]);
const safeText = (value: unknown, max: number, fallback = "") =>
  typeof value === "string" ? value.slice(0, max) : fallback;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Strictly bounded import; arbitrary JSON is never executed or trusted. */
export function parseSocialProject(value: unknown): SocialProject {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.scenes) ||
      value.scenes.length < 1 || value.scenes.length > MAX_SCENES) {
    throw new Error("ملف المشروع غير صالح أو بإصدار غير مدعوم.");
  }
  const used = new Set<string>();
  const scenes = value.scenes.map((v: unknown, index: number): SocialScene => {
    if (!isRecord(v)) throw new Error("المشهد رقم " + (index + 1) + " غير صالح.");
    const id = safeText(v.id, 80, "scene-" + index);
    if (used.has(id) || !id) throw new Error("معرّفات المشاهد مكررة أو غير صالحة.");
    used.add(id);
    const duration = v.duration;
    if (typeof duration !== "number" || !Number.isInteger(duration) || duration < 2 || duration > 30) {
      throw new Error("مدة كل مشهد يجب أن تكون بين ثانيتين و30 ثانية.");
    }
    return {
      id,
      caption: safeText(v.caption, 140),
      headline: safeText(v.headline, 80),
      character: ids.has(v.character as CartoonId) ? v.character as CartoonId : "sami",
      theme: themeIds.has(v.theme as SceneTheme) ? v.theme as SceneTheme : "sky",
      motion: motions.has(v.motion as string) ? v.motion as SceneMotion : "talk",
      transition: transitions.has(v.transition as string) ? v.transition as SceneTransition : "cut",
      duration,
    };
  });
  const project: SocialProject = {
    version: 1,
    title: safeText(value.title, 100, "مشروع جديد"),
    watermark: safeText(value.watermark, 60),
    captionColor: value.captionColor === "yellow" ? "yellow" : "white",
    showCaptions: value.showCaptions !== false,
    scenes,
  };
  if (projectSeconds(project) > MAX_DURATION_SECONDS) throw new Error("مدة الفيديو تتجاوز دقيقتين.");
  return project;
}

export function srtForProject(project: SocialProject): string {
  const timecode = (seconds: number) => {
    const ms = Math.round(seconds * 1000);
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor(ms / 60000) % 60;
    const secs = Math.floor(ms / 1000) % 60;
    const millis = ms % 1000;
    return [hours, minutes, secs].map(x => String(x).padStart(2, "0")).join(":") + "," + String(millis).padStart(3, "0");
  };
  let start = 0;
  return project.scenes.map((scene, index) => {
    const end = start + scene.duration;
    const result = (index + 1) + "\n" + timecode(start) + " --> " + timecode(end) + "\n" + scene.caption.trim();
    start = end;
    return result;
  }).join("\n\n") + "\n";
}
