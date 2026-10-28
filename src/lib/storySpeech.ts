export function boundaryWordLength(text: string, index: number, length?: number): number {
  return length && length > 0 ? length : text.slice(index).trimStart().split(/\s/)[0]?.length || 3;
}

type SpeechOptions = {
  synth: SpeechSynthesis;
  utterance: SpeechSynthesisUtterance;
  onMouth: (amount: number) => void;
  frame?: typeof requestAnimationFrame;
  cancelFrame?: typeof cancelAnimationFrame;
};

/** Cancellation explicitly settles speech, even when a browser omits onend. */
export function playStorySpeech({ synth, utterance, onMouth, frame = requestAnimationFrame, cancelFrame = cancelAnimationFrame }: SpeechOptions) {
  let settled = false;
  let raf = 0;
  let lastTime = 0;
  let lastBoundary = 0;
  let boundarySeen = false;
  let amount = 0;
  let target = 0;
  let settle: () => void = () => {};
  const done = new Promise<void>(resolve => { settle = resolve; });
  const finish = () => {
    if (settled) return;
    settled = true;
    cancelFrame(raf);
    utterance.onstart = null;
    utterance.onboundary = null;
    utterance.onend = null;
    utterance.onerror = null;
    onMouth(0);
    settle();
  };
  const animate = (time: number) => {
    if (settled) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 1 / 60;
    lastTime = time;
    // Fall back to a smooth speaking rhythm only if word events are unavailable.
    if (!boundarySeen) target = 0.25 + 0.35 * Math.abs(Math.sin(time / 90));
    else if (time - lastBoundary > 180) target *= Math.exp(-delta * 14);
    amount += (target - amount) * (1 - Math.exp(-delta * 22));
    onMouth(amount);
    raf = frame(animate);
  };
  utterance.onstart = () => { if (!settled) raf = frame(animate); };
  utterance.onboundary = event => {
    if (settled || (event.name && event.name !== "word")) return;
    boundarySeen = true;
    lastBoundary = lastTime;
    target = Math.min(1, 0.45 + boundaryWordLength(utterance.text, event.charIndex, event.charLength) * 0.07);
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  try { synth.speak(utterance); } catch { finish(); }
  return { done, cancel: () => { finish(); synth.cancel(); } };
}