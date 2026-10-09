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
  meshCount?: number;
  skinnedMeshCount?: number;
  materialCount?: number;
  animationClipCount?: number;
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
      ["jawopen", "mouthopen", "visemeaa", "visemea"].some((alias) => name.endsWith(alias))),
    hasBlink: normalized.some((name) =>
      ["eyeblinkleft", "eyeblinkright", "eyesclosed", "blinkleft", "blinkright"].some((alias) =>
        name.endsWith(alias))),
  };
}


export type AnimationReadiness = {
  grade: "animated" | "limited" | "static" | "unavailable";
  title: string;
  limitations: string[];
};

/** This is feature support, NOT an artistic rating or proof of model quality. */
export function assessAnimationReadiness(details: AvatarDiagnostics | null): AnimationReadiness {
  if (!details || details.status === "error") {
    return {
      grade: "unavailable", title: "لا يمكن فحص النموذج",
      limitations: ["لم يكتمل تحميل ملف الشخصية؛ افحص مصدر GLB أو أعد استيراده."],
    };
  }
  const limitations: string[] = [];
  const bodyRig = Boolean(details.skinnedMeshCount && details.boneCount);
  if (!bodyRig) limitations.push("المجسم لا يحتوي على هيكل عظمي متحرك متكامل؛ بعض الحركات لن تعمل.");
  if (!details.hasHeadRig) limitations.push("لا توجد عظمة رأس معروفة يمكن التحكم بها.");
  if (!details.hasArmRig) limitations.push("عظام الذراعين غير متوافقة مع حركات الإيماء والتلويح.");
  if (!details.hasLipSync) limitations.push("لا توجد تعابير فم متوافقة مع تحريك الشفاه أثناء الكلام.");
  if (!details.hasBlink) limitations.push("لا توجد تعابير رمش متوافقة مع الحركة التلقائية للعين.");
  if (!details.materialCount) limitations.push("لم تُكتشف خامات واضحة للنموذج.");
  if (!bodyRig && !details.hasLipSync && !details.hasBlink) {
    return { grade: "static", title: "مجسم للعرض فقط", limitations };
  }
  if (limitations.length) return { grade: "limited", title: "حركات مدعومة جزئيًا", limitations };
  return { grade: "animated", title: "بنية الحركة والتعبيرات متوافقة", limitations };
}
