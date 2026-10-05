export type FaceState = {
  yaw: number;
  pitch: number;
  roll: number;
  eyeX: number;
  eyeY: number;
  mouthOpen: number;
  smile: number;
  blinkLeft: number;
  blinkRight: number;
  browUp: number;
};

export const faceState: FaceState = {
  yaw: 0,
  pitch: 0,
  roll: 0,
  eyeX: 0,
  eyeY: 0,
  mouthOpen: 0,
  smile: 0,
  blinkLeft: 0,
  blinkRight: 0,
  browUp: 0,
};

export function lerpFaceState(target: Partial<FaceState>, factor = 0.2) {
  (Object.keys(faceState) as (keyof FaceState)[]).forEach((key) => {
    const next = target[key];
    if (typeof next === "number" && Number.isFinite(next)) {
      faceState[key] += (next - faceState[key]) * factor;
    }
  });
  return faceState;
}

export function resetFaceState() {
  lerpFaceState(
    {
      yaw: 0,
      pitch: 0,
      roll: 0,
      eyeX: 0,
      eyeY: 0,
      mouthOpen: 0,
      smile: 0,
      blinkLeft: 0,
      blinkRight: 0,
      browUp: 0,
    },
    1,
  );
}
