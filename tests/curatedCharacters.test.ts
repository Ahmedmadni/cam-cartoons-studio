import { describe, expect, test } from "bun:test";
import { CURATED_CANDIDATES, findImportedCandidate } from "../src/lib/curatedCharacters";
import { DEFAULT_CHARACTERS, isSafeAssetUrl, type CharacterDefinition } from "../src/lib/characterLibrary";

describe("Original GLB human and animal storyteller catalog", () => {
  test("eleven real GLB source files with pinned identities and natural names", () => {
    expect(CURATED_CANDIDATES.map((item) => item.name)).toEqual(["ياسمين", "زياد", "كوفي", "يوكي", "ليام", "نوران", "آيلا", "تالا", "كريم", "لانا", "الثعلب فلفل"]);
    expect(new Set(CURATED_CANDIDATES.map((item) => item.modelUrl)).size).toBe(11);
    expect(new Set(CURATED_CANDIDATES.map((item) => item.id)).size).toBe(11);
    for (const item of CURATED_CANDIDATES) {
      expect(isSafeAssetUrl(item.modelUrl, "glb")).toBe(true);
      expect(item.modelUrl).toMatch(/\/(8af29d456c4d4d4f7e8ac32ac0c2b2aaf02c27d3|ff1b635eba22d782423a6d81233e8deca7f6d1bd|b3e277b3b46f88e557bf28a2c5612a5b04e075c3|5e368bfff897d73090519f9f696c631a52d77397|edc7c9e67c639d230715049ee31f9a96a6babbbe)\/(assets\/avatars|public\/mpfb_models|public\/avatars|avatars|Models\/Fox\/glTF-Binary)\/[^/]+\.glb$/);
      expect(item.draft.modelUrl).toBe(item.modelUrl);
      expect(item.draft.name).toBe(item.name);
      expect(item.sizeBytes).toBeGreaterThan(100_000);
      expect("isDefault" in item.draft).toBe(false);
    }
    expect(CURATED_CANDIDATES.filter((item) => item.faceRig === "blendshapes")).toHaveLength(2);
    expect(CURATED_CANDIDATES.filter((item) => item.faceRig === "body-only")).toHaveLength(4);
    expect(CURATED_CANDIDATES.filter((item) => item.faceRig === "inspect-on-load")).toHaveLength(5);
    expect(CURATED_CANDIDATES.find((item) => item.name === "نوران")?.modelUrl).toBe("https://raw.githubusercontent.com/met4citizen/TalkingHead/b3e277b3b46f88e557bf28a2c5612a5b04e075c3/avatars/mpfb.glb");
    expect(DEFAULT_CHARACTERS).toHaveLength(16); // real GLB sources available immediately; binaries lazy-loaded
  });
  test("detects an imported character by source URL despite renaming or offline caching", () => {
    const candidate = CURATED_CANDIDATES[0]!;
    const saved: CharacterDefinition = {
      ...candidate.draft, id: "user-added-1", name: "الاسم الذي اخترته", assetId: "glb-cached-dummy",
      isFavorite: true,
    };
    expect(findImportedCandidate([saved], candidate)).toBe(saved);
    expect(findImportedCandidate([], candidate)).toBeUndefined();
    expect(findImportedCandidate(DEFAULT_CHARACTERS, candidate)?.id).toBe(candidate.id);
  });
  test("manual removal does not cause automatic re-insertion", () => {
    const candidate = CURATED_CANDIDATES[1]!;
    const present: CharacterDefinition = { ...candidate.draft, id: "user-added-2" };
    expect(findImportedCandidate([present], candidate)?.id).toBe("user-added-2");
    expect(findImportedCandidate([], candidate)).toBeUndefined();
  });
});
