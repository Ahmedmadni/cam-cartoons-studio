import type { LightingStyle } from "./studioLighting";

/** Locally bundled AVIF imagery; never require another image host during review. */
export const REVIEW_BACKDROPS = [
  { id: "studio", label: "استوديو نظيف", url: undefined },
  { id: "living-room", label: "غرفة معيشة", url: "/backgrounds/premium/living-room.avif" },
  { id: "cafe", label: "مقهى", url: "/backgrounds/premium/cafe.avif" },
  { id: "garden", label: "حديقة", url: "/backgrounds/premium/garden.avif" },
  { id: "library", label: "مكتبة", url: "/backgrounds/premium/library.avif" },
  { id: "old-town", label: "مدينة قديمة", url: "/backgrounds/premium/old-town.avif" },
  { id: "harbor", label: "ميناء", url: "/backgrounds/premium/harbor.avif" },
  { id: "classroom", label: "فصل دراسي", url: "/backgrounds/premium/classroom.avif" },
  { id: "kids-room", label: "غرفة أطفال", url: "/backgrounds/premium/kids-room.avif" },
] as const;

export type ReviewBackdropId = typeof REVIEW_BACKDROPS[number]["id"];

/** Neutral photographic backdrops avoid masking the model's true material quality. */
export const REVIEW_STUDIO_GRADIENTS: Record<LightingStyle, { start: string; end: string; css: string }> = {
  cinematic: {
    start: "#17253B", end: "#586C87",
    css: "radial-gradient(circle at 50% 35%, #607B95 0%, #344C68 46%, #132237 100%)",
  },
  daylight: {
    start: "#B4C8D7", end: "#E8E6DF",
    css: "radial-gradient(circle at 50% 35%, #F4F1E9 0%, #CBD8E1 52%, #8097AA 100%)",
  },
  dramatic: {
    start: "#0D1327", end: "#394660",
    css: "radial-gradient(circle at 50% 30%, #4B5772 0%, #25334B 42%, #080F20 100%)",
  },
};
