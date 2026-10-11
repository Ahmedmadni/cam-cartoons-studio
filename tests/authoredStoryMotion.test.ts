import { describe, expect, test } from "bun:test";
import { chooseForestFoxClip, isForestFoxSource } from "../src/lib/authoredStoryMotion";

describe("Source-authored animal movement", () => {
  const clips = ["Survey", "Walk", "Run"];
  test("recognizes the exact native Fox source, not unrelated GLBs", () => {
    expect(isForestFoxSource("https://raw.githubusercontent.com/x/y/Models/Fox/glTF-Binary/Fox.glb")).toBe(true);
    expect(isForestFoxSource("blob:https://studio.example.com/fox.glb")).toBe(false);
    expect(isForestFoxSource("https://studio.example.com/custom.glb")).toBe(false);
  });
  test("maps story gestures to actual source clips only", () => {
    expect(chooseForestFoxClip(clips, "idle")).toBe("Survey");
    expect(chooseForestFoxClip(clips, "think")).toBe("Survey");
    expect(chooseForestFoxClip(clips, "wave")).toBe("Walk");
    expect(chooseForestFoxClip(clips, "bye")).toBe("Walk");
    expect(chooseForestFoxClip(clips, "jump")).toBe("Run");
    expect(chooseForestFoxClip(clips, "dance")).toBe("Run");
    expect(chooseForestFoxClip([], "idle")).toBeNull();
    expect(chooseForestFoxClip(["Other"], "happy")).toBe("Other");
  });
}
