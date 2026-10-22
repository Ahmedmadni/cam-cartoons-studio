import { expect, test } from "bun:test";
import { createStoryProject } from "../src/lib/storyProject";
import { StoryAutosave } from "../src/lib/storyAutosave";

test("immediate save persists validated project", async () => {
  const saved: string[] = [];
  const autosave = new StoryAutosave(async doc => { saved.push(doc.title); }, () => {}, () => {}, 60000);
  const draft = createStoryProject("draft", "قصة");
  await autosave.saveNow(draft);
  expect(saved).toEqual(["قصة"]);
  expect(autosave.hasUnwrittenChanges()).toBe(false);
});
test("rapid changes to the same draft collapse into last snapshot", async () => {
  const saved: string[] = [];
  const autosave = new StoryAutosave(async doc => { saved.push(doc.title); }, () => {}, () => {}, 60000);
  const initial = createStoryProject("draft", "قصة");
  autosave.schedule(initial);
  autosave.schedule({...initial, title: "نسخة جديدة"});
  await autosave.flushAll();
  expect(saved).toEqual(["نسخة جديدة"]);
});
test("cancelled queued draft does not resurrect a deleted project", async () => {
  const saved: string[] = [];
  const autosave = new StoryAutosave(async doc => { saved.push(doc.id); }, () => {}, () => {}, 60000);
  autosave.schedule(createStoryProject("removed", "محذوف"));
  autosave.cancel("removed");
  await autosave.flushAll();
  expect(saved).toEqual([]);
});
test("failed saves report an error without blocking subsequent writes", async () => {
  const errors: unknown[] = [];
  const writes: string[] = [];
  let fail = true;
  const autosave = new StoryAutosave(async doc => {
    if (fail) { fail = false; throw new Error("quota"); }
    writes.push(doc.id);
  }, () => {}, (_, error) => errors.push(error), 60000);
  await expect(autosave.saveNow(createStoryProject("a","الأولى"))).rejects.toThrow("quota");
  await autosave.saveNow(createStoryProject("b","الثانية"));
  expect(errors).toHaveLength(1);
  expect(writes).toEqual(["b"]);
});
