/**
 * Uniform model framing inside the portrait-capable studio camera.
 * The user scale is a multiplier after automatic fit, not the GLB's raw unit size.
 */
export type ModelSize = { width: number; height: number; depth: number };
export type ModelFit = { scale: number; valid: boolean };

export function calculateModelFit(size: ModelSize, multiplier = 1): ModelFit {
  const dimensions = [size.width, size.height, size.depth];
  if (dimensions.some((value) => !Number.isFinite(value) || value < 0) ||
      !Number.isFinite(multiplier) || multiplier <= 0) {
    return { scale: 1, valid: false };
  }
  const span = Math.max(size.height / 2.55, size.width / 2.65, size.depth / 2.65);
  if (span < 0.000001) return { scale: 1, valid: false };
  return { scale: Math.min(1000, Math.max(0.001, 1 / span)) * multiplier, valid: true };
}

export type AvatarDiagnostics = {
  status: "ready" | "error";
  modelUrl: string;
  message?: string;
  dimensions?: ModelSize;
  normalizedScale?: number;
  boneCount?: number;
  morphCount?: number;
  hasHeadRig?: boolean;
  hasArmRig?: boolean;
  hasLipSync?: boolean;
  hasBlink?: boolean;
  boneNames?: string[];
  morphNames?: string[];
};

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
export function detectFaceCapabilities(names: string[]) {
  const normalized = names.map(normalizeName);
  return {
    hasLipSync: normalized.some((name) =>
      ["jawopen", "mouthopen", "visemeaa", "mouthopen"].some((alias) => name.endsWith(alias))),
    hasBlink: normalized.some((name) =>
      ["eyeblinkleft", "eyeblinkright", "eyesclosed", "blinkleft", "blinkright"].some((alias) =>
        name.endsWith(alias))),
  };
}
