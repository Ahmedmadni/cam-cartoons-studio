import type { ScheduledStoryCue, StoryPlaybackPlan } from "./storyPlaybackPlan";
import type { VoiceType } from "./store";

/**
 * A monotonic timeline tick only starts speech at cue boundaries.
 * Scrubbing never backfills speech that started before the new position.
 */
export function speechCuesStartingBetween(
  plan: StoryPlaybackPlan,
  previousMs: number,
  nextMs: number,
): ScheduledStoryCue[] {
  if (!Number.isFinite(previousMs) || !Number.isFinite(nextMs) || nextMs < 0 || nextMs < previousMs) return [];
  return plan.cues.filter(c =>
    c.kind === "speech" && c.startMs > previousMs && c.startMs <= nextMs && c.startMs < plan.durationMs,
  );
}

const VOICE_PITCH: Record<VoiceType, number> = {
  normal: 1, child: 1.35, boy: 1.15, girl: 1.27, man: 0.85, woman: 1.06,
};

/** Browser-only live preview; Web Speech cannot be captured as exported movie audio. */
export class BrowserStoryNarrator {
  private activeUntil = -1;
  private activeId: string | null = null;
  private readonly synth: SpeechSynthesis | null;

  constructor(synth: SpeechSynthesis | null = typeof window !== "undefined" && "speechSynthesis" in window
    ? window.speechSynthesis : null) {
    this.synth = synth;
  }

  get supported(): boolean {
    return !!this.synth && typeof SpeechSynthesisUtterance !== "undefined";
  }

  speak(cue: ScheduledStoryCue, voice: VoiceType = "normal"): boolean {
    if (!this.synth || !this.supported) return false;
    this.stop();
    const utterance = new SpeechSynthesisUtterance(cue.value);
    utterance.lang = "ar-SA";
    utterance.rate = 0.95;
    utterance.pitch = VOICE_PITCH[voice];
    const arabicVoice = this.synth.getVoices().find(v => v.lang.toLowerCase().startsWith("ar"));
    if (arabicVoice) utterance.voice = arabicVoice;
    this.activeUntil = cue.endMs;
    this.activeId = cue.cueId;
    this.synth.speak(utterance);
    return true;
  }

  /** Stop a line when its authored cue ends; it must not bleed into the next scene. */
  reconcile(timeMs: number): void {
    if (this.activeId && timeMs >= this.activeUntil) this.stop();
  }

  stop(): void {
    this.synth?.cancel();
    this.activeUntil = -1;
    this.activeId = null;
  }
}
