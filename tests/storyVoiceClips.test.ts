import { expect, test } from "bun:test";
import { validateVoiceClip, MAX_STORY_CLIP_BYTES } from "../src/lib/storyVoiceClips";

test("accepts bounded audio blobs and common supported mime types", () => {
  expect(() => validateVoiceClip(new Blob(["sound"], {type:"audio/mpeg"}), "voice.mp3")).not.toThrow();
  expect(() => validateVoiceClip(new Blob(["sound"], {type:"audio/webm;codecs=opus"}), "voice.webm")).not.toThrow();
  expect(() => validateVoiceClip(new Blob(["sound"], {type:"audio/wav"}), "voice.wav")).not.toThrow();
});
test("rejects oversized, empty, unsafe mime and blank filenames", () => {
  expect(() => validateVoiceClip(new Blob([],{type:"audio/wav"}), "empty.wav")).toThrow();
  expect(() => validateVoiceClip(new Blob([new Uint8Array(MAX_STORY_CLIP_BYTES+1)],{type:"audio/wav"}),"large.wav")).toThrow();
  expect(() => validateVoiceClip(new Blob(["hello"],{type:"text/html"}), "fake.html")).toThrow();
  expect(() => validateVoiceClip(new Blob(["sound"],{type:"audio/ogg"}), "  ")).toThrow();
});
