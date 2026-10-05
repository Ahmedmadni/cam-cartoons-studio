import type { CharacterType } from "./store";

export type HairStyle = "crop" | "curls" | "bun" | "waves";

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

export const AVATAR_PROFILES: Record<CharacterType, AvatarProfile> = {
  boy: {
    type: "boy",
    label: "ولد",
    modelUrl: rpmUrl(import.meta.env["VITE_RPM_BOY_URL"]),
    skin: "#D8A078",
    hair: "#3A251D",
    top: "#43A6D9",
    bottom: "#24354D",
    shoes: "#F7F2E8",
    accent: "#F7C948",
    eye: "#4B3428",
    hairStyle: "crop",
    child: true,
    bodyScale: 0.92,
    shoulderScale: 0.88,
    headScale: 1.1,
    rpmScale: 1.12,
    rpmYOffset: -1.52,
  },
  girl: {
    type: "girl",
    label: "بنت",
    modelUrl: rpmUrl(import.meta.env["VITE_RPM_GIRL_URL"]),
    skin: "#E6B08A",
    hair: "#4A2C25",
    top: "#F2A6BE",
    bottom: "#647EC8",
    shoes: "#FFF7F2",
    accent: "#F4D35E",
    eye: "#51382E",
    hairStyle: "bun",
    child: true,
    bodyScale: 0.9,
    shoulderScale: 0.84,
    headScale: 1.12,
    rpmScale: 1.12,
    rpmYOffset: -1.52,
  },
  man: {
    type: "man",
    label: "شاب",
    modelUrl: rpmUrl(import.meta.env["VITE_RPM_MAN_URL"]),
    skin: "#C98E68",
    hair: "#2B211E",
    top: "#2E4057",
    bottom: "#C9BDA7",
    shoes: "#ECE8DF",
    accent: "#46B5A7",
    eye: "#382A24",
    hairStyle: "curls",
    child: false,
    bodyScale: 1.04,
    shoulderScale: 1.08,
    headScale: 0.94,
    rpmScale: 1.02,
    rpmYOffset: -1.62,
  },
  woman: {
    type: "woman",
    label: "فتاة",
    modelUrl: rpmUrl(import.meta.env["VITE_RPM_WOMAN_URL"]),
    skin: "#E1A37D",
    hair: "#3A2724",
    top: "#D97855",
    bottom: "#698CB6",
    shoes: "#F9F4EC",
    accent: "#E9B949",
    eye: "#47302A",
    hairStyle: "waves",
    child: false,
    bodyScale: 1,
    shoulderScale: 0.94,
    headScale: 0.96,
    rpmScale: 1.02,
    rpmYOffset: -1.62,
  },
};

export function getAvatarProfile(type: CharacterType) {
  return AVATAR_PROFILES[type];
}

export function usesReadyPlayerMe(type: CharacterType) {
  return Boolean(AVATAR_PROFILES[type].modelUrl);
}
