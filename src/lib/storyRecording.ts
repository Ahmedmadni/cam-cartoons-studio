type RecorderLike = Pick<MediaRecorder, "state" | "mimeType" | "start" | "stop" | "ondataavailable" | "onstop" | "onerror">;

/** Owns every capture track and never publishes failed or empty recordings. */
export class StoryRecording {
  private readonly recorder: RecorderLike;
  private chunks: Blob[] = [];
  private discarded = false;
  private settled = false;

  constructor(
    private readonly stream: MediaStream,
    mimeType: string,
    private readonly onComplete: (blob: Blob) => void,
    private readonly onFailure: (message: string) => void,
    makeRecorder: (stream: MediaStream, mime: string) => RecorderLike =
      (source, mime) => new MediaRecorder(source, { mimeType: mime }),
  ) {
    try {
      this.recorder = makeRecorder(stream, mimeType);
      this.recorder.ondataavailable = event => {
        if (event.data.size) this.chunks.push(event.data);
      };
      this.recorder.onerror = () => {
        this.discarded = true;
        this.finish();
        this.release();
        this.fail("تعذّر إكمال التسجيل؛ حاول مرة أخرى.");
      };
      this.recorder.onstop = () => {
        this.release();
        if (this.discarded || this.settled) return;
        const blob = new Blob(this.chunks, { type: this.recorder.mimeType || mimeType });
        if (!blob.size) {
          this.fail("لم ينتج التسجيل مقطعًا صالحًا؛ حاول مرة أخرى.");
          return;
        }
        this.settled = true;
        this.onComplete(blob);
      };
      this.recorder.start();
    } catch (error) {
      this.release();
      throw error;
    }
  }

  finish() {
    if (this.recorder.state !== "inactive") this.recorder.stop();
  }

  discard() {
    this.discarded = true;
    this.finish();
    this.release();
  }

  private release() {
    this.stream.getTracks().forEach(track => track.stop());
  }

  private fail(message: string) {
    if (this.settled) return;
    this.settled = true;
    this.onFailure(message);
  }
}