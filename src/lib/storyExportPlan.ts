import type { StoryProject } from "./storyProject";
import { buildStoryPlaybackPlan, getPlaybackFrame } from "./storyPlaybackPlan";

export const PREVIEW_MAX_MS = 30_000;
export const PREVIEW_WIDTH = 854;
export const PREVIEW_HEIGHT = 480;
export const PREVIEW_FPS = 20;

export type PreviewFrame = {
  sceneIndex: number;
  sceneId: string;
  title: string;
  backgroundId: string;
  subtitles: string[];
};

/** Fixed-length, visual-only draft export. It does not pretend to capture browser TTS. */
export function previewDurationMs(project: StoryProject): number {
  return Math.min(PREVIEW_MAX_MS, buildStoryPlaybackPlan(project).durationMs);
}

export function previewFrameAt(project: StoryProject, ms: number): PreviewFrame | null {
  const plan = buildStoryPlaybackPlan(project);
  const frame = getPlaybackFrame(plan, ms);
  if (!frame) return null;
  const scene = project.scenes[frame.sceneIndex];
  if (!scene) return null;
  return {
    sceneIndex: frame.sceneIndex,
    sceneId: scene.id,
    title: scene.title,
    backgroundId: scene.backgroundId,
    subtitles: frame.activeCues.filter(c => c.kind === "speech").map(c => c.value),
  };
}
