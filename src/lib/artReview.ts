import type { CharacterDefinition } from "./characterLibrary";
import type { CameraFraming, ReviewCameraAngle } from "./cameraComposition";
import type { LightingStyle } from "./studioLighting";

/** No model substitution: six actual WebGL views of the selected GLB. */
export type ArtReviewShot = {
  framing: CameraFraming;
  lighting: LightingStyle;
  angle: ReviewCameraAngle;
  label: string;
};

export const ART_REVIEW_SHOTS: readonly ArtReviewShot[] = [
  { framing: "portrait", lighting: "softbox", angle: "front", label: "وجه — أمامي" },
  { framing: "portrait", lighting: "softbox", angle: "threeQuarter", label: "وجه — ثلاثة أرباع" },
  { framing: "portrait", lighting: "softbox", angle: "profile", label: "وجه — جانبي" },
  { framing: "upper", lighting: "daylight", angle: "front", label: "ملابس — أمامي" },
  { framing: "upper", lighting: "daylight", angle: "threeQuarter", label: "ملابس — ثلاثة أرباع" },
  { framing: "upper", lighting: "daylight", angle: "profile", label: "ملابس — جانبي" },
];

export type ArtReviewCriterion = "face" | "eyes" | "hair" | "clothing";
export type ArtReviewGrade = "unreviewed" | "needs-work" | "approved";

export const ART_REVIEW_CRITERIA: readonly {
  id: ArtReviewCriterion; label: string; hint: string;
}[] = [
  { id: "face", label: "ملامح الوجه", hint: "الشكل الجانبي، الأنف، الفم، تناظر ملامح الوجه" },
  { id: "eyes", label: "العينان", hint: "الحدقات والجفون والانعكاسات وغياب التشوه" },
  { id: "hair", label: "الشعر", hint: "الكثافة، الحواف الشفافة، الخصلات، التقاء الشعر بالرأس" },
  { id: "clothing", label: "الملابس", hint: "ثنيات القماش والملامس وتشابك المجسم مع الجسم" },
];
export const ART_REVIEW_GRADES: Record<ArtReviewGrade, string> = {
  unreviewed: "لم يُفحص",
  "needs-work": "يحتاج تحسين",
  approved: "مقبول بصريًا",
};

export type ArtReviewRecord = {
  sourceKey: string;
  grades: Record<ArtReviewCriterion, ArtReviewGrade>;
  notes: string;
};

export function emptyArtReview(sourceKey: string): ArtReviewRecord {
  return {
    sourceKey, grades: { face: "unreviewed", eyes: "unreviewed", hair: "unreviewed", clothing: "unreviewed" },
    notes: "",
  };
}

/** Import, renaming and personal favorites never change the storage key. */
export function artReviewStorageKey(id: string) {
  return "cam-cartoons-art-review-v1:" + encodeURIComponent(id);
}

/** A changed 3D source invalidates earlier approval, not the user's character. */
export function artReviewSourceKey(character: Pick<CharacterDefinition, "modelUrl" | "assetId">) {
  return [character.modelUrl ?? "", character.assetId ?? ""].join("|");
}

/** Defensive restore from browser storage; untrusted JSON cannot auto-approve. */
export function parseArtReview(raw: string | null, expectedSourceKey: string): ArtReviewRecord {
  const empty = emptyArtReview(expectedSourceKey);
  if (!raw || raw.length > 8000) return empty;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || !("sourceKey" in data) ||
        data.sourceKey !== expectedSourceKey || !("grades" in data) ||
        !data.grades || typeof data.grades !== "object") return empty;
    const grades = data.grades as Record<string, unknown>;
    for (const criterion of ART_REVIEW_CRITERIA) {
      if (grades[criterion.id] !== "unreviewed" && grades[criterion.id] !== "needs-work" &&
          grades[criterion.id] !== "approved") return empty;
    }
    const notes = "notes" in data && typeof data.notes === "string" ? data.notes.slice(0, 600) : "";
    return {
      sourceKey: expectedSourceKey,
      grades: {
        face: grades["face"] as ArtReviewGrade, eyes: grades["eyes"] as ArtReviewGrade,
        hair: grades["hair"] as ArtReviewGrade, clothing: grades["clothing"] as ArtReviewGrade,
      },
      notes,
    };
  } catch {
    return empty;
  }
}

/** Manual art-review results are opinions, not mathematical realism grades. */
export function completedArtReviewCount(record: ArtReviewRecord) {
  return ART_REVIEW_CRITERIA.filter((criterion) => record.grades[criterion.id] !== "unreviewed").length;
}
