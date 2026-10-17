import { parseStoryProject, type StoryProject } from "./storyProject";

const DATABASE = "cam-story-projects";
const STORE = "projects";
const DATABASE_VERSION = 1;

/** Story drafts are stored independently of the existing character-library persistence. */
function connect(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable in this browser"));
      return;
    }
    const request = indexedDB.open(DATABASE, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open story database"));
    request.onblocked = () => reject(new Error("Story database upgrade is blocked by another tab"));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await connect();
  return new Promise<T>((resolve, reject) => {
    let result!: T;
    let settled = false;
    const fail = (error: Error) => {
      if (!settled) { settled = true; reject(error); }
      db.close();
    };
    try {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => {
        if (!settled) { settled = true; resolve(result); }
        db.close();
      };
      tx.onerror = () => fail(tx.error ?? new Error("Story transaction failed"));
      tx.onabort = () => fail(tx.error ?? new Error("Story transaction aborted"));
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function saveStoryProject(project: StoryProject): Promise<void> {
  const validated = parseStoryProject(project);
  await transact("readwrite", (store) => store.put(validated));
}

export async function loadStoryProject(id: string): Promise<StoryProject | null> {
  if (!id) throw new Error("Story project ID is required");
  const raw = await transact<unknown>("readonly", (store) => store.get(id));
  return raw === undefined ? null : parseStoryProject(raw);
}

export async function listStoryProjects(): Promise<StoryProject[]> {
  const raw = await transact<unknown[]>("readonly", (store) => store.getAll());
  return raw.map(parseStoryProject).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteStoryProject(id: string): Promise<void> {
  if (!id) throw new Error("Story project ID is required");
  await transact("readwrite", (store) => store.delete(id));
}
