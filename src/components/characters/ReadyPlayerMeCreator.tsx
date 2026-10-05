import { CheckCircle2, ExternalLink, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ReadyPlayerMeCreatorProps = {
  subdomain: string;
  onAvatarExported: (url: string) => void;
  onClose: () => void;
};

type FrameMessage = {
  source?: string;
  eventName?: string;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
};

function normalizeSubdomain(value: string) {
  const trimmed = value.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  return withoutProtocol.replace(/\.readyplayer\.me.*$/, "").replace(/[^a-z0-9-]/g, "");
}

function parseMessage(data: unknown): FrameMessage | null {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as FrameMessage;
    } catch {
      return null;
    }
  }

  if (data && typeof data === "object") return data as FrameMessage;
  return null;
}

export default function ReadyPlayerMeCreator({
  subdomain,
  onAvatarExported,
  onClose,
}: ReadyPlayerMeCreatorProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [exported, setExported] = useState(false);

  const normalizedSubdomain = normalizeSubdomain(subdomain);
  const origin = useMemo(
    () => `https://${normalizedSubdomain || "demo"}.readyplayer.me`,
    [normalizedSubdomain],
  );
  const creatorUrl = `${origin}/avatar?frameApi&bodyType=fullbody`;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;

      const message = parseMessage(event.data);
      if (!message || message.source !== "readyplayerme") return;

      if (message.eventName === "v1.frame.ready") {
        setReady(true);
        frameRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            target: "readyplayerme",
            type: "subscribe",
            eventName: "v1.**",
          }),
          origin,
        );
        return;
      }

      if (message.eventName === "v1.avatar.exported") {
        const url = message.data?.url;
        if (typeof url === "string" && url.trim()) {
          setExported(true);
          onAvatarExported(url.trim());
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onAvatarExported, origin]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Ready Player Me Avatar Creator"
    >
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-card shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <div className="flex items-center gap-2">
              <ExternalLink className="size-5 text-primary" />
              <h2 className="text-lg font-black text-foreground">Ready Player Me</h2>
            </div>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              صمّم الشخصية ثم اضغط Next / Done ليتم استيرادها تلقائيًا.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground sm:inline-flex">
              {exported ? (
                <>
                  <CheckCircle2 className="size-4 text-primary" />
                  تم الاستيراد
                </>
              ) : ready ? (
                "جاهز"
              ) : (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  جاري التحميل
                </>
              )}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition hover:brightness-95"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 bg-background">
          {!ready && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70">
              <div className="rounded-2xl bg-card px-5 py-4 text-center shadow-lg">
                <LoaderCircle className="mx-auto size-7 animate-spin text-primary" />
                <p className="mt-2 text-sm font-black text-foreground">
                  جاري فتح مصمم Ready Player Me…
                </p>
              </div>
            </div>
          )}

          <iframe
            ref={frameRef}
            src={creatorUrl}
            title="Ready Player Me Avatar Creator"
            allow="camera *; microphone *; clipboard-write"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
