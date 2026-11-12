import { describe, expect, test } from "bun:test";
import {
  STARTER, MAX_DURATION_SECONDS, MAX_SCENES, parseSocialProject,
  projectSeconds, sceneAt, srtForProject,
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
