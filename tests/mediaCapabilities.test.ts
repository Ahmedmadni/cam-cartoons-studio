import { expect, test } from "bun:test";
import { selectWebmMime } from "../src/lib/mediaCapabilities";

test("selects the best supported WebM video codec", () => {
  expect(selectWebmMime("video", mime => mime.includes("vp8"))).toBe("video/webm;codecs=vp8,opus");
});
test("falls back to plain WebM only when reported supported", () => {
  expect(selectWebmMime("video", mime => mime === "video/webm")).toBe("video/webm");
  expect(selectWebmMime("audio", mime => mime === "audio/webm")).toBe("audio/webm");
});
test("returns null for missing API or unsupported container", () => {
  expect(selectWebmMime("video", null)).toBeNull();
  expect(selectWebmMime("video", () => false)).toBeNull();
  expect(selectWebmMime("audio", () => { throw new Error("broken browser"); })).toBeNull();
});
