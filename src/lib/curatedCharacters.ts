import type { CharacterDefinition, CharacterDraft } from "./characterLibrary";

export type CuratedCandidate = {
  id: string;
  name: string;
  description: string;
  origin: string;
  sourceFilename: string;
  sizeBytes: number;
  modelUrl: string;
  /** Original converter reports face blendshapes, or only body skeleton. Never market both as equivalent. */
  faceRig: "blendshapes" | "body-only" | "inspect-on-load";
  draft: CharacterDraft;
};

/**
 * Two Rocketbox human models, three MPFB/PrivacyPuppet humans, and one
 * TalkingHead/MPFB CC0 sample. Pin source commits, do not auto-seed or claim
 * artistic approval. Facial morph support varies per GLB.
 * They load into the user's own library only after an explicit click.
 */
export const CURATED_CANDIDATES: CuratedCandidate[] = [
  {
    id: "curated-rocketbox-yasmin", name: "ياسمين",
    description: "شخصية بشرية ثلاثية الأبعاد تدعم الحركة وتستحق فحص الوجه والشعر والملابس.",
    origin: "Microsoft Rocketbox / Female_Adult_07",
    sourceFilename: "ananya.glb", sizeBytes: 4480100,
    modelUrl: "https://raw.githubusercontent.com/927tanmay/react-ai-voice-avatar/8af29d456c4d4d4f7e8ac32ac0c2b2aaf02c27d3/assets/avatars/ananya.glb",
    faceRig: "blendshapes",
    draft: {
      name: "ياسمين", category: "women", provider: "imported-glb",
      modelUrl: "https://raw.githubusercontent.com/927tanmay/react-ai-voice-avatar/8af29d456c4d4d4f7e8ac32ac0c2b2aaf02c27d3/assets/avatars/ananya.glb",
      tags: ["للتقييم الفني", "Rocketbox", "مرشحة"], voicePreset: "woman",
      basePreset: "woman", scale: 1, yOffset: -1.62,
      preferredFraming: "upper",
    },
  },
  {
    id: "curated-rocketbox-ziyad", name: "زياد",
    description: "شخصية رجل مجسمة للحركات والبورتريه، بحاجة لاعتماد بصري قبل وصفها بالسينمائية.",
    origin: "Microsoft Rocketbox / Male_Adult_04",
    sourceFilename: "aarav.glb", sizeBytes: 4673948,
    modelUrl: "https://raw.githubusercontent.com/927tanmay/react-ai-voice-avatar/8af29d456c4d4d4f7e8ac32ac0c2b2aaf02c27d3/assets/avatars/aarav.glb",
    faceRig: "blendshapes",
    draft: {
      name: "زياد", category: "men", provider: "imported-glb",
      modelUrl: "https://raw.githubusercontent.com/927tanmay/react-ai-voice-avatar/8af29d456c4d4d4f7e8ac32ac0c2b2aaf02c27d3/assets/avatars/aarav.glb",
      tags: ["للتقييم الفني", "Rocketbox", "مرشح"], voicePreset: "man",
      basePreset: "man", scale: 1, yOffset: -1.62,
      preferredFraming: "upper",
    },
  },
  {
    id: "curated-mpfb-kofi", name: "كوفي",
    description: "شخصية بشرية من MakeHuman بتفاصيل وجه وملابس مستقلة. تدعم هيكل الجسم؛ حركات الفم التعبيرية تحتاج فحصًا وقد لا تتوفر.",
    origin: "PrivacyPuppet / MakeHuman-MPFB",
    sourceFilename: "kofi-v2.glb", sizeBytes: 17960820,
    modelUrl: "https://raw.githubusercontent.com/privacypuppet/privacypuppet/ff1b635eba22d782423a6d81233e8deca7f6d1bd/public/mpfb_models/kofi-v2.glb",
    faceRig: "body-only",
    draft: {
      name: "كوفي", category: "men", provider: "imported-glb",
      modelUrl: "https://raw.githubusercontent.com/privacypuppet/privacypuppet/ff1b635eba22d782423a6d81233e8deca7f6d1bd/public/mpfb_models/kofi-v2.glb",
      tags: ["شخصيات بشرية", "MakeHuman", "للتقييم الفني", "تعابير الوجه غير مؤكدة"],
      voicePreset: "man", basePreset: "man", scale: 1, yOffset: -1.62,
      preferredFraming: "upper",
    },
  },
  {
    id: "curated-mpfb-yuki", name: "يوكي",
    description: "شخصية بشرية مختلفة بتفاصيل شعر ووجه من MPFB؛ متاحة للمعاينة الفنية دون ادعاء دعم مزامنة الشفاه.",
    origin: "PrivacyPuppet / MakeHuman-MPFB",
    sourceFilename: "yuki-v2.glb", sizeBytes: 14536028,
    modelUrl: "https://raw.githubusercontent.com/privacypuppet/privacypuppet/ff1b635eba22d782423a6d81233e8deca7f6d1bd/public/mpfb_models/yuki-v2.glb",
    faceRig: "body-only",
    draft: {
      name: "يوكي", category: "women", provider: "imported-glb",
      modelUrl: "https://raw.githubusercontent.com/privacypuppet/privacypuppet/ff1b635eba22d782423a6d81233e8deca7f6d1bd/public/mpfb_models/yuki-v2.glb",
      tags: ["شخصيات بشرية", "MakeHuman", "للتقييم الفني", "تعابير الوجه غير مؤكدة"],
      voicePreset: "woman", basePreset: "woman", scale: 1, yOffset: -1.62,
      preferredFraming: "upper",
    },
  },
  {
    id: "curated-mpfb-liam", name: "ليام",
    description: "شخصية بشرية أخرى من MakeHuman، متاحة لمراجعة الوجه والملابس في الاستوديو. دعم تعابير الفم غير مضمون.",
    origin: "PrivacyPuppet / MakeHuman-MPFB",
    sourceFilename: "liam-v2.glb", sizeBytes: 14487660,
    modelUrl: "https://raw.githubusercontent.com/privacypuppet/privacypuppet/ff1b635eba22d782423a6d81233e8deca7f6d1bd/public/mpfb_models/liam-v2.glb",
    faceRig: "body-only",
    draft: {
      name: "ليام", category: "men", provider: "imported-glb",
      modelUrl: "https://raw.githubusercontent.com/privacypuppet/privacypuppet/ff1b635eba22d782423a6d81233e8deca7f6d1bd/public/mpfb_models/liam-v2.glb",
      tags: ["شخصيات بشرية", "MakeHuman", "للتقييم الفني", "تعابير الوجه غير مؤكدة"],
      voicePreset: "man", basePreset: "man", scale: 1, yOffset: -1.62,
      preferredFraming: "upper",
    },
  },
  {
    id: "curated-mpfb-nouran", name: "نوران",
    description: "شخصية بشرية مستقلة من MakeHuman/MPFB بملف أكبر حجمًا وتفاصيل مصدر تحتاج للمقارنة. راجع الوجه والشعر والملابس والخامات فعليًا؛ حجم الملف وحده لا يضمن الجودة.",
    origin: "TalkingHead / Blender-MPFB (CC0)",
    sourceFilename: "mpfb.glb", sizeBytes: 36815920,
    modelUrl: "https://raw.githubusercontent.com/met4citizen/TalkingHead/b3e277b3b46f88e557bf28a2c5612a5b04e075c3/avatars/mpfb.glb",
    faceRig: "inspect-on-load",
    draft: {
      name: "نوران", category: "women", provider: "imported-glb",
      modelUrl: "https://raw.githubusercontent.com/met4citizen/TalkingHead/b3e277b3b46f88e557bf28a2c5612a5b04e075c3/avatars/mpfb.glb",
      tags: ["مرشحة فنية", "MakeHuman", "تفاصيل أصول أكبر", "الوجه بحاجة للفحص"],
      voicePreset: "woman", basePreset: "woman", scale: 1, yOffset: -1.62,
      preferredFraming: "upper",
    },
  },
];

export function findImportedCandidate(
  library: readonly CharacterDefinition[],
  candidate: CuratedCandidate,
): CharacterDefinition | undefined {
  return library.find((entry) =>
    entry.provider !== "procedural" && entry.modelUrl === candidate.modelUrl);
}
