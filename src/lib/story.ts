import type { AnimationType } from "@/lib/store";

import bgPark from "@/assets/bg-park.jpg";
import bgRoom from "@/assets/bg-room.jpg";
import bgClass from "@/assets/bg-class.jpg";
import bgBeach from "@/assets/bg-beach.jpg";
import bgForest from "@/assets/bg-forest.jpg";

export type BackgroundCategory = "home" | "learning" | "nature" | "travel" | "fantasy";
export type BackgroundFilter = "all" | "premium" | BackgroundCategory;

export type Background = {
  id: string;
  label: string;
  src: string;
  category: BackgroundCategory;
  premium?: boolean;
};

export const BACKGROUND_FILTER_LABELS: Record<BackgroundFilter, string> = {
  all: "الكل",
  premium: "احترافية",
  home: "المنزل",
  learning: "التعليم",
  nature: "الطبيعة",
  travel: "أماكن وسفر",
  fantasy: "خيال",
};

export const BACKGROUND_FILTERS: BackgroundFilter[] = [
  "all",
  "premium",
  "home",
  "learning",
  "nature",
  "travel",
  "fantasy",
];

export const BACKGROUNDS: Background[] = [
  {
    id: "premium-old-town",
    label: "الزقاق الدافئ",
    src: "/backgrounds/premium/old-town.avif",
    category: "travel",
    premium: true,
  },
  {
    id: "premium-living-room",
    label: "غرفة معيشة عصرية",
    src: "/backgrounds/premium/living-room.avif",
    category: "home",
    premium: true,
  },
  {
    id: "premium-classroom",
    label: "الفصل الإبداعي",
    src: "/backgrounds/premium/classroom.avif",
    category: "learning",
    premium: true,
  },
  {
    id: "premium-cafe",
    label: "المقهى الدافئ",
    src: "/backgrounds/premium/cafe.avif",
    category: "travel",
    premium: true,
  },
  {
    id: "premium-library",
    label: "المكتبة السحرية",
    src: "/backgrounds/premium/library.avif",
    category: "fantasy",
    premium: true,
  },
  {
    id: "premium-garden",
    label: "حديقة الزهور",
    src: "/backgrounds/premium/garden.avif",
    category: "nature",
    premium: true,
  },
  {
    id: "premium-harbor",
    label: "الميناء عند الغروب",
    src: "/backgrounds/premium/harbor.avif",
    category: "travel",
    premium: true,
  },
  {
    id: "premium-kids-room",
    label: "غرفة الأطفال",
    src: "/backgrounds/premium/kids-room.avif",
    category: "home",
    premium: true,
  },
  { id: "park", label: "الحديقة", src: bgPark, category: "nature" },
  { id: "room", label: "غرفة الطفل القديمة", src: bgRoom, category: "home" },
  { id: "class", label: "الفصل القديم", src: bgClass, category: "learning" },
  { id: "beach", label: "الشاطئ", src: bgBeach, category: "nature" },
  { id: "forest", label: "الغابة السحرية", src: bgForest, category: "fantasy" },
];

export function filterBackgrounds(filter: BackgroundFilter) {
  if (filter === "all") return BACKGROUNDS;
  if (filter === "premium") return BACKGROUNDS.filter((background) => background.premium);
  return BACKGROUNDS.filter((background) => background.category === filter);
}

/** مكتبة الكلمات المفتاحية العربية ↔ الحركات */
export const ACTION_KEYWORDS: { action: AnimationType; pattern: RegExp }[] = [
  { action: "wave", pattern: /(مرحبا|مرحبًا|أهلا|أهلًا|السلام|سلام|حيّ|حي\b)/ },
  { action: "bye", pattern: /(وداع|مع السلامة|باي|إلى اللقاء|الى اللقاء)/ },
  { action: "jump", pattern: /(قفز|اقفز|نطّ|نط\b|يقفز)/ },
  { action: "clap", pattern: /(صفق|تصفيق|صفّق|يصفق)/ },
  { action: "happy", pattern: /(فرح|سعيد|سعادة|بفرح|ابتسم|ضحك|مبسوط)/ },
  { action: "sad", pattern: /(حزين|حزن|زعلان|بكى|يبكي|تعب)/ },
  { action: "spin", pattern: /(دوران|لف\b|يلف|استدر|دُر)/ },
  { action: "dance", pattern: /(رقص|ارقص|يرقص|غنّ|غناء)/ },
  { action: "nod", pattern: /(نعم|موافق|أومأ|هزّ رأسه|هز رأسه)/ },
  { action: "think", pattern: /(فكر|يفكر|تفكير|أتساءل|هممم)/ },
  { action: "wave", pattern: /(ارفع يدك|يرفع يده|لوّح|لوح\b|تلويح)/ },
];

export type StoryStep = { text: string; action: AnimationType };

/** تقسيم النص إلى مقاطع وربط كل مقطع بحركة عبر الكلمات المفتاحية. */
export function parseStory(input: string): StoryStep[] {
  const raw = input
    .split(/[،,.؛;\n]+|\bثم\b/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const parts = raw.length ? raw : [input.trim()].filter(Boolean);

  return parts.map((text) => {
    const found = ACTION_KEYWORDS.find((k) => k.pattern.test(text));
    return { text, action: found?.action ?? "idle" };
  });
}
