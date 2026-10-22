import type { StoryProject } from "./storyProject";
import { buildStoryPlaybackPlan } from "./storyPlaybackPlan";

/** Standard SRT timecode from absolute story milliseconds. */
export function srtTimecode(timeMs: number): string {
  if (!Number.isSafeInteger(timeMs) || timeMs < 0) throw new Error("Invalid subtitle offset");
  const hours = Math.floor(timeMs / 3_600_000);
  const minutes = Math.floor(timeMs / 60_000) % 60;
  const seconds = Math.floor(timeMs / 1000) % 60;
  const millis = timeMs % 1000;
  const pad = (value: number, length: number) => String(value).padStart(length, "0");
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`;
}

/** Source-authorable timed Arabic subtitles; no proprietary transcoder required. */
export function exportStorySrt(project: StoryProject): string {
  const plan = buildStoryPlaybackPlan(project);
  const speech = plan.cues.filter(c => c.kind === "speech" && c.value.trim());
  return speech.map((cue, index) => {
    const clean = cue.value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
    return [
      String(index + 1),
      `${srtTimecode(cue.startMs)} --> ${srtTimecode(cue.endMs)}`,
      clean,
    ].join("\n");
  }).join("\n\n") + (speech.length ? "\n" : "");
}
