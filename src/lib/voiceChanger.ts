import type { VoiceType } from "./store";

/**
 * إعدادات كل صوت كرتوني (تُستخدم في المعالجة المحلية الوهمية،
 * وستُستخدم لاحقاً لاختيار voiceId عند ربط API خارجي مثل ElevenLabs).
 */
export const VOICE_PRESETS: Record<
  VoiceType,
  { pitch: number; label: string; emoji: string; elevenLabsVoiceId?: string }
> = {
  normal: { pitch: 1, label: "صوتي الطبيعي", emoji: "🙂" },
  bear: { pitch: 0.72, label: "صوت دبدوب", emoji: "🐻" },
  robot: { pitch: 0.85, label: "صوت روبوت", emoji: "🤖" },
  rabbit: { pitch: 1.45, label: "صوت أرنوب", emoji: "🐰" },
  dino: { pitch: 0.62, label: "صوت ديناصور", emoji: "🦖" },
};

/**
 * TODO: عند توفّر مفتاح API (مثل ElevenLabs Voice Changer)
 * استبدل هذه الدالة الوهمية بنداء حقيقي للـ API من طرف الخادم:
 *
 *   POST /api/voice-changer  { audio, voice }  ->  audio/mpeg
 *
 * حالياً نقوم بمعالجة محلية بسيطة (تغيير طبقة الصوت Pitch) داخل المتصفح
 * حتى يعمل التطبيق بالكامل بدون أي مفاتيح.
 * ⚠️ أرسل لي مفتاح الـ API لاحقاً لتفعيل الأصوات الكرتونية الحقيقية.
 */
export async function transformVoice(audio: Blob, voice: VoiceType): Promise<Blob> {
  const preset = VOICE_PRESETS[voice];
  if (!audio || voice === "normal" || preset.pitch === 1) return audio;

  const arrayBuffer = await audio.arrayBuffer();
  const AudioCtx: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const decodeCtx = new AudioCtx();
  let buffer: AudioBuffer;
  try {
    buffer = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    void decodeCtx.close();
  }

  const rate = preset.pitch;
  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil(buffer.length / rate),
    buffer.sampleRate,
  );
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;

  // لمسة كرتونية إضافية حسب الشخصية
  const filter = offline.createBiquadFilter();
  if (voice === "robot") {
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.7;
  } else {
    filter.type = "peaking";
    filter.frequency.value = voice === "rabbit" ? 2600 : 400;
    filter.gain.value = 6;
  }

  source.connect(filter);
  filter.connect(offline.destination);
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
