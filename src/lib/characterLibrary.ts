import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CharacterType, VoiceType } from "./store";

export type CharacterProvider = "built-in" | "readyplayerme" | "imported-glb";
export type CharacterCategory = "kids" | "teens" | "adults" | "fantasy" | "other";
export type CharacterLibraryFilter = "all" | "my-characters" | CharacterCategory;

export type CharacterDefinition = {
  id: string;
  name: string;
  baseType: CharacterType;
  category: CharacterCategory;
  provider: CharacterProvider;
  modelUrl: string | null;
  voicePreset: VoiceType;
  emoji: string;
  tags: string[];
  builtIn?: boolean;
  createdAt?: string;
};

export const CHARACTER_CATEGORY_LABELS: Record<CharacterLibraryFilter, string> = {
  all: "الكل",
  "my-characters": "شخصياتي",
  kids: "أطفال",
  teens: "شباب",
  adults: "بالغون",
  fantasy: "خيال",
  other: "أخرى",
};

export const CHARACTER_LIBRARY_FILTERS: CharacterLibraryFilter[] = [
  "all",
  "my-characters",
  "kids",
  "teens",
  "adults",
  "fantasy",
  "other",
];

export const BUILTIN_CHARACTERS: CharacterDefinition[] = [
  {
    id: "builtin-boy",
    name: "ولد",
    baseType: "boy",
    category: "kids",
    provider: "built-in",
    modelUrl: null,
    voicePreset: "boy",
    emoji: "👦",
    tags: ["طفل", "كرتوني", "مدمج"],
    builtIn: true,
  },
  {
    id: "builtin-girl",
    name: "بنت",
    baseType: "girl",
    category: "kids",
    provider: "built-in",
    modelUrl: null,
    voicePreset: "girl",
    emoji: "👧",
    tags: ["طفلة", "كرتوني", "مدمج"],
    builtIn: true,
  },
  {
    id: "builtin-man",
    name: "شاب",
    baseType: "man",
    category: "teens",
    provider: "built-in",
    modelUrl: null,
    voicePreset: "man",
    emoji: "👨",
    tags: ["شاب", "كرتوني", "مدمج"],
    builtIn: true,
  },
  {
    id: "builtin-woman",
    name: "فتاة",
    baseType: "woman",
    category: "adults",
    provider: "built-in",
    modelUrl: null,
    voicePreset: "woman",
    emoji: "👩",
    tags: ["فتاة", "كرتوني", "مدمج"],
    builtIn: true,
  },
];

export type NewLibraryCharacter = Omit<
  CharacterDefinition,
  "id" | "builtIn" | "createdAt"
> & {
  id?: string;
};

type CharacterLibraryState = {
  characters: CharacterDefinition[];
  addCharacter: (character: NewLibraryCharacter) => string;
  updateCharacter: (id: string, patch: Partial<NewLibraryCharacter>) => void;
  removeCharacter: (id: string) => void;
  clearCustomCharacters: () => void;
};

function makeCharacterId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `character-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useCharacterLibraryStore = create<CharacterLibraryState>()(
  persist(
    (set) => ({
      characters: [],
      addCharacter: (character) => {
        const id = character.id?.trim() || makeCharacterId();
        const next: CharacterDefinition = {
          ...character,
          id,
          builtIn: false,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          characters: [
            next,
            ...state.characters.filter((item) => item.id !== id),
          ],
        }));
        return id;
      },
      updateCharacter: (id, patch) =>
        set((state) => ({
          characters: state.characters.map((character) =>
            character.id === id
              ? {
                  ...character,
                  ...patch,
                  id: character.id,
                  builtIn: false,
                }
              : character,
          ),
        })),
      removeCharacter: (id) =>
        set((state) => ({
          characters: state.characters.filter((character) => character.id !== id),
        })),
      clearCustomCharacters: () => set({ characters: [] }),
    }),
    {
      name: "cam-cartoons-character-library-v1",
      partialize: (state) => ({ characters: state.characters }),
    },
  ),
);

export function getAllCharacters(customCharacters: CharacterDefinition[]) {
  return [...customCharacters, ...BUILTIN_CHARACTERS];
}

export function getCharacterById(
  id: string | null | undefined,
  customCharacters: CharacterDefinition[],
) {
  if (!id) return null;
  return getAllCharacters(customCharacters).find((character) => character.id === id) ?? null;
}

export function filterCharacters(
  characters: CharacterDefinition[],
  filter: CharacterLibraryFilter,
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return characters.filter((character) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "my-characters"
          ? !character.builtIn
          : character.category === filter;

    if (!matchesFilter) return false;
    if (!normalizedQuery) return true;

    return [character.name, character.emoji, ...character.tags]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function providerLabel(provider: CharacterProvider) {
  if (provider === "readyplayerme") return "Ready Player Me";
  if (provider === "imported-glb") return "GLB مستورد";
  return "شخصية مدمجة";
}
