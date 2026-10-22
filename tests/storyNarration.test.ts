import { expect, test } from "bun:test";
import { BrowserStoryNarrator, speechCuesStartingBetween } from "../src/lib/storyNarration";
import type { StoryPlaybackPlan } from "../src/lib/storyPlaybackPlan";

const plan: StoryPlaybackPlan = {
  durationMs: 4000,
  scenes: [{ sceneId:"s", index:0, startMs:0, endMs:4000 }],
  cues: [
    { sceneId:"s", sceneIndex:0, cueId:"a", actorId:"a", characterId:"robot", kind:"speech", value:"أهلًا", startMs:0, endMs:900 },
    { sceneId:"s", sceneIndex:0, cueId:"move", actorId:"a", characterId:"robot", kind:"animation", value:"wave", startMs:500, endMs:800 },
    { sceneId:"s", sceneIndex:0, cueId:"b", actorId:"a", characterId:"robot", kind:"speech", value:"مرحبًا", startMs:1250, endMs:2000 },
    { sceneId:"s", sceneIndex:0, cueId:"c", actorId:"a", characterId:"robot", kind:"speech", value:"وداعًا", startMs:3500, endMs:4000 },
  ],
};
test("speech starts at exact cue boundary including zero", () => {
  expect(speechCuesStartingBetween(plan, -1, 0).map(c => c.cueId)).toEqual(["a"]);
  expect(speechCuesStartingBetween(plan, 1249, 1250).map(c => c.cueId)).toEqual(["b"]);
});
test("no duplicate narration within same cue and no animation spoken", () => {
  expect(speechCuesStartingBetween(plan, 100, 700)).toEqual([]);
  expect(speechCuesStartingBetween(plan, 0, 0)).toEqual([]);
});
test("ignore backwards transport, invalid offsets, and post-end cues", () => {
  expect(speechCuesStartingBetween(plan, 3500, 1000)).toEqual([]);
  expect(speechCuesStartingBetween(plan, NaN, 100)).toEqual([]);
  expect(speechCuesStartingBetween(plan, 3900, 4000)).toEqual([]);
});
test("resume from mid-scene never replays an earlier cue", () => {
  expect(speechCuesStartingBetween(plan, 1700, 2300)).toEqual([]);
  expect(speechCuesStartingBetween(plan, 2300, 3600).map(c=>c.cueId)).toEqual(["c"]);
});

test("browser narration stops at cue end and uses per-character voice pitch", () => {
  const utterances: Array<{ text: string; lang: string; rate: number; pitch: number; voice: SpeechSynthesisVoice | null }> = [];
  const actions: string[] = [];
  const synth = {
    getVoices: () => [],
    speak: (utterance: SpeechSynthesisUtterance) => actions.push("speak:" + utterance.text),
    cancel: () => actions.push("cancel"),
  } as unknown as SpeechSynthesis;
  const makeUtterance = (text: string) => {
    const utterance = { text, lang: "", rate: 1, pitch: 1, voice: null };
    utterances.push(utterance);
    return utterance as unknown as SpeechSynthesisUtterance;
  };
  const narrator = new BrowserStoryNarrator(synth, makeUtterance);
  expect(narrator.supported).toBe(true);
  expect(narrator.speak(plan.cues[0]!, "child")).toBe(true);
  expect(utterances[0]?.pitch).toBeGreaterThan(1);
  narrator.reconcile(800);
  expect(actions).toEqual(["cancel", "speak:أهلًا"]);
  narrator.reconcile(900);
  expect(actions.at(-1)).toBe("cancel");
});
test("missing synthesis capability refuses narration without throwing", () => {
  const narrator = new BrowserStoryNarrator(null, null);
  expect(narrator.supported).toBe(false);
  expect(narrator.speak(plan.cues[0]!)).toBe(false);
  narrator.stop();
});
