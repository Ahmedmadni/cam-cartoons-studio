export type RecordingKind = "video" | "audio";

const WEBM_VIDEO_FORMATS = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
] as const;
const WEBM_AUDIO_FORMATS = ["audio/webm;codecs=opus", "audio/webm"] as const;

/** Only claim WebM support when the current browser explicitly advertises it. */
export function selectWebmMime(
  kind: RecordingKind,
  supports: ((mime: string) => boolean) | null =
    typeof MediaRecorder !== "undefined" ? MediaRecorder.isTypeSupported.bind(MediaRecorder) : null,
): string | null {
  if (!supports) return null;
  const candidates = kind === "video" ? WEBM_VIDEO_FORMATS : WEBM_AUDIO_FORMATS;
  for (const format of candidates) {
    try {
      if (supports(format)) return format;
    } catch {
      // A broken platform MIME probe must not crash the user interface.
    }
  }
  return null;
}
