import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CHARACTERS,
  getCharacterDefinition,
  getCharacterLabel,
  isSafeAssetUrl,
  useCharacterLibrary,
} from "./characterLibrary";

describe("Open Character Library", () => {
  test("starts with backward-compatible legacy characters", () => {
    expect(DEFAULT_CHARACTERS.map((item) => item.id)).toEqual(["boy", "girl", "man", "woman"]);
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
