import type { VoiceType } from "./store";

export type VoiceSynthesisOptions = {
  language?: string;
  pitch?: number;
  tone?: number;
};

const voiceApiUrl = import.meta.env["VITE_VOICE_API_URL"]?.trim() ?? "";

export function isRemoteVoiceConfigured() {
  return Boolean(voiceApiUrl);
}

export async function synthesizeRemoteVoice(
  text: string,
  voice: VoiceType,
  options: VoiceSynthesisOptions = {},
): Promise<Blob | null> {
  if (!voiceApiUrl || !text.trim()) return null;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(voiceApiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "audio/wav, audio/mpeg, audio/ogg, audio/webm, application/octet-stream",
      },
      body: JSON.stringify({
        text,
        voice,
        language: options.language ?? "ar-SA",
        pitch: options.pitch ?? 0,
        tone: options.tone ?? 0.5,
        engine: "auto",
        format: "wav",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Voice API failed with HTTP ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob.size) throw new Error("Voice API returned an empty audio file");
    return blob;
  } finally {
    window.clearTimeout(timeout);
  }
}

type AudioLevelListener = (level: number) => void;

export class VoicePlaybackBus {
  private readonly context: AudioContext;
  private readonly captureDestination: MediaStreamAudioDestinationNode;
  private activeSource: AudioBufferSourceNode | null = null;
  private closed = false;

  constructor() {
    const AudioCtx: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    this.context = new AudioCtx();
    this.captureDestination = this.context.createMediaStreamDestination();
  }

  get captureStream() {
    return this.captureDestination.stream;
  }

  async play(blob: Blob, onLevel?: AudioLevelListener) {
    if (this.closed) throw new Error("Voice playback bus is already closed");

    await this.context.resume();
    const audioData = await blob.arrayBuffer();
    const buffer = await this.context.decodeAudioData(audioData.slice(0));

    const source = this.context.createBufferSource();
    const analyser = this.context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.45;

    source.buffer = buffer;
    this.activeSource = source;
    source.connect(analyser);
    analyser.connect(this.context.destination);
    analyser.connect(this.captureDestination);

    const samples = new Uint8Array(analyser.fftSize);

    await new Promise<void>((resolve) => {
      let rafId = 0;

      const updateLevel = () => {
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (let i = 0; i < samples.length; i += 1) {
          const normalized = ((samples[i] ?? 128) - 128) / 128;
          energy += normalized * normalized;
        }

        const rms = Math.sqrt(energy / samples.length);
        onLevel?.(Math.min(1, Math.max(0, rms * 5.5)));
        rafId = requestAnimationFrame(updateLevel);
      };

      source.onended = () => {
        cancelAnimationFrame(rafId);
        onLevel?.(0);
        source.disconnect();
        analyser.disconnect();
        if (this.activeSource === source) this.activeSource = null;
        resolve();
      };

      source.start(0);
      rafId = requestAnimationFrame(updateLevel);
    });
  }

  stop() {
    const source = this.activeSource;
    if (!source) return;
    try {
      source.stop();
    } catch {
      // Source may already have ended between frames.
    }
  }

  async close() {
    if (this.closed) return;
    this.stop();
    this.closed = true;
    await this.context.close();
  }
}
