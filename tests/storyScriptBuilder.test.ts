import { expect, test } from "bun:test";
import { createStoryProject, parseStoryProject } from "../src/lib/storyProject";
import { appendDialogueScript, estimateArabicSpeechMs, parseSpeakerScript } from "../src/lib/storyScriptBuilder";

const project = parseStoryProject({ ...createStoryProject("p", "القصة"), scenes: [{
  id: "s", title: "مشهد", durationMs: 5000, backgroundId: "forest",
  actors: [{id:"h",characterId:"robot"},{id:"f",characterId:"fox"}], cues:[],
}]});
const speakers = [{actorId:"h",displayName:"حكيم"}, {actorId:"f",displayName:"فلفل"}];
test("assigns Arabic dialogue to the named actor", () => {
  const lines = parseSpeakerScript("حكيم: أهلاً بك\nفلفل: هيا نذهب", speakers);
  expect(lines.map(l => l.actorId)).toEqual(["h","f"]);
  expect(lines.map(l => l.text)).toEqual(["أهلاً بك","هيا نذهب"]);
});
test("simple lines default to first character and estimate speech durations", () => {
  expect(parseSpeakerScript("مرحبًا بالجميع", speakers)[0]?.actorId).toBe("h");
  expect(estimateArabicSpeechMs("مرحبا")).toBeGreaterThanOrEqual(1500);
});
test("appends timed cues and extends scene without mutating previous project", () => {
  let i = 0;
  const out = appendDialogueScript(project,"s","حكيم: صباح الخير\nفلفل: هيا نلعب",speakers,()=>String(++i));
  expect(out.scenes[0]?.cues).toHaveLength(2);
  expect(out.scenes[0]?.cues[1]?.atMs).toBeGreaterThan(out.scenes[0]!.cues[0]!.durationMs);
  expect(out.scenes[0]?.durationMs).toBeGreaterThanOrEqual(out.scenes[0]!.cues[1]!.atMs+out.scenes[0]!.cues[1]!.durationMs);
  expect(project.scenes[0]?.cues).toHaveLength(0);
});
test("rejects unknown speaker and project limit violations", () => {
  expect(()=>parseSpeakerScript("مجهول: مرحبا",speakers)).toThrow("غير موجود");
  expect(()=>parseSpeakerScript("جملة",[])).toThrow();
  expect(()=>parseSpeakerScript("كلام\n".repeat(100),speakers)).toThrow();
  expect(()=>appendDialogueScript(project,"s","x",[{actorId:"bad",displayName:"شخصية"}],()=> "id")).toThrow();
});
