/**
 * Private, browser-local storage for real GLB geometry.
 * Never put binary data or object URLs in Zustand/localStorage.
 */
const DATABASE = "cam-cartoons-glb-assets";
const STORE = "models";
const VERSION = 1;
export const MAX_GLB_BYTES = 60 * 1024 * 1024;

export function validateGlbHeader(bytes: Uint8Array, actualLength: number): string | null {
  if (actualLength < 20 || bytes.length < 12) return "ملف GLB صغير جدًا أو تالف.";
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (header.getUint32(0, true) !== 0x46546c67) return "الملف ليس GLB: توقيع glTF غير صحيح.";
  if (header.getUint32(4, true) !== 2) return "يدعم التطبيق GLB بإصدار glTF 2.0 فقط.";
  if (header.getUint32(8, true) !== actualLength) return "طول الملف لا يطابق بيانات GLB.";
  return null;
}

export async function validateGlbFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".glb")) throw new Error("اختر ملفًا بامتداد .glb.");
  if (file.size > MAX_GLB_BYTES) throw new Error("الحد الأقصى لملف الشخصية 60 ميجابايت.");
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const error = validateGlbHeader(header, file.size);
  if (error) throw new Error(error);
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("هذا المتصفح لا يدعم تخزين ملفات GLB محليًا."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
    };
    request.onerror = () => reject(new Error("تعذر فتح مكتبة ملفات GLB على هذا الجهاز."));
    request.onblocked = () => reject(new Error("أغلق الألسنة الأخرى للتطبيق ثم حاول مجددًا."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transact<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore, finish: (value: T) => void) => void): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let value: T;
    try {
      operation(tx.objectStore(STORE), (result) => { value = result; });
    } catch (error) {
      db.close();
      reject(error);
      return;
    }
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("فشلت عملية حفظ ملف الشخصية.")); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("أُلغيت عملية حفظ ملف الشخصية.")); };
  });
}

export async function saveGlbAsset(file: File): Promise<string> {
  await validateGlbFile(file);
  const id = "glb-" + crypto.randomUUID();
  await transact<void>("readwrite", (store) => { store.put(file, id); });
  return id;
}

export async function getGlbAsset(id: string): Promise<Blob | null> {
  if (!/^glb-[a-z0-9-]{8,}$/i.test(id)) return null;
  return transact<Blob | null>("readonly", (store, finish) => {
    const request = store.get(id);
    request.onsuccess = () => finish(request.result instanceof Blob ? request.result : null);
  });
}

export async function deleteGlbAsset(id: string): Promise<void> {
  if (!/^glb-[a-z0-9-]{8,}$/i.test(id)) return;
  await transact<void>("readwrite", (store) => { store.delete(id); });
}


/**
 * Copies a publisher-hosted HTTPS GLB into the user's browser-local IndexedDB.
 * Streaming enforces the same file limit even if Content-Length is absent.
 * If CORS is disallowed, the operation fails visibly instead of masquerading as offline.
 */
export async function cacheRemoteGlb(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("رابط النموذج غير صالح.");
  }
  if (parsed.protocol !== "https:" || !/\.glb$/i.test(parsed.pathname)) {
    throw new Error("يمكن حفظ روابط HTTPS المباشرة لملفات GLB فقط.");
  }
  let response: Response;
  try {
    response = await fetch(parsed.toString(), { mode: "cors", credentials: "omit" });
  } catch {
    throw new Error("تعذر الوصول إلى مصدر GLB، ربما بسبب الشبكة أو إعدادات CORS لدى المصدر.");
  }
  if (!response.ok) throw new Error("تعذر تنزيل GLB: رمز الاستجابة " + response.status);
  const length = Number(response.headers.get("content-length"));
  if (length > MAX_GLB_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw new Error("حجم نموذج GLB يتجاوز الحد المسموح (60 ميجابايت).");
  }
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_GLB_BYTES) {
          await reader.cancel().catch(() => {});
          throw new Error("تجاوز حجم GLB الحد المسموح أثناء التنزيل.");
        }
        chunks.push(new Uint8Array(value));
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    const data = await response.arrayBuffer();
    bytes = data.byteLength;
    if (bytes > MAX_GLB_BYTES) throw new Error("حجم النموذج أكبر من 60 ميجابايت.");
    chunks.push(new Uint8Array(data));
  }
  const filename = (parsed.pathname.split("/").pop() ?? "character.glb").replace(/[^a-zA-Z0-9._-]/g, "");
  const file = new File(chunks, filename, { type: "model/gltf-binary" });
  return saveGlbAsset(file);
}
