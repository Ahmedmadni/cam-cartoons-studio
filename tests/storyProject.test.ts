import { describe, expect, test } from "bun:test";
import { createStoryProject, parseStoryProject, totalStoryDurationMs } from "../src/lib/storyProject";

const actor = { id: "actor-1", characterId: "curated-robot-hakim" };
const scene = {
  id: "scene-1", title: "البداية", durationMs: 3000, backgroundId: "forest",
  actors: [actor], cues: [{ id: "cue-1", actorId: "actor-1", kind: "speech", value: "مرحبا", atMs: 0, durationMs: 1200 }],
};
describe("Versioned story project", () => {
  test("creates a valid empty project", () => {
    const project = createStoryProject("story-1", "قصتي", new Date("2026-10-17T00:00:00.000Z"));
    expect(project.schemaVersion).toBe(1);
    expect(project.scenes).toEqual([]);
    expect(totalStoryDurationMs(project)).toBe(0);
  });
  test("parses scenes and applies stable defaults", () => {
    const project = parseStoryProject({ ...createStoryProject("p", "Story"), scenes: [scene] });
    expect(project.scenes[0]?.camera.framing).toBe("wide");
    expect(project.scenes[0]?.actors[0]?.scale).toBe(1);
    expect(totalStoryDurationMs(project)).toBe(3000);
  });
  test("rejects cue referencing absent actor", () => {
    expect(() => parseStoryProject({ ...createStoryProject("p", "Story"), scenes: [{ ...scene, actors: [] }] })).toThrow();
  });
  test("rejects cues outside the scene duration", () => {
    expect(() => parseStoryProject({ ...createStoryProject("p", "Story"), scenes: [{ ...scene, durationMs: 100 }] })).toThrow();
  });
  test("rejects duplicate scene IDs", () => {
    expect(() => parseStoryProject({ ...createStoryProject("p", "Story"), scenes: [scene, scene] })).toThrow();
  });
  test("rejects unknown document versions", () => {
    expect(() => parseStoryProject({ ...createStoryProject("p", "Story"), schemaVersion: 2 })).toThrow();
  });
});
