import { expect, test } from "bun:test";
import { createStoryProject } from "../src/lib/storyProject";
import { deserializeStoryProject, duplicateImportedStoryProject, serializeStoryProject } from "../src/lib/storyProjectBackup";

test("backup roundtrips validated story", () => {
  const story = createStoryProject("original", "رحلة الغابة", new Date("2026-10-19T00:00:00.000Z"));
  expect(deserializeStoryProject(serializeStoryProject(story))).toEqual(story);
});
test("rejects unsupported, corrupt and oversized backups", () => {
  expect(() => deserializeStoryProject("{}")).toThrow();
  expect(() => deserializeStoryProject("invalid")).toThrow();
  expect(() => deserializeStoryProject("x".repeat(2 * 1024 * 1024 + 1))).toThrow();
});
test("import duplicates IDs without overwriting the source", () => {
  const project = createStoryProject("old", "قصة", new Date("2026-10-19T00:00:00.000Z"));
  const imported = duplicateImportedStoryProject(project, "new", new Date("2026-10-19T01:00:00.000Z"));
  expect(imported.id).toBe("new");
  expect(imported.title).toContain("نسخة");
  expect(project.id).toBe("old");
});
