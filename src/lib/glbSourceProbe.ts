/**
 * Non-persistent check of a remote GLB from the actual visitor's browser.
 * A server-side audit cannot verify CORS restrictions seen by the GLTFLoader.
 *
 * Read only the first 12 bytes of a normal GET response.
 * Never issue Range requests against the same GLB URL as GLTFLoader: misconfigured
 * CDNs can cache partial binary responses and break a later full model load.
 */
export type GlbProbe = {
  declaredBytes: number;
  httpStatus: number;
  partialContent: boolean;
};

export function inspectGlbPrefix(bytes: Uint8Array): number {
  if (bytes.byteLength < 12) throw new Error("استجابة النموذج أقصر من ترويسة GLB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error("المصدر لا يعيد ملف GLB صحيحًا.");
  if (view.getUint32(4, true) !== 2) throw new Error("إصدار GLB غير مدعوم؛ المطلوب glTF 2.0.");
  const size = view.getUint32(8, true);
  if (size < 20) throw new Error("حجم GLB المعلن في الترويسة غير صحيح.");
  return size;
}

export async function probeRemoteGlb(url: string, timeoutMs = 12000): Promise<GlbProbe> {
  let address: URL;
  try {
    address = new URL(url);
  } catch {
    throw new Error("عنوان مصدر GLB غير صالح.");
  }
  if (address.protocol !== "https:" || !/\.glb$/i.test(address.pathname)) {
    throw new Error("اختر رابط HTTPS مباشرًا ينتهي بامتداد .glb.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(address.toString(), {
        mode: "cors",
        credentials: "omit",
        // Avoid poisoning the browser/CDN cache with a 12-byte HTTP 206.
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) throw new Error("انتهت مهلة الاتصال بمصدر الشخصية.");
      throw new Error("تعذر الاتصال بالمصدر من المتصفح. تحقق من الشبكة وإعدادات CORS لدى الموقع.");
    }
    if (!response.ok) throw new Error("رفض خادم الشخصية التحميل (HTTP " + response.status + ").");
    if (!response.body) throw new Error("المصدر لم يوفر بيانات النموذج.");

    const reader = response.body.getReader();
    const prefix = new Uint8Array(12);
    let received = 0;
    try {
      while (received < prefix.byteLength) {
        const { done, value } = await reader.read();
        if (done) break;
        const count = Math.min(value.length, prefix.byteLength - received);
        prefix.set(value.subarray(0, count), received);
        received += count;
      }
    } catch (error) {
      if (controller.signal.aborted) throw new Error("انتهت مهلة قراءة ملف الشخصية.");
      throw error;
    } finally {
      // Stop after the header; no-store prevents incomplete bytes being cached.
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    if (received !== 12) throw new Error("لم يُرجع المصدر ترويسة GLB مكتملة.");
    return {
      declaredBytes: inspectGlbPrefix(prefix),
      httpStatus: response.status,
      partialContent: response.status === 206,
    };
  } finally {
    clearTimeout(timeout);
  }
}
