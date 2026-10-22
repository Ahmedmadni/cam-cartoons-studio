import type { StoryProject } from "./storyProject";
import { getTimeline } from "./storyProjectOperations";

export type ScheduledStoryCue = {
  sceneId: string;
  sceneIndex: number;
  cueId: string;
  actorId: string;
  characterId: string;
  kind: "speech" | "animation";
  value: string;
  startMs: number;
  endMs: number;
};

export type StoryPlaybackPlan = {
  durationMs: number;
  scenes: ReturnType<typeof getTimeline>;
  cues: ScheduledStoryCue[];
};

/** Pure scheduling: all offsets are absolute and independent of frame rates or browser timers. */
export function buildStoryPlaybackPlan(project: StoryProject): StoryPlaybackPlan {
  const scenes = getTimeline(project);
  const cues: ScheduledStoryCue[] = [];
  for (const timelineScene of scenes) {
    const scene = project.scenes[timelineScene.index]!;
    const actors = new Map(scene.actors.map(actor => [actor.id, actor.characterId]));
    for (const cue of scene.cues) {
      const characterId = actors.get(cue.actorId);
      if (!characterId) throw new Error("Cue actor is missing");
      cues.push({
        sceneId: scene.id,
        sceneIndex: timelineScene.index,
        cueId: cue.id,
        actorId: cue.actorId,
        characterId,
        kind: cue.kind,
        value: cue.value,
        startMs: timelineScene.startMs + cue.atMs,
        endMs: timelineScene.startMs + cue.atMs + cue.durationMs,
      });
    }
  }
  cues.sort((a, b) => a.startMs - b.startMs || a.sceneIndex - b.sceneIndex || a.cueId.localeCompare(b.cueId));
  return { scenes, durationMs: scenes.at(-1)?.endMs ?? 0, cues };
}

export function getPlaybackFrame(plan: StoryPlaybackPlan, atMs: number) {
  if (!Number.isFinite(atMs) || atMs < 0 || atMs >= plan.durationMs) return null;
  const scene = plan.scenes.find(s => atMs >= s.startMs && atMs < s.endMs);
  if (!scene) return null;
  return {
    sceneId: scene.sceneId,
    sceneIndex: scene.index,
    sceneTimeMs: atMs - scene.startMs,
    activeCues: plan.cues.filter(c => c.sceneId === scene.sceneId && c.startMs <= atMs && atMs < c.endMs),
  };
}
