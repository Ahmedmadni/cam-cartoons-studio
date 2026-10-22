import { expect, test } from "bun:test";
import { createStoryProject, parseStoryProject } from "../src/lib/storyProject";
import { srtTimecode, exportStorySrt } from "../src/lib/storySubtitles";

test("formats SRT timecodes accurately at scene boundaries", () => {
  expect(srtTimecode(0)).toBe("00:00:00,000");
  expect(srtTimecode(3723004)).toBe("01:02:03,004");
  expect(() => srtTimecode(-1)).toThrow();
});
test("exports Arabic dialogue across scenes with absolute offsets", () => {
  const story = parseStoryProject({ ...createStoryProject("s", "عربي"), scenes: [
    { id:"intro", title:"مقدمة",durationMs:3000,backgroundId:"park",actors:[{id:"a",characterId:"robot"}],
      cues:[{id:"one",actorId:"a",kind:"speech",value:"مرحبًا بكم",atMs:100,durationMs:2000}] },
    { id:"outro",title:"النهاية",durationMs:4000,backgroundId:"forest",actors:[{id:"b",characterId:"fox"}],
      cues:[{id:"two",actorId:"b",kind:"speech",value:"إلى اللقاء",atMs:500,durationMs:900},
        {id:"move",actorId:"b",kind:"animation",value:"wave",atMs:500,durationMs:900}] },
  ]});
  const subtitles = exportStorySrt(story);
  expect(subtitles).toContain("00:00:00,100 --> 00:00:02,100\nمرحبًا بكم");
  expect(subtitles).toContain("00:00:03,500 --> 00:00:04,400\nإلى اللقاء");
  expect(subtitles).not.toContain("wave");
  expect(subtitles.trim().split("\n\n")).toHaveLength(2);
});
test("empty storyboard yields empty subtitles", () => {
  expect(exportStorySrt(createStoryProject("empty","قصة"))).toBe("");
});
