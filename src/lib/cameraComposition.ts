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


/** Review-only camera presets; Story and Studio retain their existing full-body camera. */
export type CameraFraming = "full" | "upper" | "portrait";

export const FRAMING_LABELS: Record<CameraFraming, string> = {
  full: "الجسم كاملًا",
  upper: "نصف الجسم",
  portrait: "الوجه والكتفان",
};

export function calculateFramedCameraShot(
  diagnostics: AvatarDiagnostics | null,
  aspect: number,
  yOffset: number,
  framing: CameraFraming,
): CameraShot {
  const full = calculateCameraShot(diagnostics, aspect, yOffset);
  if (framing === "full" || !full.fitted || !diagnostics?.dimensions || !diagnostics.normalizedScale) {
    return full;
  }
  const { height, width, depth } = diagnostics.dimensions;
  const scale = diagnostics.normalizedScale;
  const heightScaled = height * scale;
  // Head bone position wins over guesses for models with long necks, short bodies,
  // or non-standard skeleton proportions.
  const headRatio = typeof diagnostics.headHeightRatio === "number" &&
    Number.isFinite(diagnostics.headHeightRatio) &&
    diagnostics.headHeightRatio >= 0.4 && diagnostics.headHeightRatio <= 1
    ? diagnostics.headHeightRatio : 0.86;
  const targetRatio = framing === "portrait"
    ? Math.max(0.70, headRatio - 0.06)
    : Math.min(0.79, Math.max(0.60, headRatio - 0.18));
  const visibleFraction = framing === "portrait" ? 0.45 : 0.79;
  // Portrait cropping deliberately excludes outstretched arms and loose
  // garments; the full-body setting retains complete mesh bounds.
  const visibleWidth = Math.min(
    width * scale * (framing === "portrait" ? 0.55 : 0.82),
    heightScaled * (framing === "portrait" ? 0.38 : 0.72),
  );
  const tanHalf = Math.tan((full.fov * Math.PI) / 360);
  const vertical = (heightScaled * visibleFraction * 1.12) / (2 * tanHalf);
  const horizontal = (visibleWidth * 1.12) / (2 * tanHalf * aspect);
  const minDistance = framing === "portrait" ? 0.95 : 1.5;
  return {
    distance: Math.min(50, Math.max(minDistance, vertical, horizontal) + depth * scale * 0.28),
    targetY: yOffset + heightScaled * targetRatio,
    fov: full.fov,
    fitted: true,
  };
}

/** Repeatable photography angles for comparing geometry from identical viewpoints. */
export type ReviewCameraAngle = "front" | "threeQuarter" | "profile";

export const REVIEW_ANGLE_LABELS: Record<ReviewCameraAngle, string> = {
  front: "أمامي",
  threeQuarter: "ثلاثة أرباع",
  profile: "جانبي",
};

/** Camera orbit, not a rotation of the animated GLB skeleton or story scene. */
export function calculateReviewCameraPosition(distance: number, angle: ReviewCameraAngle) {
  const safeDistance = Number.isFinite(distance) && distance > 0 ? distance : DEFAULT_SHOT.distance;
  const radians = angle === "threeQuarter" ? Math.PI / 4 : angle === "profile" ? Math.PI / 2 : 0;
  // Leave additional room for projected shoulders and hair at oblique angles.
  const margin = angle === "profile" ? 1.16 : angle === "threeQuarter" ? 1.07 : 1;
  return { x: Math.sin(radians) * safeDistance * margin,
    z: Math.cos(radians) * safeDistance * margin };
}
