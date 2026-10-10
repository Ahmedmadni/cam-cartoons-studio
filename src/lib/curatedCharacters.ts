import type { CharacterDefinition, CharacterDraft } from "./characterLibrary";

export type CuratedCandidate = {
  id: string;
  name: string;
  description: string;
  origin: string;
  sourceFilename: string;
  sizeBytes: number;
  modelUrl: string;
  draft: CharacterDraft;
};

/**
 * Two distinct Microsoft Rocketbox human models converted to web GLB by
 * react-ai-voice-avatar. GitHub URLs pin the specific upstream source commit.
 * They are OPTIONAL art candidates, not featured, auto-seeded or approved.
 * They load into the user's own library only after an explicit click.
 */
export const CURATED_CANDIDATES: CuratedCandidate[] = [
  {
    id: "curated-rocketbox-yasmin", name: "ياسمين",
    description: "شخصية بشرية ثلاثية الأبعاد تدعم الحركة وتستحق فحص الوجه والشعر والملابس.",
    origin: "Microsoft Rocketbox / Female_Adult_07",
    sourceFilename: "ananya.glb", sizeBytes: 4480100,
    modelUrl: "https://raw.githubusercontent.com/927tanmay/react-ai-voice-avatar/8af29d456c4d4d4f7e8ac32ac0c2b2aaf02c27d3/assets/avatars/ananya.glb",
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
    draft: {
      name: "زياد", category: "men", provider: "imported-glb",
      modelUrl: "https://raw.githubusercontent.com/927tanmay/react-ai-voice-avatar/8af29d456c4d4d4f7e8ac32ac0c2b2aaf02c27d3/assets/avatars/aarav.glb",
      tags: ["للتقييم الفني", "Rocketbox", "مرشح"], voicePreset: "man",
      basePreset: "man", scale: 1, yOffset: -1.62,
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
