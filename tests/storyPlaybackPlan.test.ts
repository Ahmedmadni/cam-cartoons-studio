import { expect, test } from "bun:test";
import { createStoryProject, parseStoryProject } from "../src/lib/storyProject";
import { buildStoryPlaybackPlan, getPlaybackFrame } from "../src/lib/storyPlaybackPlan";

const project = parseStoryProject({ ...createStoryProject("p", "قصة"), scenes: [
  { id:"first", title:"افتتاح", durationMs:3000, backgroundId:"forest", actors:[{id:"a",characterId:"robot"}],
    cues:[{id:"hi",actorId:"a",kind:"speech",value:"مرحبًا",atMs:500,durationMs:1000}] },
  { id:"second", title:"النهاية", durationMs:2000, backgroundId:"park", actors:[{id:"b",characterId:"fox"}],
    cues:[{id:"wave",actorId:"b",kind:"animation",value:"wave",atMs:250,durationMs:500}] },
]});
test("schedules cues with absolute story offsets", () => {
  const plan = buildStoryPlaybackPlan(project);
  expect(plan.durationMs).toBe(5000);
  expect(plan.cues.map(x => x.startMs)).toEqual([500,3250]);
  expect(plan.cues.map(x => x.characterId)).toEqual(["robot","fox"]);
});
test("resolves scene boundary and active cues deterministically", () => {
  const plan = buildStoryPlaybackPlan(project);
  expect(getPlaybackFrame(plan,500)?.activeCues[0]?.cueId).toBe("hi");
  expect(getPlaybackFrame(plan,3000)?.sceneId).toBe("second");
  expect(getPlaybackFrame(plan,3250)?.activeCues[0]?.cueId).toBe("wave");
  expect(getPlaybackFrame(plan,5000)).toBeNull();
  expect(getPlaybackFrame(plan,-1)).toBeNull();
});
test("empty story yields valid zero-duration plan", () => {
  const plan = buildStoryPlaybackPlan(createStoryProject("empty","قصة"));
  expect(plan.durationMs).toBe(0);
  expect(getPlaybackFrame(plan,0)).toBeNull();
});
