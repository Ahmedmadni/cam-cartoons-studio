import { parseStoryProject, type StoryProject, type StoryScene } from "./storyProject";

export function addScene(project: StoryProject, scene: StoryScene): StoryProject {
  if (project.scenes.length >= 100) throw new Error("Maximum scene count reached");
  return parseStoryProject({ ...project, updatedAt: new Date().toISOString(), scenes: [...project.scenes, scene] });
}
export function updateScene(project: StoryProject, scene: StoryScene): StoryProject {
  if (!project.scenes.some((s) => s.id === scene.id)) throw new Error("Scene not found");
  return parseStoryProject({ ...project, updatedAt: new Date().toISOString(),
    scenes: project.scenes.map((s) => s.id === scene.id ? scene : s) });
}
export function removeScene(project: StoryProject, id: string): StoryProject {
  return parseStoryProject({ ...project, updatedAt: new Date().toISOString(),
    scenes: project.scenes.filter((s) => s.id !== id) });
}
export function moveScene(project: StoryProject, from: number, to: number): StoryProject {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= project.scenes.length || to >= project.scenes.length) throw new Error("Scene index out of range");
  const scenes = [...project.scenes];
  const scene = scenes.splice(from, 1)[0]!;
  scenes.splice(to, 0, scene);
  return parseStoryProject({ ...project, updatedAt: new Date().toISOString(), scenes });
}
export function getTimeline(project: StoryProject) {
  let elapsed = 0;
  return project.scenes.map((scene, index) => {
    const entry = { sceneId: scene.id, index, startMs: elapsed, endMs: elapsed + scene.durationMs };
    elapsed = entry.endMs;
    return entry;
  });
}
export function sceneAt(project: StoryProject, atMs: number) {
  if (!Number.isFinite(atMs) || atMs < 0) return null;
  const timeline = getTimeline(project);
  return timeline.find((s) => atMs >= s.startMs && atMs < s.endMs) ?? null;
}
