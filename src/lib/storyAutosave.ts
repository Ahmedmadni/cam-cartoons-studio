import type { StoryProject } from "./storyProject";

/** Serializes local draft writes so older asynchronous commits cannot overwrite newer edits. */
export class StoryAutosave {
  private pending = new Map<string, { project: StoryProject; timer: ReturnType<typeof setTimeout> }>();
  private tail: Promise<void> = Promise.resolve();
  private writing = 0;

  constructor(
    private readonly write: (project: StoryProject) => Promise<void>,
    private readonly onSaved: (project: StoryProject) => void,
    private readonly onError: (project: StoryProject, error: unknown) => void,
    private readonly debounceMs = 900,
  ) {}

  schedule(project: StoryProject): void {
    this.cancel(project.id);
    const timer = setTimeout(() => { void this.flush(project.id).catch(() => undefined); }, this.debounceMs);
    this.pending.set(project.id, { project, timer });
  }

  /** A user-initiated save bypasses debounce, but still respects write order. */
  saveNow(project: StoryProject): Promise<void> {
    this.schedule(project);
    return this.flush(project.id);
  }

  flush(id: string): Promise<void> {
    const item = this.pending.get(id);
    if (!item) return this.tail;
    this.pending.delete(id);
    clearTimeout(item.timer);
    this.writing += 1;
    const operation = this.tail.then(() => this.write(item.project));
    this.tail = operation.catch(() => undefined);
    return operation.then(
      () => {
        this.writing -= 1;
        this.onSaved(item.project);
      },
      (error: unknown) => {
        this.writing -= 1;
        this.onError(item.project, error);
        throw error;
      },
    );
  }

  cancel(id: string): void {
    const item = this.pending.get(id);
    if (item) clearTimeout(item.timer);
    this.pending.delete(id);
  }

  hasUnwrittenChanges(): boolean {
    return this.pending.size > 0 || this.writing > 0;
  }

  /** Complete scheduled writes before destructive operations, unless explicitly cancelled. */
  async flushAll(): Promise<void> {
    for (const id of [...this.pending.keys()]) await this.flush(id);
    await this.tail;
  }

  dispose(): void {
    for (const id of [...this.pending.keys()]) {
      void this.flush(id).catch(() => undefined);
    }
  }
}
