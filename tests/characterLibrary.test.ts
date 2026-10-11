import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CHARACTERS,
  upgradeToRealGlbLibrary,
  replaceProceduralWithRealGlb,
  getCharacterDefinition,
  getCharacterLabel,
  isSafeAssetUrl,
  useCharacterLibrary,
} from "../src/lib/characterLibrary";

describe("Open Character Library", () => {
  test("starts with eleven real 3D GLBs and no old geometric stock models", () => {
    expect(DEFAULT_CHARACTERS).toHaveLength(11);
    expect(DEFAULT_CHARACTERS.every((item) => item.provider === "imported-glb" && !!item.modelUrl)).toBe(true);
    expect(DEFAULT_CHARACTERS.some((item) => ["boy", "girl", "man", "woman"].includes(item.id))).toBe(false);
  });

  test("migrates saved geometric characters into real 3D without losing user metadata", () => {
    const original = [
      { id: "boy", name: "اسمي الشخصي", category: "children" as const, provider: "procedural" as const,
        tags: ["مرجعي"], isFavorite: true, basePreset: "boy" as const,
        thumbnail: "https://example.com/old.webp" },
      { id: "personal-old", name: "شخصية صنعتها", category: "women" as const,
        provider: "procedural" as const, tags: [], basePreset: "woman" as const },
      { ...DEFAULT_CHARACTERS[0]!, name: "اسم اختاره المستخدم" },
    ];
    const migrated = replaceProceduralWithRealGlb(original);
    expect(migrated[0]?.id).toBe("boy");
    expect(migrated[0]?.name).toBe("اسمي الشخصي");
    expect(migrated[0]?.isFavorite).toBe(true);
    expect(migrated[0]?.modelUrl).toMatch(/\.glb$/);
    expect(migrated[0]?.thumbnail).toBeUndefined();
    expect(migrated[1]?.provider).toBe("imported-glb");
    expect(migrated[2]).toEqual(original[2]);
    const seeded = upgradeToRealGlbLibrary(original);
    expect(seeded.every((item) => item.provider !== "procedural")).toBe(true);
    expect(seeded.some((item) => item.id === "curated-mpfb-nouran")).toBe(true);
    expect(upgradeToRealGlbLibrary(seeded)).toEqual(seeded);
  });

  test("refuses reintroduction of the old procedural mesh provider", () => {
    expect(() => useCharacterLibrary.getState().addCharacter({
      name: "قديمة", category: "other", provider: "procedural", tags: [],
    })).toThrow(/القديمة/);
  });

  test("only accepts HTTPS or local GLB and safe image formats", () => {
    expect(isSafeAssetUrl("https://assets.example.com/a.glb?x=1", "glb")).toBe(true);
    expect(isSafeAssetUrl("/models/a.glb", "glb")).toBe(true);
    expect(isSafeAssetUrl("http://assets.example.com/a.glb", "glb")).toBe(false);
    expect(isSafeAssetUrl("javascript:alert(1)", "glb")).toBe(false);
    expect(isSafeAssetUrl("//assets.example.com/a.glb", "glb")).toBe(false);
    expect(isSafeAssetUrl("https://assets.example.com/image.webp", "image")).toBe(true);
    expect(isSafeAssetUrl("https://assets.example.com/image.svg", "image")).toBe(false);
  });

  test("add, edit, favorite, delete and label lookup work for arbitrary IDs", () => {
    const state = useCharacterLibrary.getState();
    const id = state.addCharacter({
      name: "  سارة  ", category: "youth", provider: "imported-glb",
      modelUrl: "https://assets.example.com/sara.glb",
      thumbnail: "https://assets.example.com/sara.webp",
      voicePreset: "girl", basePreset: "woman", tags: ["قصص", "قصص"],
      scale: 1, yOffset: -1.5,
    });
    expect(getCharacterDefinition(id)?.name).toBe("سارة");
    expect(getCharacterDefinition(id)?.tags).toEqual(["قصص"]);
    expect(getCharacterLabel(id)).toBe("سارة");
    useCharacterLibrary.getState().toggleFavorite(id);
    expect(getCharacterDefinition(id)?.isFavorite).toBe(true);
    useCharacterLibrary.getState().updateCharacter(id, {
      name: "سارة الجديدة", category: "women", provider: "imported-glb",
      modelUrl: "https://assets.example.com/sara.glb", tags: [],
    });
    expect(getCharacterLabel(id)).toBe("سارة الجديدة");
    useCharacterLibrary.getState().deleteCharacter(id);
    expect(getCharacterDefinition(id)).toBeUndefined();
  });

  test("refuses non-GLB premium characters", () => {
    expect(() => useCharacterLibrary.getState().addCharacter({
      name: "Not a GLB", category: "other", provider: "imported-glb",
      modelUrl: "https://example.com/avatar.fbx", tags: [],
    })).toThrow();
  });
});
