import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CHARACTERS,
  FEATURED_CHARACTERS,
  isSafeAssetUrl,
  migrateFeaturedCharacters,
} from "../src/lib/characterLibrary";
import { cacheRemoteGlb } from "../src/lib/localGlbStorage";

describe("Featured premium GLB collection", () => {
  test("provides five real GLB model URLs with individual identities and voices", () => {
    expect(FEATURED_CHARACTERS.length).toBe(5);
    expect(new Set(FEATURED_CHARACTERS.map((c) => c.id)).size).toBe(5);
    for (const avatar of FEATURED_CHARACTERS) {
      expect(avatar.provider).toBe("imported-glb");
      expect(avatar.modelUrl).toBeDefined();
      expect(isSafeAssetUrl(avatar.modelUrl!, "glb")).toBe(true);
      expect(avatar.voicePreset).toBeDefined();
      expect(avatar.basePreset).toBeDefined();
      expect(avatar.isDefault).toBe(true);
    }
  });

  test("migrates old persisted libraries without losing custom entries or favorites", () => {
    const legacy = DEFAULT_CHARACTERS.slice(0, 4).map((a) => ({
      ...a, isFavorite: a.id === "girl",
    }));
    const custom = {
      id: "my-own", name: "شخصيتي", category: "youth" as const,
      provider: "imported-glb" as const, modelUrl: "https://example.com/avatar.glb",
      tags: ["مخصص"],
    };
    const migrated = migrateFeaturedCharacters([...legacy, custom]);
    expect(migrated.length).toBe(10);
    expect(migrated.find((c) => c.id === "girl")?.isFavorite).toBe(true);
    expect(migrated.find((c) => c.id === "my-own")).toEqual(custom);
    expect(migrateFeaturedCharacters(migrated)).toEqual(migrated);
  });

  test("does not duplicate featured entries when users have edited them", () => {
    const edited = { ...FEATURED_CHARACTERS[0]!, name: "اسم جديد", isFavorite: true };
    const output = migrateFeaturedCharacters([edited]);
    expect(output.filter((a) => a.id === edited.id).length).toBe(1);
    expect(output.find((a) => a.id === edited.id)?.name).toBe("اسم جديد");
    expect(output.find((a) => a.id === edited.id)?.isFavorite).toBe(true);
  });

  test("rejects unsafe or unsupported offline-cache URLs before network requests", async () => {
    await expect(cacheRemoteGlb("http://example.com/avatar.glb")).rejects.toThrow();
    await expect(cacheRemoteGlb("javascript:alert(1)")).rejects.toThrow();
    await expect(cacheRemoteGlb("https://example.com/avatar.fbx")).rejects.toThrow();
  });
});
