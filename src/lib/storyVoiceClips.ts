const DATABASE = "cam-story-voice-clips";
const STORE = "clips";
const MAX_CLIP_BYTES = 8 * 1024 * 1024;
const MIME_TYPES = new Set(["audio/webm", "audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/mp4", "audio/x-m4a"]);

export type StoryVoiceClip = {
  projectId: string;
  cueId: string;
  blob: Blob;
  name: string;
  updatedAt: number;
};

export function validateVoiceClip(blob: Blob, name: string): void {
  if (!(blob instanceof Blob) || blob.size <= 0 || blob.size > MAX_CLIP_BYTES)
    throw new Error("الملف الصوتي يجب أن يكون بين 1 بايت و8 ميجابايت");
  const mime = blob.type.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!MIME_TYPES.has(mime))
    throw new Error("صيغة الصوت غير مدعومة. استخدم MP3 أو WAV أو WebM أو OGG أو M4A.");
  if (!name.trim() || name.length > 240)
    throw new Error("اسم الملف الصوتي غير صالح");
}

export const MAX_STORY_CLIP_BYTES = MAX_CLIP_BYTES;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("التخزين المحلي غير متاح"));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DATABASE, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: ["projectId", "cueId"] });
        store.createIndex("projectId", "projectId");
      }
    };
    req.onerror = () => reject(req.error ?? new Error("تعذر فتح مكتبة الصوت"));
    req.onblocked = () => reject(new Error("قاعدة بيانات الصوت مستخدمة في تبويب آخر"));
    req.onsuccess = () => resolve(req.result);
  });
}

function transaction<T>(mode: IDBTransactionMode, execute: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(db => new Promise<T>((resolve, reject) => {
    let result!: T;
    let finished = false;
    const fail = (error: Error) => {
      if (finished) return;
      finished = true;
      db.close();
      reject(error);
    };
    try {
      const tx = db.transaction(STORE, mode);
      const request = execute(tx.objectStore(STORE));
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => {
        if (finished) return;
        finished = true;
        db.close();
        resolve(result);
      };
      tx.onabort = () => fail(tx.error ?? new Error("توقفت عملية حفظ الصوت"));
      tx.onerror = () => fail(tx.error ?? new Error("تعذّر حفظ الصوت"));
    } catch (error) { fail(error instanceof Error ? error : new Error(String(error))); }
  }));
}

function validateKey(projectId: string, cueId?: string) {
  if (!projectId || (cueId !== undefined && !cueId)) throw new Error("معرف المشروع أو الحوار غير صالح");
}

/** Audio data lives in IndexedDB, not story JSON backups or public storage. */
export async function saveStoryVoiceClip(projectId: string, cueId: string, file: File): Promise<void> {
  validateKey(projectId, cueId);
  validateVoiceClip(file, file.name);
  const entry: StoryVoiceClip = { projectId, cueId, blob: file, name: file.name, updatedAt: Date.now() };
  await transaction("readwrite", store => store.put(entry));
}

export async function getStoryVoiceClip(projectId: string, cueId: string): Promise<StoryVoiceClip | null> {
  validateKey(projectId, cueId);
  const entry = await transaction<StoryVoiceClip | undefined>("readonly", store => store.get([projectId, cueId]));
  return entry ?? null;
}

export async function listStoryVoiceClips(projectId: string): Promise<StoryVoiceClip[]> {
  validateKey(projectId);
  return transaction<StoryVoiceClip[]>("readonly", store =>
    store.index("projectId").getAll(IDBKeyRange.only(projectId)));
}

export async function deleteStoryVoiceClip(projectId: string, cueId: string): Promise<void> {
  validateKey(projectId, cueId);
  await transaction("readwrite", store => store.delete([projectId, cueId]));
}

export async function deleteProjectVoiceClips(projectId: string): Promise<void> {
  validateKey(projectId);
  const clips = await listStoryVoiceClips(projectId);
  // Individual deletes are intentionally awaited; never purge a different project.
  for (const clip of clips) await deleteStoryVoiceClip(projectId, clip.cueId);
}
