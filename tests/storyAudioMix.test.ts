import { expect, test } from "bun:test";
import { createStoryProject, parseStoryProject } from "../src/lib/storyProject";
import { buildStoryAudioWindows } from "../src/lib/storyAudioMix";
const project = parseStoryProject({ ...createStoryProject("test","قصة"), scenes: [
  {id:"first", title:"مقدمة", durationMs: 2000, backgroundId:"park",
   actors:[{id:"a",characterId:"robot"}],
   cues:[{id:"s1",actorId:"a",kind:"speech",value:"مرحبا",atMs:300,durationMs:1400}]},
  {id:"second",title:"نهاية",durationMs:4000,backgroundId:"forest",
   actors:[{id:"b",characterId:"fox"}],
   cues:[{id:"s2",actorId:"b",kind:"speech",value:"وداعا",atMs:1500,durationMs:2000},
         {id:"wave",actorId:"b",kind:"animation",value:"wave",atMs:600,durationMs:1000}]},
]});
test("maps real dialogue audio to absolute scene time", () => {
  const windows = buildStoryAudioWindows(project,new Set(["s1","s2","wave"]),6000);
  expect(windows).toEqual([
    {cueId:"s1",startMs:300,durationMs:1400},
    {cueId:"s2",startMs:3500,durationMs:2000},
  ]);
});
test("clamps audio to export cutoff and ignores missing clips", () => {
  expect(buildStoryAudioWindows(project,new Set(["s1","s2"]),4200)).toEqual([
    {cueId:"s1",startMs:300,durationMs:1400},
    {cueId:"s2",startMs:3500,durationMs:700},
  ]);
  expect(buildStoryAudioWindows(project,new Set(),4200)).toEqual([]);
  expect(() => buildStoryAudioWindows(project,new Set(["s1"]),-1)).toThrow();
});
