import type { StoryProject } from "./storyProject";
import { buildStoryPlaybackPlan } from "./storyPlaybackPlan";

export type StoryAudioWindow = {
  cueId: string;
  startMs: number;
  durationMs: number;
};

/** Absolute, clip-bounded audio schedule for real uploaded or recorded dialogue. */
export function buildStoryAudioWindows(
  project: StoryProject,
  availableCueIds: ReadonlySet<string>,
  exportDurationMs: number,
): StoryAudioWindow[] {
  if (!Number.isFinite(exportDurationMs) || exportDurationMs < 0) throw new Error("Invalid export duration");
  const limit = Math.min(exportDurationMs, buildStoryPlaybackPlan(project).durationMs);
  return buildStoryPlaybackPlan(project).cues
    .filter(c => c.kind === "speech" && availableCueIds.has(c.cueId) && c.startMs < limit)
    .map(c => ({
      cueId: c.cueId,
      startMs: c.startMs,
      durationMs: Math.min(c.endMs, limit) - c.startMs,
    }))
    .filter(window => window.durationMs > 0);
}

export type StoryAudioSession = {
  readonly track: MediaStreamTrack;
  start: () => void;
  close: () => Promise<void>;
};

/**
 * Decodes real audio clips into Web Audio and mixes their authored cue windows
 * to one MediaStreamDestination track for MediaRecorder.
 * Browser speechSynthesis is NOT routed or captured.
 */
export async function prepareStoryAudioSession(
  project: StoryProject,
  clips: ReadonlyMap<string, Blob>,
  durationMs: number,
  signal?: AbortSignal,
): Promise<StoryAudioSession | null> {
  const windows = buildStoryAudioWindows(project, new Set(clips.keys()), durationMs);
  if (!windows.length) return null;
  const AudioCtor = typeof window !== "undefined"
    ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    : undefined;
  if (!AudioCtor) throw new Error("المتصفح لا يدعم مزج الملفات الصوتية");
  const context = new AudioCtor();
  const destination = context.createMediaStreamDestination();
  const sources: AudioBufferSourceNode[] = [];
  let started = false;
  try {
    await context.resume();
    const decoded = new Map<string, AudioBuffer>();
    for (const window of windows) {
      if (signal?.aborted) throw new Error("أُلغى التسجيل");
      if (decoded.has(window.cueId)) continue;
      const blob = clips.get(window.cueId)!;
      try {
        decoded.set(window.cueId, await context.decodeAudioData(await blob.arrayBuffer()));
      } catch {
        throw new Error("تعذر فك ترميز الصوت للحوار: " + window.cueId);
      }
    }
    const track = destination.stream.getAudioTracks()[0];
    if (!track) throw new Error("تعذّر تجهيز مسار الصوت");
    return {
      track,
      start() {
        if (started) return;
        started = true;
        const now = context.currentTime + 0.04;
        for (const window of windows) {
          const buffer = decoded.get(window.cueId)!;
          const clipSeconds = Math.min(buffer.duration, window.durationMs / 1000);
          if (!(clipSeconds > 0)) continue;
          const source = context.createBufferSource();
          const volume = context.createGain();
          volume.gain.value = 0.9;
          source.buffer = buffer;
          source.connect(volume);
          volume.connect(destination);
          source.start(now + window.startMs / 1000);
          source.stop(now + window.startMs / 1000 + clipSeconds);
          sources.push(source);
        }
      },
      async close() {
        for (const source of sources) {
          try { source.stop(); } catch { /* natural end */ }
          source.disconnect();
        }
        track.stop();
        if (context.state !== "closed") await context.close();
      },
    };
  } catch (error) {
    for (const source of sources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    destination.stream.getTracks().forEach(track => track.stop());
    if (context.state !== "closed") await context.close();
    throw error;
  }
}
