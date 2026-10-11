import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VoiceType } from "./store";
import type { CameraFraming } from "./cameraComposition";
import { CURATED_CANDIDATES } from "./curatedCharacters";

export type CharacterProvider = "imported-glb" | "readyplayerme" | "procedural";
export type CharacterCategory = "children" | "youth" | "men" | "women" | "fantasy" | "other";
export type LegacyCharacterType = "boy" | "girl" | "man" | "woman";

export type CharacterDefinition = {
  id: string;
  name: string;
  category: CharacterCategory;
  provider: CharacterProvider;
  modelUrl?: string | undefined;
  /** IndexedDB key for a privately imported binary GLB (not a URL). */
  assetId?: string | undefined;
  thumbnail?: string | undefined;
  voicePreset?: VoiceType;
  tags: string[];
  isFavorite?: boolean;
  isDefault?: boolean;
  basePreset?: LegacyCharacterType | undefined;
  scale?: number;
  yOffset?: number;
  /** The ideal 3D library preview crop; never forces a story/movie crop. */
  preferredFraming?: CameraFraming;
};

export type CharacterDraft = Omit<CharacterDefinition, "id" | "isFavorite" | "isDefault">;

export const CHARACTER_CATEGORIES: { value: CharacterCategory; label: string }[] = [
  { value: "children", label: "أطفال" },
  { value: "youth", label: "شباب" },
  { value: "men", label: "رجال" },
  { value: "women", label: "نساء" },
  { value: "fantasy", label: "خيالية" },
  { value: "other", label: "أخرى" },
];

export const PROVIDER_LABELS: Record<CharacterProvider, string> = {
  "imported-glb": "Premium GLB",
  readyplayerme: "Ready Player Me",
  procedural: "قديمة — تُحوّل إلى GLB",
};

/**
 * Featured, real rigged GLB files from the upstream three.ws public asset catalog.
 * These are hosted at the publisher origin (not bundled as repo binary assets).
 * The selected user can save copies to IndexedDB for stable browser-local playback.
 */
export const FEATURED_CHARACTERS: CharacterDefinition[] = [
  {
    id: "featured-cinematic-female", name: "سارة", category: "women",
    provider: "imported-glb", modelUrl: "https://three.ws/avatars/realistic-female.glb",
    voicePreset: "woman", basePreset: "woman", tags: ["Premium", "شبه واقعية", "مصدر خارجي"],
    isDefault: true, scale: 1, yOffset: -1.62,
  },
  {
    id: "featured-cinematic-male", name: "عمر", category: "men",
    provider: "imported-glb", modelUrl: "https://three.ws/avatars/realistic-male.glb",
    voicePreset: "man", basePreset: "man", tags: ["Premium", "شبه واقعية", "مصدر خارجي"],
    isDefault: true, scale: 1, yOffset: -1.62,
  },
  {
    id: "featured-selfie-girl", name: "ليلى", category: "youth",
    provider: "imported-glb", modelUrl: "https://three.ws/avatars/selfie-girl.glb",
    voicePreset: "girl", basePreset: "woman", tags: ["Premium", "تعبيرات الوجه", "مصدر خارجي"],
    isDefault: true, scale: 1, yOffset: -1.62,
  },
  {
    id: "featured-michelle", name: "هند", category: "women",
    provider: "imported-glb", modelUrl: "https://three.ws/avatars/michelle.glb",
    voicePreset: "woman", basePreset: "woman", tags: ["3D", "متحركة", "مصدر خارجي"],
    isDefault: true, scale: 1, yOffset: -1.62,
  },
  {
    id: "featured-portrait-reem", name: "ريم", category: "women",
    provider: "imported-glb", modelUrl: "https://three.ws/avatars/realistic-halfbody.glb",
    voicePreset: "woman", basePreset: "woman", tags: ["Premium", "بورتريه", "نصف جسم", "مصدر خارجي"],
    isDefault: true, scale: 1, yOffset: -1.62, preferredFraming: "portrait",
  },
];

/** Exactly-once v3 seed; never resurrect deleted older entries on later reloads. */
export function seedPortraitForUpgrade(previous: CharacterDefinition[]): CharacterDefinition[] {
  const newPortrait = FEATURED_CHARACTERS.find((item) => item.id === "featured-portrait-reem");
  return newPortrait && !previous.some((item) => item.id === newPortrait.id)
    ? [...previous, newPortrait] : previous;
}

export function migrateFeaturedCharacters(previous: CharacterDefinition[]): CharacterDefinition[] {
  const existingIds = new Set(previous.map((character) => character.id));
  return [...previous, ...FEATURED_CHARACTERS.filter((character) => !existingIds.has(character.id))];
}

