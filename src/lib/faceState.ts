export type FaceState = {
  yaw: number;
  pitch: number;
  roll: number;
  eyeX: number; // نظرة العين الأفقية (-0.5 إلى 0.5)
  eyeY: number; // نظرة العين العمودية
  mouthOpen: number; // فتح الفم (0 إلى 1)
};

export const faceState: FaceState = {
  yaw: 0,
  pitch: 0,
  roll: 0,
  eyeX: 0,
  eyeY: 0,
  mouthOpen: 0,
};

/** تنعيم القيم الحالية نحو القيم الهدف لتفادي اهتزاز الشخصية. */
export function lerpFaceState(target: Partial<FaceState>, factor = 0.2) {
  (Object.keys(faceState) as (keyof FaceState)[]).forEach((key) => {
    const next = target[key];
    if (typeof next === "number" && Number.isFinite(next)) {
      faceState[key] += (next - faceState[key]) * factor;
    }
  });
  return faceState;
}

/** إعادة الحالة إلى الصفر (تدريجياً عند إيقاف التتبع). */
export function resetFaceState() {
  lerpFaceState({ yaw: 0, pitch: 0, roll: 0, eyeX: 0, eyeY: 0, mouthOpen: 0 }, 1);
}
