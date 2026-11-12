import { describe, expect, test } from "bun:test";
import { planSceneAudio, sceneVoiceEnergyAt, voiceBarHeights } from "../src/lib/socialAudioTimeline";
import {
  STARTER, MAX_DURATION_SECONDS, MAX_SCENES, parseSocialProject,
  projectSeconds, sceneAt, srtForProject, visibleCaptionAt,
} from "../src/lib/socialStudio";

describe("2D social content timeline", () => {
  test("starter has a real 9:16 production timeline", () => {
    expect(projectSeconds(STARTER)).toBe(19);
    expect(sceneAt(STARTER, 0).scene.id).toBe("scene-1");
    expect(sceneAt(STARTER, 5).scene.id).toBe("scene-2");
    expect(sceneAt(STARTER, 13).scene.id).toBe("scene-3");
    expect(sceneAt(STARTER, 100).scene.id).toBe("scene-3");
  });
  test("imports valid projects without exposing unknown data", () => {
    const parsed = parseSocialProject({ ...STARTER, unused: "ignore" });
    expect("unused" in parsed).toBe(false);
    expect(parsed.scenes.map(s => s.character)).toEqual(["sami", "omar", "layla"]);
  });
  test("rejects duplicate scene IDs", () => {
    expect(() => parseSocialProject({ ...STARTER, scenes: [STARTER.scenes[0], STARTER.scenes[0]] })).toThrow();
  });
  test("rejects overlong films and too many scenes", () => {
    const huge = Array.from({ length: 5 }, (_, i) => ({ ...STARTER.scenes[0], id: "h" + i, duration: 30 }));
    expect(() => parseSocialProject({ ...STARTER, scenes: huge })).toThrow();
    const many = Array.from({ length: MAX_SCENES + 1 }, (_, i) => ({ ...STARTER.scenes[0], id: "h" + i }));
    expect(() => parseSocialProject({ ...STARTER, scenes: many })).toThrow();
    expect(MAX_DURATION_SECONDS).toBe(120);
  });
  test("rejects invalid duration, empty scenes and malicious imports", () => {
    expect(() => parseSocialProject({ ...STARTER, scenes: [] })).toThrow();
    expect(() => parseSocialProject({ ...STARTER, scenes: [{ ...STARTER.scenes[0], duration: 0 }] })).toThrow();
    expect(() => parseSocialProject(JSON.parse('{"version":1,"scenes":"not array"}'))).toThrow();
  });
  test("produces stable Arabic subtitle timing", () => {
    const srt = srtForProject(STARTER);
    expect(srt).toContain("00:00:00,000 --> 00:00:05,000");
    expect(srt).toContain("00:00:05,000 --> 00:00:13,000");
    expect(srt).toContain("00:00:13,000 --> 00:00:19,000");
    expect(srt).toContain("معلومة بسيطة");
  });
});


describe("Expressive 2D animation and per-scene narration migration", () => {
  test("old v1 JSON loads without losing story details", () => {
    const legacy = {
      ...STARTER, narrationMode: undefined, captionAnimation: undefined,
      scenes: STARTER.scenes.map(s=>({...s,expression:undefined,audioDelayMs:undefined})),
    };
    const migrated = parseSocialProject(legacy);
    expect(migrated.narrationMode).toBe("global");
    expect(migrated.captionAnimation).toBe("static");
    expect(migrated.scenes.every(s=>s.expression==="happy" && s.audioDelayMs===0)).toBe(true);
  });
  test("a different voice clip for each scene stays on stable scene boundaries", () => {
    const project = parseSocialProject({
      ...STARTER,
      narrationMode:"scenes",
      scenes: [
        {...STARTER.scenes[0],duration:4,audioDelayMs:500},
        {...STARTER.scenes[1],duration:4,audioDelayMs:1000},
      ],
    });
    const lengths = new Map([["scene-1",12],["scene-2",1.5]]);
    expect(planSceneAudio(project,lengths)).toEqual([
      { sceneId:"scene-1",startSeconds:.5,durationSeconds:3.5 },
      { sceneId:"scene-2",startSeconds:5,durationSeconds:1.5 },
    ]);
    const energy = new Map([["scene-1",new Float32Array(120).fill(.45)],["scene-2",new Float32Array(120).fill(.8)]]);
    expect(sceneVoiceEnergyAt(project,.1,energy)).toBe(0);
    expect(sceneVoiceEnergyAt(project,1,energy)).toBeCloseTo(.45);
    expect(sceneVoiceEnergyAt(project,4.8,energy)).toBe(0);
    expect(sceneVoiceEnergyAt(project,5.5,energy)).toBeCloseTo(.8);
  });
  test("rejects unsupported visual modes and invalid audio delays safely", () => {
    const parsed = parseSocialProject({...STARTER,narrationMode:"impossible",captionAnimation:"broken",
      scenes:[{...STARTER.scenes[0],expression:"magic",audioDelayMs:-100}]});
    expect(parsed.narrationMode).toBe("global");
    expect(parsed.captionAnimation).toBe("static");
    expect(parsed.scenes[0]?.expression).toBe("happy");
    expect(parsed.scenes[0]?.audioDelayMs).toBe(0);
  });
  test("text reveal is deterministic and never claims speech-level timestamps", () => {
    expect(visibleCaptionAt("أهلا بكم في الحلقة",0,4,"reveal")).toBe("أهلا");
    expect(visibleCaptionAt("أهلا بكم في الحلقة",2,4,"reveal")).toBe("أهلا بكم");
    expect(visibleCaptionAt("أهلا بكم في الحلقة",4,4,"reveal")).toBe("أهلا بكم في الحلقة");
    expect(visibleCaptionAt("أهلا بكم في الحلقة",0,4,"static")).toBe("أهلا بكم في الحلقة");
  });
  test("waveform bins are bounded and safe for empty samples", () => {
    expect(voiceBarHeights(new Float32Array([.2,.7,.1]),3)).toEqual([20,70,10]);
    expect(voiceBarHeights(new Float32Array(),3)).toEqual([8,8,8]);
    expect(voiceBarHeights(new Float32Array([.7]),500)).toEqual([]);
  });
});