/**
 * Production library has ONLY genuine, remotely hosted 3D GLB models.
 * This registers all six pinned curated GLBs without eagerly downloading
 * their binary files. The large assets load only when the user selects one.
 */
export const CURATED_CHARACTERS: CharacterDefinition[] = CURATED_CANDIDATES.map((candidate) => ({
  ...candidate.draft,
  id: candidate.id,
  isDefault: true,
}));

export const DEFAULT_CHARACTERS: CharacterDefinition[] = [
  ...FEATURED_CHARACTERS,
  ...CURATED_CHARACTERS,
];

/**
 * Keep IDs, names, favorites and custom user settings across the upgrade.
 * A procedural-only entry is replaced with an actual shipped GLB source,
 * never silently rendered as the old geometric mesh. Older "children"
 * examples do not imply the adult GLBs used as interim replacements are
 * realistic child assets: those require separately sourced child models.
 */
export function replaceProceduralWithRealGlb(characters: CharacterDefinition[]): CharacterDefinition[] {
  const source = {
    boy: CURATED_CANDIDATES.find((candidate) => candidate.id === "curated-rocketbox-ziyad")!.modelUrl,
    girl: FEATURED_CHARACTERS.find((character) => character.id === "featured-selfie-girl")!.modelUrl!,
    man: FEATURED_CHARACTERS.find((character) => character.id === "featured-cinematic-male")!.modelUrl!,
    woman: FEATURED_CHARACTERS.find((character) => character.id === "featured-cinematic-female")!.modelUrl!,
  };
  return characters.map((character) => {
    if (character.provider !== "procedural") return character;
    const preset = character.basePreset ?? (
      character.category === "women" ? "woman" : character.category === "children" ? "girl" : "man"
    );
    return {
      ...character,
      provider: "imported-glb",
      modelUrl: source[preset],
      assetId: undefined,
      // Old thumbnails may contain the prohibited geometric characters.
      thumbnail: undefined,
      tags: [...new Set([...character.tags.filter((tag) => tag !== "مدمج"), "نموذج GLB حقيقي", "تم التحديث من إصدار قديم"])],
    };
  });
}

/** One-time v4 migration. Match by source too: never create duplicates. */
export function upgradeToRealGlbLibrary(previous: CharacterDefinition[]): CharacterDefinition[] {
  const updated = replaceProceduralWithRealGlb(previous);
  const urls = new Set(updated.map((item) => item.modelUrl).filter(Boolean));
  const ids = new Set(updated.map((item) => item.id));
  return [
    ...updated,
    ...CURATED_CHARACTERS.filter((item) => !ids.has(item.id) && !urls.has(item.modelUrl)),
  ];
}

/**
 * Only rename untouched stock labels. Preserve all user-created names,
 * custom edits and deleted characters across the version 2 migration.
 */
export const PREVIOUS_DEFAULT_NAMES: Record<string, string> = {
  boy: "ولد",
  girl: "بنت",
  man: "شاب",
  woman: "فتاة",
  "featured-cinematic-female": "مايا — شخصية سينمائية",
  "featured-cinematic-male": "آدم — شخصية سينمائية",
  "featured-selfie-girl": "لينا — استايل ثلاثي الأبعاد",
  "featured-michelle": "ميشيل — شخصية متحركة",
};

export function upgradeDefaultCharacterNames(characters: CharacterDefinition[]): CharacterDefinition[] {
  const nextNames = new Map(DEFAULT_CHARACTERS.map(({ id, name }) => [id, name]));
  return characters.map((character) => {
    const previousName = PREVIOUS_DEFAULT_NAMES[character.id];
    const nextName = nextNames.get(character.id);
    return previousName && nextName && character.isDefault && character.name === previousName
      ? { ...character, name: nextName }
      : character;
  });
}

