import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SHOT, calculateReviewCameraPosition, REVIEW_ANGLE_LABELS,
} from "../src/lib/cameraComposition";
import { REVIEW_BACKDROPS, REVIEW_STUDIO_GRADIENTS } from "../src/lib/reviewBackdrops";

describe("Phase 18 visual character inspection", () => {
  test("fixed front, three-quarter and profile viewpoints are distinct and finite", () => {
    expect(Object.keys(REVIEW_ANGLE_LABELS)).toEqual(["front", "threeQuarter", "profile"]);
    const front = calculateReviewCameraPosition(3, "front");
    const threeQuarter = calculateReviewCameraPosition(3, "threeQuarter");
    const profile = calculateReviewCameraPosition(3, "profile");
    expect(front.x).toBe(0);
    expect(front.z).toBe(3);
    expect(threeQuarter.x).toBeGreaterThan(0);
    expect(threeQuarter.z).toBeGreaterThan(0);
    expect(profile.x).toBeGreaterThan(front.z);
    expect(Math.abs(profile.z)).toBeLessThan(1e-12);
    expect(calculateReviewCameraPosition(Number.NaN, "front").z).toBe(DEFAULT_SHOT.distance);
  });

  test("photographic options refer only to the eight shipped premium backgrounds", () => {
    expect(REVIEW_BACKDROPS).toHaveLength(9);
    expect(REVIEW_BACKDROPS[0]?.id).toBe("studio");
    expect(REVIEW_BACKDROPS[0]?.url).toBeUndefined();
    const urls = REVIEW_BACKDROPS.flatMap((item) => item.url ? [item.url] : []);
    expect(new Set(urls).size).toBe(8);
    for (const url of urls) {
      expect(url).toMatch(/^\/backgrounds\/premium\/[a-z-]+\.avif$/);
    }
  });

  test("every built-in lighting style has matching studio and capture colors", () => {
    expect(Object.keys(REVIEW_STUDIO_GRADIENTS)).toEqual(["cinematic", "daylight", "dramatic"]);
    for (const value of Object.values(REVIEW_STUDIO_GRADIENTS)) {
      expect(value.start).toMatch(/^#[0-9A-F]{6}$/i);
      expect(value.end).toMatch(/^#[0-9A-F]{6}$/i);
      expect(value.css).toContain("radial-gradient");
    }
  });
});
