import type { AnimationType } from "./store";

/** Match only the commit-pinned source path; blob URL playback uses model sourceUrl. */
export function isForestFoxSource(url: string): boolean {
  return /\/Models\/Fox\/glTF-Binary\/Fox\.glb(?:\?|$)/i.test(url);
}

/** Never invent action clips; select only names present in the decoded GLB. */
export function chooseForestFoxClip(names: readonly string[], animation: AnimationType): string | null {
  if (!names.length) return null;
  const query = animation === "dance" || animation === "jump" || animation === "spin" ? /run/i
    : animation === "wave" || animation === "bye" ? /walk/i : /survey/i;
  return names.find((name) => query.test(name))
    ?? names.find((name) => /survey/i.test(name))
    ?? names[0] ?? null;
}
