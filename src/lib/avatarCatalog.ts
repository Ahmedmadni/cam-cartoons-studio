import type { AvatarCustomization } from "./avatarCustomization";
import type { CharacterType } from "./store";
import { getCharacterDefinition, type LegacyCharacterType } from "./characterLibrary";

export type HairStyle = "crop" | "curls" | "bun" | "waves";
export type FaceShape = "round" | "oval" | "square";
export type GlassesStyle = "none" | "round" | "square";
export type OutfitStyle = "casual" | "hoodie" | "formal";
export type HeadwearStyle = "none" | "cap" | "beanie";

export type AvatarProfile = {
  type: CharacterType;
  label: string;
  modelUrl: string | null;
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  shoes: string;
  accent: string;
  eye: string;
  hairStyle: HairStyle;
  faceShape: FaceShape;
  eyeScale: number;
  eyeSpacing: number;
  noseScale: number;
  mouthScale: number;
  glassesStyle: GlassesStyle;
  outfitStyle: OutfitStyle;
  headwearStyle: HeadwearStyle;
  child: boolean;
  bodyScale: number;
  shoulderScale: number;
  headScale: number;
  rpmScale: number;
  rpmYOffset: number;
};

const RPM_MORPH_TARGETS = [
  "ARKit",
  "Oculus Visemes",
  "mouthOpen",
  "mouthSmile",
  "eyesClosed",
  "eyesLookUp",
  "eyesLookDown",
].join(",");

export function prepareReadyPlayerMeUrl(rawUrl: string | null | undefined) {
  const raw = rawUrl?.trim();
  if (!raw) return null;
  if (!/\.glb(?:\?|$)/i.test(raw)) return raw;
  if (!/readyplayer\.me/i.test(raw) || /morphTargets(?:Group)?=/i.test(raw)) return raw;

  try {
    const url = new URL(raw);
    url.searchParams.set("morphTargets", RPM_MORPH_TARGETS);
    url.searchParams.set("textureSizeLimit", "1024");
    url.searchParams.set("textureFormat", "webp");
    return url.toString();
  } catch {
    const joiner = raw.includes("?") ? "&" : "?";
    return `${raw}${joiner}morphTargets=${encodeURIComponent(RPM_MORPH_TARGETS)}&textureSizeLimit=1024&textureFormat=webp`;
  }
}

const rpmUrl = (value: string | undefined) => prepareReadyPlayerMeUrl(value);

export const AVATAR_PROFILES: Record<LegacyCharacterType, AvatarProfile> = {
  boy: {
    type: "boy",
    label: "يوسف",
    modelUrl: rpmUrl(import.meta.env["VITE_RPM_BOY_URL"]),
    skin: "#D8A078",
    hair: "#3A251D",
    top: "#43A6D9",
    bottom: "#24354D",
    shoes: "#F7F2E8",
    accent: "#F7C948",
    eye: "#4B3428",
    hairStyle: "crop",
    faceShape: "round",
    eyeScale: 1.08,
    eyeSpacing: 1,
    noseScale: 0.92,
    mouthScale: 1,
    glassesStyle: "none",
    outfitStyle: "hoodie",
    headwearStyle: "none",
    child: true,
    bodyScale: 0.92,
    shoulderScale: 0.88,
    headScale: 1.1,
    rpmScale: 1.12,
    rpmYOffset: -1.52,
  },
  girl: {
    type: "girl",
    label: "نور",
    modelUrl: rpmUrl(import.meta.env["VITE_RPM_GIRL_URL"]),
    skin: "#E6B08A",
    hair: "#4A2C25",
    top: "#F2A6BE",
    bottom: "#647EC8",
    shoes: "#FFF7F2",
    accent: "#F4D35E",
    eye: "#51382E",
    hairStyle: "bun",
    faceShape: "oval",
    eyeScale: 1.1,
    eyeSpacing: 0.98,
    noseScale: 0.9,
    mouthScale: 1.05,
    glassesStyle: "none",
    outfitStyle: "casual",
    headwearStyle: "none",
    child: true,
    bodyScale: 0.9,
    shoulderScale: 0.84,
    headScale: 1.12,
    rpmScale: 1.12,
    rpmYOffset: -1.52,
  },
  man: {
    type: "man",
    label: "أحمد",
    modelUrl: rpmUrl(import.meta.env["VITE_RPM_MAN_URL"]),
    skin: "#C98E68",
    hair: "#2B211E",
    top: "#2E4057",
    bottom: "#C9BDA7",
    shoes: "#ECE8DF",
    accent: "#46B5A7",
    eye: "#382A24",
    hairStyle: "curls",
    faceShape: "square",
    eyeScale: 0.96,
    eyeSpacing: 1.04,
    noseScale: 1.08,
    mouthScale: 0.96,
    glassesStyle: "none",
    outfitStyle: "formal",
    headwearStyle: "none",
    child: false,
    bodyScale: 1.04,
    shoulderScale: 1.08,
    headScale: 0.94,
    rpmScale: 1.02,
    rpmYOffset: -1.62,
  },
  woman: {
    type: "woman",
    label: "مريم",
    modelUrl: rpmUrl(import.meta.env["VITE_RPM_WOMAN_URL"]),
    skin: "#E1A37D",
    hair: "#3A2724",
    top: "#D97855",
    bottom: "#698CB6",
    shoes: "#F9F4EC",
    accent: "#E9B949",
    eye: "#47302A",
    hairStyle: "waves",
    faceShape: "oval",
    eyeScale: 1.02,
    eyeSpacing: 1,
    noseScale: 0.96,
    mouthScale: 1.04,
    glassesStyle: "none",
    outfitStyle: "casual",
    headwearStyle: "none",
    child: false,
    bodyScale: 1,
    shoulderScale: 0.94,
    headScale: 0.96,
    rpmScale: 1.02,
    rpmYOffset: -1.62,
  },
};

export function getAvatarProfile(type: CharacterType): AvatarProfile {
  const definition = getCharacterDefinition(type);
  const base = AVATAR_PROFILES[definition?.basePreset ?? (type in AVATAR_PROFILES ? (type as LegacyCharacterType) : "man")];
  return {
    ...base,
    type,
    label: definition?.name ?? base.label,
    rpmScale: definition?.scale ?? base.rpmScale,
    rpmYOffset: definition?.yOffset ?? base.rpmYOffset,
  };
}

export function usesReadyPlayerMe(type: CharacterType) {
  return Boolean(getCharacterDefinition(type)?.modelUrl ?? getAvatarProfile(type).modelUrl);
}


export function mergeAvatarProfile(
  type: CharacterType,
  customization: AvatarCustomization | undefined,
): AvatarProfile {
  const base = getAvatarProfile(type);
  const definition = getCharacterDefinition(type);
  const rawModelUrl = customization?.modelUrl?.trim();
  return {
    ...base,
    ...customization,
    modelUrl: prepareReadyPlayerMeUrl(rawModelUrl || definition?.modelUrl || base.modelUrl),
  };
}
