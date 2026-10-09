import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VoiceType } from "./store";

export type CharacterProvider = "imported-glb" | "readyplayerme" | "procedural";
export type CharacterCategory = "children" | "youth" | "men" | "women" | "fantasy" | "other";
export type LegacyCharacterType = "boy" | "girl" | "man" | "woman";

export type CharacterDefinition = {
  id: string;
  name: string;
  category: CharacterCategory;
  provider: CharacterProvider;
  modelUrl?: string | undefined;
  thumbnail?: string | undefined;
  voicePreset?: VoiceType;
  tags: string[];
  isFavorite?: boolean;
  isDefault?: boolean;
  basePreset?: LegacyCharacterType | undefined;
  scale?: number;
  yOffset?: number;
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
  procedural: "مدمجة (احتياطية)",
};

export const DEFAULT_CHARACTERS: CharacterDefinition[] = [
  { id: "boy", name: "ولد", category: "children", provider: "procedural", tags: ["مدمج"], basePreset: "boy", voicePreset: "boy", isDefault: true },
  { id: "girl", name: "بنت", category: "children", provider: "procedural", tags: ["مدمج"], basePreset: "girl", voicePreset: "girl", isDefault: true },
  { id: "man", name: "شاب", category: "youth", provider: "procedural", tags: ["مدمج"], basePreset: "man", voicePreset: "man", isDefault: true },
  { id: "woman", name: "فتاة", category: "women", provider: "procedural", tags: ["مدمج"], basePreset: "woman", voicePreset: "woman", isDefault: true },
];

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
  if (draft.provider !== "procedural" && (!modelUrl || !isSafeAssetUrl(modelUrl, "glb"))) {
    throw new Error("لشخصيات GLB وReady Player Me أدخل رابط HTTPS صالحًا ينتهي بامتداد .glb (أو مسارًا محليًا).");
  }
  const thumbnail = draft.thumbnail?.trim() || undefined;
  if (thumbnail && !isSafeAssetUrl(thumbnail, "image")) {
    throw new Error("صورة المعاينة يجب أن تكون HTTPS أو مسارًا محليًا بصيغة PNG/JPG/WebP/AVIF.");
  }
  const scale = draft.scale ?? 1.02;
  const yOffset = draft.yOffset ?? -1.62;
  if (!Number.isFinite(scale) || scale < 0.1 || scale > 4) throw new Error("مقياس النموذج يجب أن يكون بين 0.1 و4.");
  if (!Number.isFinite(yOffset) || yOffset < -5 || yOffset > 5) throw new Error("الإزاحة الرأسية يجب أن تكون بين -5 و5.");
  return {
    ...draft,
    name,
    modelUrl: draft.provider === "procedural" ? undefined : modelUrl,
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
    { name: "cam-cartoons-character-library-v1", partialize: (state) => ({ characters: state.characters }) },
  ),
);

export function getCharacterDefinition(id: string) {
  return useCharacterLibrary.getState().characters.find((character) => character.id === id);
}

export function getCharacterLabel(id: string) {
  return getCharacterDefinition(id)?.name ?? id;
}
