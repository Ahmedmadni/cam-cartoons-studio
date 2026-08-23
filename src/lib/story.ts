import type { AnimationType } from "@/lib/store";

import bgPark from "@/assets/bg-park.jpg";
import bgRoom from "@/assets/bg-room.jpg";
import bgClass from "@/assets/bg-class.jpg";
import bgBeach from "@/assets/bg-beach.jpg";
import bgForest from "@/assets/bg-forest.jpg";

export type Background = { id: string; label: string; src: string };

export const BACKGROUNDS: Background[] = [
  { id: "park", label: "الحديقة", src: bgPark },
  { id: "room", label: "غرفة الطفل", src: bgRoom },
  { id: "class", label: "الفصل", src: bgClass },
  { id: "beach", label: "الشاطئ", src: bgBeach },
  { id: "forest", label: "الغابة السحرية", src: bgForest },
];

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
