import { parseStoryProject, type StoryProject, type StoryScene } from "./storyProject";
import { updateScene } from "./storyProjectOperations";

export type Cue = StoryScene["cues"][number];

export function addCue(project: StoryProject, sceneId: string, cue: Cue): StoryProject {
  const scene = project.scenes.find(s => s.id === sceneId);
  if (!scene) throw new Error("Scene not found");
  return updateScene(project, { ...scene, cues: [...scene.cues, cue] });
}
export function editCue(project: StoryProject, sceneId: string, cue: Cue): StoryProject {
  const scene = project.scenes.find(s => s.id === sceneId);
  if (!scene) throw new Error("Scene not found");
  if (!scene.cues.some(c => c.id === cue.id)) throw new Error("Cue not found");
  return updateScene(project, {
    ...scene,
    cues: scene.cues.map(c => c.id === cue.id ? cue : c),
  });
}
export function removeCue(project: StoryProject, sceneId: string, cueId: string): StoryProject {
  const scene = project.scenes.find(s => s.id === sceneId);
  if (!scene) throw new Error("Scene not found");
  return updateScene(project, { ...scene, cues: scene.cues.filter(c => c.id !== cueId) });
}
export function cuesAt(scene: StoryScene, atMs: number): Cue[] {
  if (!Number.isFinite(atMs) || atMs < 0) return [];
  return scene.cues.filter(c => atMs >= c.atMs && atMs < c.atMs + c.durationMs)
    .sort((a,b) => a.atMs - b.atMs || a.id.localeCompare(b.id));
}
export function validateCueProject(project: unknown): StoryProject {
  return parseStoryProject(project);
}
