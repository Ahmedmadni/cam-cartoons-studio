import { describe, expect, test } from "bun:test";
import {
  ART_REVIEW_CRITERIA, ART_REVIEW_SHOTS, ART_REVIEW_GRADES,
  artReviewSourceKey, artReviewStorageKey, completedArtReviewCount,
  emptyArtReview, parseArtReview,
} from "../src/lib/artReview";

describe("Phase 18E honest in-app art review", () => {
  test("six real rendering combinations cover 3 angles x face and clothing", () => {
    expect(ART_REVIEW_SHOTS).toHaveLength(6);
    expect(ART_REVIEW_SHOTS.map(s => s.angle)).toEqual([
      "front", "threeQuarter", "profile", "front", "threeQuarter", "profile",
    ]);
    expect(ART_REVIEW_SHOTS.slice(0, 3).every(s => s.framing === "portrait" && s.lighting === "softbox")).toBe(true);
    expect(ART_REVIEW_SHOTS.slice(3).every(s => s.framing === "upper" && s.lighting === "daylight")).toBe(true);
  });
  test("manual rubrics cover all visible artistic features, no numeric AI realism score", () => {
    expect(ART_REVIEW_CRITERIA.map(c => c.id)).toEqual(["face", "eyes", "hair", "clothing"]);
    expect(Object.keys(ART_REVIEW_GRADES)).toEqual(["unreviewed", "needs-work", "approved"]);
  });
  test("preserves a genuine review of the same model while rejecting altered source", () => {
    const key = artReviewSourceKey({ modelUrl: "https://example.com/avatar.glb", assetId: undefined });
    const entry = emptyArtReview(key);
    entry.grades.face = "needs-work";
    entry.grades.hair = "approved";
    entry.notes = "تحتاج العين إلى تفاصيل أفضل";
    expect(completedArtReviewCount(entry)).toBe(2);
    expect(parseArtReview(JSON.stringify(entry), key)).toEqual(entry);
    expect(parseArtReview(JSON.stringify(entry), artReviewSourceKey({ modelUrl: "https://example.com/new.glb" })))
      .toEqual(emptyArtReview("https://example.com/new.glb|"));
  });
  test("invalid or oversized browser cache cannot spoof artistic approval", () => {
    const key = "specific-source|";
    const raw = JSON.stringify({ sourceKey: key, grades: { face: "approved", eyes: "approved", hair: "approved", clothing: "admin" }, notes: "<script>hi</script>" });
    expect(parseArtReview(raw, key)).toEqual(emptyArtReview(key));
    expect(parseArtReview("not json", key)).toEqual(emptyArtReview(key));
    expect(parseArtReview("x".repeat(8001), key)).toEqual(emptyArtReview(key));
    expect(artReviewStorageKey("my person")).toContain("my%20person");
  });
});
