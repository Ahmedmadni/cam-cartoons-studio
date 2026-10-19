import { expect, test } from "bun:test";
import { createStoryProject, parseStoryProject } from "../src/lib/storyProject";
import { addCue, editCue, removeCue, cuesAt } from "../src/lib/storyCueOperations";

const base = parseStoryProject({ ...createStoryProject("p", "قصة"), scenes: [{
  id:"s", title:"مشهد", durationMs:3000, backgroundId:"forest",
  actors:[{id:"a",characterId:"curated-robot-hakim"}], cues:[],
}]});
const cue = { id:"c", actorId:"a", atMs:500, durationMs:1000, kind:"speech" as const, value:"مرحبا" };
test("add, edit and remove speech cues", () => {
  const added = addCue(base,"s",cue);
  expect(cuesAt(added.scenes[0]!,600)).toHaveLength(1);
  const edited = editCue(added,"s",{...cue,value:"أهلًا"});
  expect(edited.scenes[0]?.cues[0]?.value).toBe("أهلًا");
  expect(removeCue(edited,"s","c").scenes[0]?.cues).toHaveLength(0);
  expect(base.scenes[0]?.cues).toHaveLength(0);
});
test("rejects out of bounds cues and missing actors", () => {
  expect(() => addCue(base,"s",{...cue,atMs:2500})).toThrow();
  expect(() => addCue(base,"s",{...cue,actorId:"missing"})).toThrow();
});
