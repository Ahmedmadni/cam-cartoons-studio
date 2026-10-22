import { expect, test } from "bun:test";
import { createStoryProject, parseStoryProject } from "../src/lib/storyProject";
import { previewDurationMs, previewFrameAt, PREVIEW_MAX_MS } from "../src/lib/storyExportPlan";

const project = parseStoryProject({ ...createStoryProject("p", "Story"), scenes: [
  { id:"s1", title:"مرحبا", durationMs:2000, backgroundId:"forest",
    actors:[{id:"a", characterId:"robot"}],
    cues:[{id:"c1", actorId:"a", kind:"speech", value:"اهلا", atMs:400,durationMs:1000}] },
  { id:"s2", title:"النهاية", durationMs:40000, backgroundId:"park", actors:[], cues:[] },
]});
test("preview export caps runtime to avoid runaway mobile captures", () => {
  expect(previewDurationMs(project)).toBe(PREVIEW_MAX_MS);
  expect(previewDurationMs(createStoryProject("empty","Empty"))).toBe(0);
});
test("exports timeline titles, background, and timed subtitles", () => {
  expect(previewFrameAt(project,500)?.subtitles).toEqual(["اهلا"]);
  expect(previewFrameAt(project,1999)?.sceneId).toBe("s1");
  expect(previewFrameAt(project,2000)?.sceneId).toBe("s2");
  expect(previewFrameAt(project,2000)?.backgroundId).toBe("park");
  expect(previewFrameAt(project,-1)).toBeNull();
});
