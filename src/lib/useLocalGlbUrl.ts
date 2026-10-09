import { useEffect, useState } from "react";
import { getGlbAsset } from "./localGlbStorage";

export type LocalGlbState = { url: string | null; error: string | null; loading: boolean };

/**
 * Each mounted stage owns one temporary object URL and revokes it at unmount.
 * The persisted IndexedDB Blob survives reloads, but the URL itself never does.
 */
export function useLocalGlbUrl(assetId: string | undefined): LocalGlbState {
  const [state, setState] = useState<LocalGlbState>({ url: null, error: null, loading: Boolean(assetId) });
  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    if (!assetId) {
      setState({ url: null, error: null, loading: false });
      return;
    }
    setState({ url: null, error: null, loading: true });
    void getGlbAsset(assetId).then((blob) => {
      if (disposed) return;
      if (!blob) {
        setState({ url: null, loading: false, error: "ملف GLB لم يعد موجودًا في تخزين هذا المتصفح. أعد استيراده." });
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setState({ url: objectUrl, error: null, loading: false });
    }).catch((error: unknown) => {
      if (!disposed) {
        setState({ url: null, loading: false, error: error instanceof Error ? error.message : "تعذر قراءة ملف GLB المحلي." });
      }
    });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);
  return state;
}
