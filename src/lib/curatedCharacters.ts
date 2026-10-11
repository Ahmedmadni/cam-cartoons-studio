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
 * Source-pinned original human/VRoid and animal GLB models. Register URLs
 * without downloading large binaries until the user selects a character.
 * Face rigs and authored animation clips are evaluated from real GLB data.
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
  {
    id: "curated-vroid-ayla", name: "آيلا",
    description: "شخصية VRoid أصلية بشعر وردي وفستان. تُعرض خاماتها الأصلية كاملة مع فحص قدرات الوجه عند التحميل.",
    origin: "XLunar / VRoid Studio",
    sourceFilename: "VRoid_Sample_A.glb", sizeBytes: 15321932,
    modelUrl: "https://raw.githubusercontent.com/iamenahs/xlunar-ai-avatar/5e368bfff897d73090519f9f696c631a52d77397/public/avatars/VRoid_Sample_A.glb",
    faceRig: "inspect-on-load",
    draft: {
      name: "آيلا", category: "women", provider: "imported-glb",
      modelUrl: "https://raw.githubusercontent.com/iamenahs/xlunar-ai-avatar/5e368bfff897d73090519f9f696c631a52d77397/public/avatars/VRoid_Sample_A.glb",
      tags: ["قصص الأطفال", "VRoid", "أنمي ثلاثي الأبعاد", "خامات أصلية"],
      voicePreset: "woman", basePreset: "woman", scale: 1, yOffset: -1.62,
      preferredFraming: "upper",
    },
  },
  {
    id: "curated-vroid-tala", name: "تالا",
    description: "شخصية VRoid أصلية بتسريحة ضفيرتين من ملف ثلاثي الأبعاد مستقل، مناسبة لمعاينة قصص الأنمي.",
    origin: "XLunar / VRoid Studio",
    sourceFilename: "VRoid_Sample_B.glb", sizeBytes: 17936516,
    modelUrl: "https://raw.githubusercontent.com/iamenahs/xlunar-ai-avatar/5e368bfff897d73090519f9f696c631a52d77397/public/avatars/VRoid_Sample_B.glb",
    faceRig: "inspect-on-load",
    draft: {
      name: "تالا", category: "women", provider: "imported-glb",
      modelUrl: "https://raw.githubusercontent.com/iamenahs/xlunar-ai-avatar/5e368bfff897d73090519f9f696c631a52d77397/public/avatars/VRoid_Sample_B.glb",
      tags: ["قصص الأطفال", "VRoid", "أنمي ثلاثي الأبعاد", "خامات أصلية"],
      voicePreset: "woman", basePreset: "woman", scale: 1, yOffset: -1.62,
      preferredFraming: "upper",
    },
  },
  {
    id: "curated-vroid-karim", name: "كريم",
    description: "شخصية فتى أنمي بتفاصيل شعر وملابس من المصدر؛ تعابير الفم والحركات تُكتشف من ملف GLB.",
    origin: "XLunar / VRoid Studio",
    sourceFilename: "VRoid_Sample_C.glb", sizeBytes: 14198800,
    modelUrl: "https://raw.githubusercontent.com/iamenahs/xlunar-ai-avatar/5e368bfff897d73090519f9f696c631a52d77397/public/avatars/VRoid_Sample_C.glb",
    faceRig: "inspect-on-load",
    draft: {
      name: "كريم", category: "youth", provider: "imported-glb",
      modelUrl: "https://raw.githubusercontent.com/iamenahs/xlunar-ai-avatar/5e368bfff897d73090519f9f696c631a52d77397/public/avatars/VRoid_Sample_C.glb",
      tags: ["قصص الأطفال", "VRoid", "أنمي ثلاثي الأبعاد", "خامات أصلية"],
      voicePreset: "boy", basePreset: "boy", scale: 1, yOffset: -1.62,
      preferredFraming: "upper",
    },
  },
  {
    id: "curated-vroid-lana", name: "لانا",
    description: "شخصية VRoid أصلية بشعر أشقر طويل، دون إعادة رسم أو تصغير خامات أثناء الاستيراد.",
    origin: "XLunar / VRoid Studio",
    sourceFilename: "VRoid_Sample_D.glb", sizeBytes: 16851352,
    modelUrl: "https://raw.githubusercontent.com/iamenahs/xlunar-ai-avatar/5e368bfff897d73090519f9f696c631a52d77397/public/avatars/VRoid_Sample_D.glb",
    faceRig: "inspect-on-load",
    draft: {
      name: "لانا", category: "women", provider: "imported-glb",
      modelUrl: "https://raw.githubusercontent.com/iamenahs/xlunar-ai-avatar/5e368bfff897d73090519f9f696c631a52d77397/public/avatars/VRoid_Sample_D.glb",
      tags: ["قصص الأطفال", "VRoid", "أنمي ثلاثي الأبعاد", "خامات أصلية"],
      voicePreset: "woman", basePreset: "woman", scale: 1, yOffset: -1.62,
      preferredFraming: "upper",
    },
  },
  {
    id: "curated-animal-forest-fox", name: "الثعلب فلفل",
    description: "ثعلب حقيقي GLB من Khronos يضم Survey وWalk وRun؛ شخصية لقصص الغابة ولا ندّعي مزامنة حركة الفم بالصوت.",
    origin: "Khronos glTF Sample Assets / Fox",
    sourceFilename: "Fox.glb", sizeBytes: 162852,
    modelUrl: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/edc7c9e67c639d230715049ee31f9a96a6babbbe/Models/Fox/glTF-Binary/Fox.glb",
    faceRig: "body-only",
    draft: {
      name: "الثعلب فلفل", category: "animals", provider: "imported-glb",
      modelUrl: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/edc7c9e67c639d230715049ee31f9a96a6babbbe/Models/Fox/glTF-Binary/Fox.glb",
      tags: ["حيوانات", "قصص الغابة", "حركات أصلية", "بلا مزامنة شفاه"],
      voicePreset: "normal", basePreset: "man", scale: 0.66, yOffset: -1.62,
      preferredFraming: "full",
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
