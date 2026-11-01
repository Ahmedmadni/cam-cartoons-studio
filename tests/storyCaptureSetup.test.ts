import { expect, test } from "bun:test";
import { waitForStoryCapture } from "../src/lib/storyCaptureSetup";

test("cancelled permission waits settle immediately and release a late stream", async () => {
  let deliver: (stream: MediaStream) => void = () => {};
  let cancel: () => void = () => {};
  let active = true;
  let stopped = 0;
  const requested = new Promise<MediaStream>(resolve => { deliver = resolve; });
  const cancelled = new Promise<null>(resolve => { cancel = () => resolve(null); });
  const waiting = waitForStoryCapture(requested, cancelled, () => active);
  active = false;
  cancel();
  expect(await waiting).toBeNull();
  deliver({ getTracks: () => [{ stop: () => { stopped++; } }] } as unknown as MediaStream);
  await Promise.resolve();
  expect(stopped).toBe(1);
});