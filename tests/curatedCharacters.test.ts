import { describe, expect, test } from "bun:test";
import { CURATED_CANDIDATES, findImportedCandidate } from "../src/lib/curatedCharacters";
import { DEFAULT_CHARACTERS, isSafeAssetUrl, type CharacterDefinition } from "../src/lib/characterLibrary";

describe("Phase 18D optional human GLB candidates", () => {
  test("two distinct pinned source files have safe 3D links and natural Arabic names", () => {
    expect(CURATED_CANDIDATES.map((item) => item.name)).toEqual(["ياسمين", "زياد"]);
    expect(new Set(CURATED_CANDIDATES.map((item) => item.modelUrl)).size).toBe(2);
    expect(new Set(CURATED_CANDIDATES.map((item) => item.id)).size).toBe(2);
    for (const item of CURATED_CANDIDATES) {
      expect(isSafeAssetUrl(item.modelUrl, "glb")).toBe(true);
      expect(item.modelUrl).toMatch(/\/8af29d456c4d4d4f7e8ac32ac0c2b2aaf02c27d3\/assets\/avatars\/[^/]+\.glb$/);
      expect(item.draft.modelUrl).toBe(item.modelUrl);
      expect(item.draft.name).toBe(item.name);
      expect(item.sizeBytes).toBeGreaterThan(4_000_000);
      expect("isDefault" in item.draft).toBe(false);
    }
    expect(DEFAULT_CHARACTERS).toHaveLength(9); // never seed unapproved candidates
  });
  test("detects an imported character by source URL despite renaming or offline caching", () => {
    const candidate = CURATED_CANDIDATES[0]!;
    const saved: CharacterDefinition = {
      ...candidate.draft, id: "user-added-1", name: "الاسم الذي اخترته", assetId: "glb-cached-dummy",
      isFavorite: true,
    };
    expect(findImportedCandidate([saved], candidate)).toBe(saved);
    expect(findImportedCandidate([], candidate)).toBeUndefined();
    expect(findImportedCandidate(DEFAULT_CHARACTERS, candidate)).toBeUndefined();
  });
  test("manual removal does not cause automatic re-insertion", () => {
    const candidate = CURATED_CANDIDATES[1]!;
    const present: CharacterDefinition = { ...candidate.draft, id: "user-added-2" };
    expect(findImportedCandidate([present], candidate)?.id).toBe("user-added-2");
    expect(findImportedCandidate([], candidate)).toBeUndefined();
  });
});
