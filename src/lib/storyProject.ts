import { z } from "zod";

/** Independent, versioned story document. No camera or WebGL state is persisted. */
export const storyCueSchema = z.object({
  id: z.string().min(1),
  atMs: z.number().int().nonnegative(),
  durationMs: z.number().int().positive(),
  actorId: z.string().min(1),
  kind: z.enum(["speech", "animation"]),
  value: z.string().min(1),
});
export const storyActorSchema = z.object({
  id: z.string().min(1),
  characterId: z.string().min(1),
  x: z.number().min(-1).max(1).default(0),
  scale: z.number().positive().max(10).default(1),
});
export const storySceneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  durationMs: z.number().int().positive().max(600_000),
  backgroundId: z.string().min(1),
  actors: z.array(storyActorSchema).max(20),
  cues: z.array(storyCueSchema).max(500),
  camera: z.object({
    framing: z.enum(["wide", "medium", "close"]).default("wide"),
  }).default({ framing: "wide" }),
}).superRefine((scene, ctx) => {
  const actors = new Set(scene.actors.map((actor) => actor.id));
  if (actors.size !== scene.actors.length)
    ctx.addIssue({ code: "custom", message: "Duplicate actor IDs", path: ["actors"] });
  const cueIds = new Set<string>();
  for (const [index, cue] of scene.cues.entries()) {
    if (cueIds.has(cue.id))
      ctx.addIssue({ code: "custom", message: "Duplicate cue ID", path: ["cues", index, "id"] });
    cueIds.add(cue.id);
    if (!actors.has(cue.actorId))
      ctx.addIssue({ code: "custom", message: "Cue references a missing actor", path: ["cues", index, "actorId"] });
    if (cue.atMs + cue.durationMs > scene.durationMs)
      ctx.addIssue({ code: "custom", message: "Cue exceeds scene duration", path: ["cues", index] });
  }
});
export const storyProjectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  scenes: z.array(storySceneSchema).max(100),
}).superRefine((project, ctx) => {
  const ids = new Set<string>();
  project.scenes.forEach((scene, index) => {
    if (ids.has(scene.id))
      ctx.addIssue({ code: "custom", message: "Duplicate scene ID", path: ["scenes", index, "id"] });
    ids.add(scene.id);
  });
});
export type StoryProject = z.infer<typeof storyProjectSchema>;
export type StoryScene = z.infer<typeof storySceneSchema>;
export function parseStoryProject(value: unknown): StoryProject {
  return storyProjectSchema.parse(value);
}
export function createStoryProject(id: string, title: string, now = new Date()): StoryProject {
  return parseStoryProject({
    schemaVersion: 1, id, title,
    createdAt: now.toISOString(), updatedAt: now.toISOString(), scenes: [],
  });
}
export function totalStoryDurationMs(project: StoryProject): number {
  return project.scenes.reduce((total, scene) => total + scene.durationMs, 0);
}
