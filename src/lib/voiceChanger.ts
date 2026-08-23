import type { VoiceType } from "./store";

/**
 * أصوات بشرية كرتونية: طفل / ولد / بنت / رجل / امرأة.
 * semitones = درجة الصوت الأساسية للنمط، ويضاف إليها تحكم المستخدم.
 */
export const VOICE_PRESETS: Record<
  VoiceType,
  { semitones: number; tone: number; label: string; emoji: string }
> = {
  normal: { semitones: 0, tone: 0.5, label: "صوتي الطبيعي", emoji: "🙂" },
  child: { semitones: 6, tone: 0.75, label: "صوت طفل", emoji: "🧒" },
  boy: { semitones: 4, tone: 0.65, label: "صوت ولد", emoji: "👦" },
  girl: { semitones: 5.5, tone: 0.8, label: "صوت بنت", emoji: "👧" },
  man: { semitones: -4, tone: 0.35, label: "صوت رجل", emoji: "👨" },
  woman: { semitones: 2, tone: 0.6, label: "صوت امرأة", emoji: "👩" },
};

export type VoiceOptions = {
  /** تعديل إضافي بنصف النغمات من -12 إلى +12 */
  pitch?: number;
  /** النبرة: 0 = دافئة، 1 = لامعة/كرتونية */
  tone?: number;
};

/**
 * TODO: عند توفّر مفتاح API (مثل ElevenLabs Voice Changer) استبدل هذه المعالجة
 * المحلية بنداء حقيقي من طرف الخادم:  POST /api/voice-changer -> audio/mpeg
 * حالياً نطبّق تغيير درجة الصوت + تلوين النبرة داخل المتصفح بدون أي مفاتيح.
 */
export async function transformVoice(
  audio: Blob,
  voice: VoiceType,
  options: VoiceOptions = {},
): Promise<Blob> {
  const preset = VOICE_PRESETS[voice];
  const semitones = preset.semitones + (options.pitch ?? 0);
  const tone = options.tone ?? preset.tone;
  if (!audio) return audio;
  if (voice === "normal" && Math.abs(semitones) < 0.05 && Math.abs(tone - 0.5) < 0.05) return audio;

  const arrayBuffer = await audio.arrayBuffer();
  const AudioCtx: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const decodeCtx = new AudioCtx();
  let buffer: AudioBuffer;
  try {
    buffer = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    void decodeCtx.close();
  }

  const rate = Math.pow(2, semitones / 12);
  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.max(1, Math.ceil(buffer.length / rate)),
    buffer.sampleRate,
  );
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;

  // تلوين النبرة: نبرة دافئة = تعزيز الترددات المنخفضة، نبرة لامعة = تعزيز العالية
  const warm = offline.createBiquadFilter();
  warm.type = "peaking";
  warm.frequency.value = 320;
  warm.gain.value = (0.5 - tone) * 14;

  const bright = offline.createBiquadFilter();
  bright.type = "peaking";
  bright.frequency.value = 3000;
  bright.gain.value = (tone - 0.5) * 16;

  const presence = offline.createBiquadFilter();
  presence.type = "highshelf";
  presence.frequency.value = 6000;
  presence.gain.value = (tone - 0.5) * 8;

  source.connect(warm);
  warm.connect(bright);
  bright.connect(presence);
  presence.connect(offline.destination);
  source.start(0);

  const rendered = await offline.startRendering();
  return encodeWav(rendered);
}

/** تحويل AudioBuffer إلى ملف WAV صالح للتشغيل والدمج مع الفيديو. */
function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const length = buffer.length * channels * 2;
  const view = new DataView(new ArrayBuffer(44 + length));

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length, true);

  let offset = 44;
  const data: Float32Array[] = [];
  for (let c = 0; c < channels; c += 1) data.push(buffer.getChannelData(c));
  for (let i = 0; i < buffer.length; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const sample = Math.max(-1, Math.min(1, data[c]![i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([view.buffer], { type: "audio/wav" });
}
