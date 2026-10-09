import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CHARACTERS,
  FEATURED_CHARACTERS,
  PREVIOUS_DEFAULT_NAMES,
  upgradeDefaultCharacterNames,
  type CharacterDefinition,
} from "../src/lib/characterLibrary";

describe("Natural Arabic character names", () => {
  test("all eight built-in characters have distinct, familiar personal names", () => {
    const names = DEFAULT_CHARACTERS.map((character) => character.name);
    expect(names).toEqual(["يوسف", "نور", "أحمد", "مريم", "سارة", "عمر", "ليلى", "هند"]);
    expect(new Set(names).size).toBe(8);
    expect(FEATURED_CHARACTERS.every((character) => !character.name.includes("—"))).toBe(true);
  });

  test("upgrades legacy stock labels without changing character IDs, models, tags or favorites", () => {
    const previous = DEFAULT_CHARACTERS.map((character) => ({
      ...character,
      name: PREVIOUS_DEFAULT_NAMES[character.id]!,
      isFavorite: character.id === "featured-cinematic-female",
    }));
    const renamed = upgradeDefaultCharacterNames(previous);
    expect(renamed.map((character) => character.name)).toEqual(DEFAULT_CHARACTERS.map((c) => c.name));
    expect(renamed.map((character) => character.id)).toEqual(previous.map((c) => c.id));
    expect(renamed.find((c) => c.id === "featured-cinematic-female")?.isFavorite).toBe(true);
    expect(renamed.find((c) => c.id === "featured-cinematic-female")?.modelUrl).toBe(
      previous.find((c) => c.id === "featured-cinematic-female")?.modelUrl,
    );
  });

  test("preserves personally edited labels, deleted entries and user-created characters", () => {
    const edited: CharacterDefinition = {
      ...DEFAULT_CHARACTERS[4]!, name: "اسم اختاره المستخدم",
      thumbnail: "https://example.com/personal.webp", isFavorite: true,
    };
    const custom: CharacterDefinition = {
      id: "character-123", name: "فارس", category: "men",
      provider: "imported-glb", modelUrl: "https://example.com/character.glb", tags: [],
    };
    const result = upgradeDefaultCharacterNames([edited, custom]);
    expect(result).toEqual([edited, custom]);
    expect(result.some((c) => c.id === "boy")).toBe(false);
  });

  test("does not replace incidental user names or rename on repeated upgrades", () => {
    const first = upgradeDefaultCharacterNames(DEFAULT_CHARACTERS);
    expect(upgradeDefaultCharacterNames(first)).toEqual(first);
    const custom: CharacterDefinition = {
      ...DEFAULT_CHARACTERS[0]!, id: "custom-boy", name: "ولد", isDefault: false,
    };
    expect(upgradeDefaultCharacterNames([custom])[0]?.name).toBe("ولد");
  });
});