export function isSafeAssetUrl(value: string, extension: "glb" | "image") {
  const trimmed = value.trim();
  if (!trimmed) return false;
  // WebP data URLs can only be produced by the local thumbnail capture UI.
  // Keep size bounded to avoid exhausting the browser's persistent storage.
  if (extension === "image" && trimmed.startsWith("data:")) {
    return trimmed.length <= 300000 && /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(trimmed);
  }
  if (!trimmed.startsWith("https://") && !trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  try {
    const parsed = new URL(trimmed, "https://studio.invalid");
    if (parsed.protocol !== "https:") return false;
    if (extension === "glb") return /\.glb$/i.test(parsed.pathname);
    return /\.(png|jpe?g|webp|avif)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function normalizeDraft(draft: CharacterDraft): CharacterDraft {
  const name = draft.name.trim();
  if (!name || name.length > 80) throw new Error("أدخل اسمًا للشخصية لا يتجاوز 80 حرفًا.");
  const modelUrl = draft.modelUrl?.trim() || undefined;
  const assetId = draft.assetId?.trim() || undefined;
  if (assetId && !/^glb-[a-z0-9-]{8,}$/i.test(assetId)) throw new Error("معرف ملف الشخصية غير صالح.");
  if (modelUrl && !isSafeAssetUrl(modelUrl, "glb")) throw new Error("رابط GLB غير صالح.");
  if (draft.provider === "procedural") throw new Error("الشخصيات الهندسية القديمة غير متاحة؛ استخدم ملف GLB حقيقيًا.");
  if (!modelUrl && !assetId) {
    throw new Error("أدخل رابط GLB أو استورد ملف .glb من جهازك.");
  }
  const thumbnail = draft.thumbnail?.trim() || undefined;
  if (thumbnail && !isSafeAssetUrl(thumbnail, "image")) {
    throw new Error("صورة المعاينة يجب أن تكون HTTPS أو مسارًا محليًا بصيغة PNG/JPG/WebP/AVIF.");
  }
  if (draft.preferredFraming &&
      !["full", "upper", "portrait"].includes(draft.preferredFraming)) {
    throw new Error("طريقة تأطير الشخصية غير معروفة.");
  }
  const scale = draft.scale ?? 1.02;
  const yOffset = draft.yOffset ?? -1.62;
  if (!Number.isFinite(scale) || scale < 0.1 || scale > 4) throw new Error("مقياس النموذج يجب أن يكون بين 0.1 و4.");
  if (!Number.isFinite(yOffset) || yOffset < -5 || yOffset > 5) throw new Error("الإزاحة الرأسية يجب أن تكون بين -5 و5.");
  return {
    ...draft,
    name,
    modelUrl,
    assetId,
    thumbnail,
    tags: [...new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 12),
    scale,
    yOffset,
  };
}

type CharacterLibraryState = {
  characters: CharacterDefinition[];
  addCharacter: (draft: CharacterDraft) => string;
  updateCharacter: (id: string, draft: CharacterDraft) => void;
  deleteCharacter: (id: string) => void;
  toggleFavorite: (id: string) => void;
};

export const useCharacterLibrary = create<CharacterLibraryState>()(
  persist(
    (set) => ({
      characters: DEFAULT_CHARACTERS,
      addCharacter: (draft) => {
        const cleaned = normalizeDraft(draft);
        const id = "character-" + (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2));
        set((state) => ({ characters: [...state.characters, { ...cleaned, id }] }));
        return id;
      },
      updateCharacter: (id, draft) => {
        const cleaned = normalizeDraft(draft);
        set((state) => ({
          characters: state.characters.map((item) =>
            item.id === id ? { ...item, ...cleaned } : item,
          ),
        }));
      },
      deleteCharacter: (id) =>
        set((state) => ({ characters: state.characters.filter((item) => item.id !== id) })),
      toggleFavorite: (id) =>
        set((state) => ({
          characters: state.characters.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item,
          ),
        })),
    }),
    {
      name: "cam-cartoons-character-library-v1",
      version: 4,
      migrate: (oldState: unknown, previousVersion: number) => {
        const persisted = oldState && typeof oldState === "object"
          ? oldState as { characters?: unknown }
          : {};
        const characters = Array.isArray(persisted.characters)
          ? persisted.characters.filter((item): item is CharacterDefinition =>
              Boolean(item && typeof item === "object" && typeof item.id === "string"))
          : DEFAULT_CHARACTERS;
        // The version-1 migration already seeded featured characters. Re-seeding
        // them would resurrect avatars that users intentionally deleted.
        const prior = previousVersion < 1 ? migrateFeaturedCharacters(characters) : characters;
        const named = upgradeDefaultCharacterNames(prior);
        // Version 3 introduces ONE new portrait avatar. Do not re-add any
        // of the four existing models if a user has intentionally deleted them.
        const withPortrait = previousVersion < 3 ? seedPortraitForUpgrade(named) : named;
        return {
          characters: previousVersion < 4 ? upgradeToRealGlbLibrary(withPortrait) : withPortrait,
        };
      },
      partialize: (state) => ({ characters: state.characters }),
    },
  ),
);

export function getCharacterDefinition(id: string) {
  return useCharacterLibrary.getState().characters.find((character) => character.id === id);
}

export function getCharacterLabel(id: string) {
  return getCharacterDefinition(id)?.name ?? id;
}
