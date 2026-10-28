import { expect, test } from "bun:test";
import { StoryRecording } from "../src/lib/storyRecording";

function fixture() {
  let stopped = 0;
  let saved: Blob | null = null;
  let failure = "";
  const stream = { getTracks: () => [{ stop: () => { stopped++; } }, { stop: () => { stopped++; } }] } as unknown as MediaStream;
  const recorder = {
    state: "inactive", mimeType: "video/webm;codecs=vp8,opus",
    ondataavailable: null, onstop: null, onerror: null,
    start() { this.state = "recording"; },
    stop() { this.state = "inactive"; },
  } as unknown as MediaRecorder;
  const recording = new StoryRecording(stream, recorder.mimeType,
    blob => { saved = blob; }, message => { failure = message; }, () => recorder);
  const chunk = () => recorder.ondataavailable?.({ data: new Blob(["video"]) } as BlobEvent);
  const end = () => recorder.onstop?.(new Event("stop"));
  return { recording, recorder, chunk, end, result: () => ({ stopped, saved, failure }) };
}
test("completed capture releases all tracks and preserves its actual MIME", () => {
  const f = fixture(); f.chunk(); f.recording.finish(); f.end();
  expect(f.result().stopped).toBe(2);
  expect(f.result().saved?.type).toBe("video/webm;codecs=vp8,opus");
});
test("empty recordings are rejected", () => {
  const f = fixture(); f.recording.finish(); f.end();
  expect(f.result().saved).toBeNull();
  expect(f.result().failure.length).toBeGreaterThan(0);
});
test("discarded recordings never publish even after a late stop event", () => {
  const f = fixture(); f.chunk(); f.recording.discard(); f.end();
  expect(f.result().saved).toBeNull();
  expect(f.result().stopped).toBeGreaterThanOrEqual(2);
});
test("recorder errors release capture and prevent saving buffered data", () => {
  const f = fixture(); f.chunk(); f.recorder.onerror?.(new Event("error")); f.end();
  expect(f.result().saved).toBeNull();
  expect(f.result().failure.length).toBeGreaterThan(0);
  expect(f.result().stopped).toBeGreaterThanOrEqual(2);
});