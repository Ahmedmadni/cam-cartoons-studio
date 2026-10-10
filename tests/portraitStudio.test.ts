import { describe, expect, test } from "bun:test";
import {
  calculateFramedCameraShot, calculateCameraShot, FRAMING_LABELS,
} from "../src/lib/cameraComposition";
import { LIGHTING_RECIPES, LIGHTING_LABELS } from "../src/lib/studioLighting";
import {
  DEFAULT_CHARACTERS, FEATURED_CHARACTERS, seedPortraitForUpgrade,
} from "../src/lib/characterLibrary";
import type { AvatarDiagnostics } from "../src/lib/modelPresentation";

const female: AvatarDiagnostics = {
  status: "ready",
  modelUrl: "https://three.ws/avatars/realistic-halfbody.glb",
  dimensions: { width: 1.75, height: 2.3, depth: 0.55 },
  normalizedScale: 1.04,
  headHeightRatio: 0.88,
};

describe("Cinematic character preview", () => {
  test("portrait places the actual head in view rather than framing empty full-body space", () => {
    const full = calculateFramedCameraShot(female, 0.58, -1.62, "full");
    const upper = calculateFramedCameraShot(female, 0.58, -1.62, "upper");
    const portrait = calculateFramedCameraShot(female, 0.58, -1.62, "portrait");
    expect(full).toEqual(calculateCameraShot(female, 0.58, -1.62));
    expect(full.distance).toBeGreaterThan(upper.distance);
    expect(upper.distance).toBeGreaterThan(portrait.distance);
    expect(portrait.targetY).toBeGreaterThan(full.targetY);
    expect(portrait.fitted).toBe(true);
  });

  test("framing remains safe on narrow mobile screens and missing head skeletons", () => {
    const withHead = calculateFramedCameraShot(female, 0.43, -1.62, "portrait");
    const noHead = calculateFramedCameraShot({ ...female, headHeightRatio: undefined }, 0.43, -1.62, "portrait");
    expect(withHead.distance).toBeGreaterThan(0.95);
    expect(noHead.distance).toBeGreaterThan(0.95);
    expect(Number.isFinite(noHead.targetY)).toBe(true);
    expect(calculateFramedCameraShot(null, 0.43, -1.62, "portrait").fitted).toBe(false);
    expect(calculateFramedCameraShot(female, 0, -1.62, "portrait").fitted).toBe(false);
  });

  test("each photographic composition and lighting preset has an Arabic name", () => {
    expect(Object.keys(FRAMING_LABELS)).toEqual(["full", "upper", "portrait"]);
    expect(Object.keys(LIGHTING_LABELS)).toEqual(["cinematic", "daylight", "dramatic", "softbox"]);
    expect(LIGHTING_RECIPES.dramatic.fill).toBeLessThan(LIGHTING_RECIPES.daylight.fill);
    expect(LIGHTING_RECIPES.cinematic.key).toBeGreaterThan(0);
    expect(LIGHTING_RECIPES.softbox.rim).toBeLessThan(LIGHTING_RECIPES.cinematic.rim);
    for (const recipe of Object.values(LIGHTING_RECIPES)) {
      expect(recipe.env).toBeGreaterThan(0);
      expect(recipe.keyColor).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  test("adds exactly one new expressive closeup model without overriding personal names", () => {
    const reem = FEATURED_CHARACTERS.find((item) => item.id === "featured-portrait-reem");
    expect(reem?.name).toBe("ريم");
    expect(reem?.preferredFraming).toBe("portrait");
    expect(reem?.modelUrl).toBe("https://three.ws/avatars/realistic-halfbody.glb");
    const old = DEFAULT_CHARACTERS.filter((item) => item.id !== "featured-portrait-reem");
    const edited = old.map((item) => item.id === "featured-cinematic-female"
      ? { ...item, name: "اسمي الخاص", isFavorite: true } : item);
    const upgraded = seedPortraitForUpgrade(edited);
    expect(upgraded).toHaveLength(9);
    expect(upgraded.find((item) => item.id === "featured-cinematic-female")?.name).toBe("اسمي الخاص");
    expect(upgraded.find((item) => item.id === "featured-cinematic-female")?.isFavorite).toBe(true);
    expect(seedPortraitForUpgrade(upgraded)).toEqual(upgraded);
    const deletedOld = edited.filter((item) => item.id !== "featured-michelle");
    expect(seedPortraitForUpgrade(deletedOld).some((item) => item.id === "featured-michelle")).toBe(false);
  });
});
