import { describe, expect, test } from "bun:test";
import { DEFAULT_SHOT, calculateCameraShot } from "../src/lib/cameraComposition";
import type { AvatarDiagnostics } from "../src/lib/modelPresentation";

const model: AvatarDiagnostics = {
  status: "ready",
  modelUrl: "/models/qa.glb",
  dimensions: { width: 1.9, height: 2.7, depth: 0.6 },
  normalizedScale: 0.85,
};

describe("Responsive cinematic camera", () => {
  test("increases distance on narrow mobile screens to avoid cropping arms", () => {
    const phone = calculateCameraShot(model, 0.49, -1.62);
    const tablet = calculateCameraShot(model, 0.83, -1.62);
    const desktop = calculateCameraShot(model, 16 / 9, -1.62);
    expect(phone.fitted).toBe(true);
    expect(phone.distance).toBeGreaterThan(tablet.distance);
    expect(tablet.distance).toBeGreaterThanOrEqual(desktop.distance);
    expect(phone.distance).toBeGreaterThan(DEFAULT_SHOT.distance);
  });
  test("keeps vertical center of a normalized GLB in frame", () => {
    const shot = calculateCameraShot(model, 1, -1.62);
    expect(shot.targetY).toBeCloseTo(-1.62 + (2.7 * 0.85) / 2);
    expect(shot.fov).toBe(39);
  });
  test("reacts to user scale and unusual model depth safely", () => {
    const giant: AvatarDiagnostics = { ...model, normalizedScale: 2.3 };
    const shot = calculateCameraShot(giant, 0.56, -2);
    expect(shot.distance).toBeGreaterThan(calculateCameraShot(model, 0.56, -2).distance);
    expect(shot.distance).toBeLessThanOrEqual(50 + 0.6 * 2.3 * 0.45);
  });
  test("resets to default composition for a missing, failed, or invalid GLB", () => {
    for (const details of [null, { ...model, status: "error" as const },
      { ...model, normalizedScale: NaN }]) {
      const shot = calculateCameraShot(details, 0.56, -1.62);
      expect(shot.fitted).toBe(false);
      expect(shot.distance).toBe(DEFAULT_SHOT.distance);
    }
    expect(calculateCameraShot(model, 0, -1.62).fitted).toBe(false);
    expect(calculateCameraShot(model, 1, Number.NaN).fitted).toBe(false);
  });
});
