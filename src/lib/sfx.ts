type SfxName = "click" | "start" | "stop" | "success";

const TONES: Record<SfxName, { freq: number[]; duration: number }> = {
  click: { freq: [660], duration: 0.1 },
  start: { freq: [523, 784], duration: 0.14 },
  stop: { freq: [784, 392], duration: 0.16 },
  success: { freq: [523, 659, 880], duration: 0.16 },
};

let ctx: AudioContext | null = null;

/** مؤثرات صوتية مبهجة قصيرة عند الضغط على الأزرار. */
export function playSfx(name: SfxName) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = ctx ?? new AudioCtx();
    void ctx.resume();
    const { freq, duration } = TONES[name];
    freq.forEach((f, i) => {
      const start = ctx!.currentTime + i * duration;
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    });
  } catch {
    /* الصوت غير متاح */
  }
}
