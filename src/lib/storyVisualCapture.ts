import type { StoryProject } from "./storyProject";
import { previewDurationMs, previewFrameAt, PREVIEW_FPS, PREVIEW_WIDTH, PREVIEW_HEIGHT } from "./storyExportPlan";
import { selectWebmMime } from "./mediaCapabilities";
import { prepareStoryAudioSession } from "./storyAudioMix";

export type VisualCaptureOptions = {
  project: StoryProject;
  backgrounds: ReadonlyMap<string, string>;
  getWebglCanvas: () => HTMLCanvasElement | null;
  onPosition: (ms: number) => void;
  voiceClips?: ReadonlyMap<string, Blob> | undefined;
  signal?: AbortSignal | undefined;
};

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  const ratio = Math.max(PREVIEW_WIDTH / image.naturalWidth, PREVIEW_HEIGHT / image.naturalHeight);
  const width = image.naturalWidth * ratio;
  const height = image.naturalHeight * ratio;
  ctx.drawImage(image, (PREVIEW_WIDTH - width) / 2, (PREVIEW_HEIGHT - height) / 2, width, height);
}

function drawCaption(ctx: CanvasRenderingContext2D, subtitles: string[], title: string) {
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "bold 19px sans-serif";
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(PREVIEW_WIDTH - 280, 15, 265, 42);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(title.slice(0, 34), PREVIEW_WIDTH - 26, 36, 245);
  if (!subtitles.length) return;
  const caption = subtitles.join(" — ");
  const lines = caption.length > 95 ? [caption.slice(0, 95), caption.slice(95, 190)] : [caption];
  const areaHeight = Math.max(48, lines.length * 32 + 20);
  ctx.fillStyle = "rgba(0,0,0,0.77)";
  ctx.fillRect(0, PREVIEW_HEIGHT - areaHeight, PREVIEW_WIDTH, areaHeight);
  ctx.font = "bold 23px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  lines.forEach((line, index) => ctx.fillText(line, PREVIEW_WIDTH / 2, PREVIEW_HEIGHT - areaHeight + 26 + index * 32, PREVIEW_WIDTH - 40));
}

async function loadBackground(url: string, signal?: AbortSignal): Promise<HTMLImageElement | null> {
  if (signal?.aborted) return null;
  const image = new Image();
  image.decoding = "async";
  return await new Promise(resolve => {
    let done = false;
    const timer = window.setTimeout(() => finish(null), 6000);
    const finish = (value: HTMLImageElement | null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", abort);
      resolve(value);
    };
    const abort = () => finish(null);
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    signal?.addEventListener("abort", abort, { once: true });
    image.src = url;
  });
}

/**
 * A capped, visually composited WebM sample of the authored scenes.
 * Uploaded/recorded voice clips can be mixed via Web Audio; Web Speech is NOT captured.
 */
export async function recordVisualStoryPreview(options: VisualCaptureOptions): Promise<Blob> {
  const { project, signal } = options;
  const mime = selectWebmMime("video");
  if (!mime || typeof MediaRecorder === "undefined") throw new Error("هذا المتصفح لا يدعم تسجيل فيديو WebM");
  const durationMs = previewDurationMs(project);
  if (!durationMs) throw new Error("أضف مشهدًا واحدًا على الأقل");
  if (signal?.aborted) throw new Error("أُلغى التسجيل");

  const sceneIds = new Set(project.scenes.slice(0, 100).map(s => s.backgroundId));
  const images = new Map<string, HTMLImageElement>();
  await Promise.all([...sceneIds].map(async id => {
    const url = options.backgrounds.get(id);
    if (!url) return;
    const image = await loadBackground(url, signal);
    if (image) images.set(id, image);
  }));
  if (signal?.aborted) throw new Error("أُلغى التسجيل");

  const audioSession = await prepareStoryAudioSession(project, options.voiceClips ?? new Map(), durationMs, signal);
  if (signal?.aborted) { await audioSession?.close(); throw new Error("أُلغى التسجيل"); }

  const canvas = document.createElement("canvas");
  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context || typeof canvas.captureStream !== "function") {
    await audioSession?.close();
    throw new Error("هذا المتصفح لا يدعم تصدير المعاينة");
  }
  const stream = canvas.captureStream(PREVIEW_FPS);
  if (audioSession) stream.addTrack(audioSession.track);
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_800_000 });
  } catch (error) {
    stream.getTracks().forEach(track => track.stop());
    await audioSession?.close();
    throw error;
  }
  return await new Promise<Blob>((resolve, reject) => {
    const chunks: Blob[] = [];
    let raf = 0;
    let finished = false;
    let error: Error | null = null;
    const cleanup = () => {
      cancelAnimationFrame(raf);
      signal?.removeEventListener("abort", abort);
      stream.getTracks().forEach(track => track.stop());
      void audioSession?.close().catch(() => undefined);
    };
    const fail = (reason: Error) => {
      error = reason;
      if (recorder.state !== "inactive") recorder.stop();
      else complete();
    };
    const complete = () => {
      if (finished) return;
      finished = true;
      cleanup();
      if (error) { reject(error); return; }
      if (!chunks.length) { reject(new Error("المتصفح لم يُنتج أي إطارات فيديو")); return; }
      resolve(new Blob(chunks, { type: recorder.mimeType || mime }));
    };
    const abort = () => fail(new Error("أُلغى التسجيل"));
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onerror = () => fail(new Error("تعذر تسجيل المعاينة في هذا المتصفح"));
    recorder.onstop = complete;
    signal?.addEventListener("abort", abort, { once: true });

    const paint = (ms: number) => {
      const frame = previewFrameAt(project, Math.min(ms, durationMs - 1));
      if (!frame) return;
      context.fillStyle = "#172338";
      context.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
      const image = images.get(frame.backgroundId);
      if (image) drawCover(context, image);
      const webgl = options.getWebglCanvas();
      if (webgl && webgl.width > 0 && webgl.height > 0) {
        // A WebGL draw may fail due to context loss; retain the background + captions.
        try { context.drawImage(webgl, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT); } catch { /* fallback to background */ }
      }
      drawCaption(context, frame.subtitles, frame.title);
    };
    try {
      options.onPosition(0);
      paint(0);
      recorder.start(500);
      audioSession?.start();
      const start = performance.now();
      const tick = (now: number) => {
        if (finished) return;
        const ms = Math.min(durationMs, Math.max(0, now - start));
        options.onPosition(ms);
        try { paint(ms); } catch (caught) {
          fail(caught instanceof Error ? caught : new Error(String(caught)));
          return;
        }
        if (ms >= durationMs) {
          recorder.requestData();
          recorder.stop();
        } else {
          raf = requestAnimationFrame(tick);
        }
      };
      raf = requestAnimationFrame(tick);
    } catch (caught) {
      fail(caught instanceof Error ? caught : new Error(String(caught)));
    }
  });
}
