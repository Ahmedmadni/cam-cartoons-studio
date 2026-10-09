import type { AvatarDiagnostics } from "./modelPresentation";

/** The initial fixed camera still applies to procedural models and GLB fallbacks. */
export const DEFAULT_SHOT = { distance: 4.35, targetY: 0.35, fov: 39 } as const;

export type CameraShot = {
  distance: number;
  targetY: number;
  fov: number;
  fitted: boolean;
};

/**
 * Fits a rigged model into the actual Canvas aspect ratio. Models are already
 * normalized by calculateModelFit; this second pass solves the phone-width crop.
 *
 * The model renderer places the ground at yOffset. Its bbox center is
 * yOffset + scaled height/2. Allow additional distance for model depth and
 * animate-able arms; don't blindly use the width at a 16:9 desktop aspect.
 */
export function calculateCameraShot(
  diagnostics: AvatarDiagnostics | null,
  aspect: number,
  yOffset: number,
  fov = DEFAULT_SHOT.fov,
): CameraShot {
  if (diagnostics?.status !== "ready" || !diagnostics.dimensions ||
      !Number.isFinite(aspect) || aspect <= 0 ||
      !Number.isFinite(yOffset) || !Number.isFinite(fov) || fov <= 5 || fov >= 150) {
    return { ...DEFAULT_SHOT, fitted: false };
  }
  const { width, height, depth } = diagnostics.dimensions;
  const scale = diagnostics.normalizedScale ?? NaN;
  const measures = [width, height, depth, scale];
  if (measures.some((value) => !Number.isFinite(value) || value < 0) || scale <= 0) {
    return { ...DEFAULT_SHOT, fitted: false };
  }
  const halfAngle = (fov * Math.PI) / 360;
  const modelWidth = width * scale;
  const modelHeight = height * scale;
  const modelDepth = depth * scale;
  const margin = 1.26;
  const neededVertical = (modelHeight * margin) / (2 * Math.tan(halfAngle));
  const neededHorizontal = (modelWidth * margin) / (2 * Math.tan(halfAngle) * aspect);
  // Half the depth extends closer to the viewer than the bounds center.
  const distance = Math.min(50, Math.max(DEFAULT_SHOT.distance, neededVertical, neededHorizontal)
    + modelDepth * 0.45);
  return {
    distance,
    targetY: yOffset + modelHeight * 0.5,
    fov,
    fitted: true,
  };
}
