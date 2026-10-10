import { normalizeMorphName } from "./modelPresentation";

/** Character-library facial performance, not a phoneme-to-speech alignment engine. */
export type ReviewExpression = "neutral" | "smile" | "surprise" | "thoughtful";

export const REVIEW_EXPRESSION_LABELS: Record<ReviewExpression, string> = {
  neutral: "محايد",
  smile: "ابتسامة",
  surprise: "دهشة",
  thoughtful: "تفكير هادئ",
};

export type ExpressionPose = {
  mouthOpen: number;
  smile: number;
  browUp: number;
  eyeX: number;
  eyeY: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
};

const neutral: ExpressionPose = {
  mouthOpen: 0, smile: 0, browUp: 0, eyeX: 0, eyeY: 0,
  headPitch: 0, headYaw: 0, headRoll: 0,
};

export function getReviewExpressionPose(expression: ReviewExpression): ExpressionPose {
  switch (expression) {
    case "smile":
      return { ...neutral, smile: 0.68, browUp: 0.10, headPitch: -0.025 };
    case "surprise":
      return { ...neutral, mouthOpen: 0.38, browUp: 0.67, headPitch: -0.08 };
    case "thoughtful":
      return { ...neutral, eyeX: 0.28, eyeY: -0.18, browUp: 0.15, headYaw: 0.10, headRoll: 0.07 };
    default:
      return { ...neutral };
  }
}

function pulse(time: number, center: number, radius: number) {
  const distance = Math.abs(time - center);
  return distance >= radius ? 0 : (1 + Math.cos(Math.PI * distance / radius)) / 2;
}

/** Gentle non-uniform cadence and a small follow-up blink, without Math.random or timers. */
export function getNaturalBlink(elapsed: number) {
  if (!Number.isFinite(elapsed)) return { left: 0, right: 0 };
  const duration = 13.4;
  const phase = ((elapsed % duration) + duration) % duration;
  const eye = (delay: number) => Math.max(
    pulse(phase, 3.2 + delay, 0.15),
    pulse(phase, 7.8 + delay, 0.135),
    pulse(phase, 8.03 + delay, 0.10) * 0.72,
    pulse(phase, 11.75 + delay, 0.17),
  );
  return { left: eye(0), right: eye(0.022) };
}

/** Pick one mouth/jaw target, instead of deforming all compatible visemes at once. */
export function resolveMorphIndices(
  dictionary: Record<string, number>,
  aliases: readonly string[],
  pairedSmile = false,
): number[] {
  const entries = Object.entries(dictionary).filter(([, i]) => Number.isInteger(i) && i >= 0);
  const find = (alias: string) => {
    const expected = normalizeMorphName(alias);
    return entries.find(([name]) => normalizeMorphName(name) === expected)
      ?? entries.find(([name]) => normalizeMorphName(name).endsWith(expected));
  };

  if (pairedSmile) {
    const left = find("mouthSmileLeft");
    const right = find("mouthSmileRight");
    if (left && right && left[1] !== right[1]) return [left[1], right[1]];
  }

  for (const alias of aliases) {
    const match = find(alias);
    if (match) return [match[1]];
  }
  return [];
}
