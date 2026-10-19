import { parseStoryProject, type StoryProject } from "./storyProject";

export const STORY_BACKUP_FORMAT = "cam-cartoons-story-project";
export const MAX_STORY_BACKUP_BYTES = 2 * 1024 * 1024;

export function serializeStoryProject(project: StoryProject): string {
  const validated = parseStoryProject(project);
  return JSON.stringify({ format: STORY_BACKUP_FORMAT, exportedAt: new Date().toISOString(), project: validated }, null, 2);
}

export function deserializeStoryProject(json: string): StoryProject {
  if (new TextEncoder().encode(json).byteLength > MAX_STORY_BACKUP_BYTES)
    throw new Error("Story backup exceeds the 2 MB limit");
  const envelope: unknown = JSON.parse(json);
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope))
    throw new Error("Invalid story backup");
  const data = envelope as Record<string, unknown>;
  if (data.format !== STORY_BACKUP_FORMAT) throw new Error("Unsupported story backup format");
  return parseStoryProject(data.project);
}

/** Import as a new project to avoid silently overwriting another locally saved draft. */
export function duplicateImportedStoryProject(project: StoryProject, newId: string, now = new Date()): StoryProject {
  return parseStoryProject({
    ...project,
    id: newId,
    title: project.title.slice(0, 190) + " — نسخة",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}
