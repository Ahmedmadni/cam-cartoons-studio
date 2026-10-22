import { describe, expect, test } from "bun:test";
import { createStoryProject } from "../src/lib/storyProject";
import { addScene, updateScene, removeScene, moveScene, getTimeline, sceneAt, duplicateScene } from "../src/lib/storyProjectOperations";

const base = createStoryProject("test", "قصتي");
const a = { id: "a", title: "الأولى", durationMs: 1500, backgroundId: "park", actors: [], cues: [] };
const b = { id: "b", title: "الثانية", durationMs: 3000, backgroundId: "forest", actors: [], cues: [] };
describe("Project scene operations", () => {
  test("add and update a scene", () => {
    const p = addScene(base, a);
    expect(p.scenes).toHaveLength(1);
    expect(updateScene(p, {...p.scenes[0]!, title: "جديد"}).scenes[0]?.title).toBe("جديد");
    expect(base.scenes).toHaveLength(0);
  });
  test("reject duplicate scene IDs", () => expect(() => addScene(addScene(base, a), a)).toThrow());
  test("delete and reorder scenes without mutating input", () => {
    const p = addScene(addScene(base, a), b);
    expect(moveScene(p, 0, 1).scenes.map(s => s.id)).toEqual(["b", "a"]);
    expect(removeScene(p, "a").scenes.map(s => s.id)).toEqual(["b"]);
    expect(p.scenes[0]?.id).toBe("a");
  });
  test("validates move indices", () => expect(() => moveScene(addScene(base, a), -1, 0)).toThrow());
  test("duplicates actors and cues with isolated identifiers", () => {
    const project = addScene(base, {
      ...a,
      actors: [{id:"actor-original", characterId:"robot", x:0, scale:1}],
      cues: [{id:"cue-original", actorId:"actor-original",kind:"speech" as const,value:"مرحبا",atMs:0,durationMs:500}],
    });
    let id = 0;
    const result = duplicateScene(project,"a",()=>`copy-${++id}`);
    expect(result.scenes).toHaveLength(2);
    expect(result.scenes[0]!.actors[0]?.id).toBe("actor-original");
    const clone = result.scenes[1]!;
    expect(clone.id).not.toBe("a");
    expect(clone.actors[0]?.id).not.toBe("actor-original");
    expect(clone.cues[0]?.actorId).toBe(clone.actors[0]?.id);
    expect(clone.cues[0]?.id).not.toBe("cue-original");
    expect(project.scenes).toHaveLength(1);
  });
  test("does not duplicate missing scenes", () => {
    expect(() => duplicateScene(base,"not-here",()=> "new")).toThrow();
  });
  test("computes precise scene boundaries", () => {
    const p = addScene(addScene(base, a), b);
    expect(getTimeline(p).map(s => [s.startMs, s.endMs])).toEqual([[0, 1500], [1500, 4500]]);
    expect(sceneAt(p, 1499)?.sceneId).toBe("a");
    expect(sceneAt(p, 1500)?.sceneId).toBe("b");
    expect(sceneAt(p, 4500)).toBeNull();
  });
});
