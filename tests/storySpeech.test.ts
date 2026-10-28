import { expect, test } from "bun:test";
import { boundaryWordLength, playStorySpeech } from "../src/lib/storySpeech";

test("word boundaries measure one Arabic word, not the rest of the sentence", () => {
  expect(boundaryWordLength("مرحبا يا صديقي", 0)).toBe(5);
  expect(boundaryWordLength("مرحبا يا صديقي", 6)).toBe(2);
  expect(boundaryWordLength("مرحبا يا صديقي", 0, 4)).toBe(4);
});

test("cancel settles speech and closes mouth without browser completion events", async () => {
  let cancelled = false;
  let mouth = 1;
  const utterance = { text: "مرحبا" } as SpeechSynthesisUtterance;
  const speech = playStorySpeech({
    synth: { speak: () => {}, cancel: () => { cancelled = true; } } as unknown as SpeechSynthesis,
    utterance, onMouth: amount => { mouth = amount; },
    frame: () => 1, cancelFrame: () => {},
  });
  speech.cancel();
  await speech.done;
  expect(cancelled).toBe(true);
  expect(mouth).toBe(0);
  expect(utterance.onboundary).toBeNull();
});