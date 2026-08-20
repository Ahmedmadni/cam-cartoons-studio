import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, RotateCcw, Share2 } from "lucide-react";
import { useStudioStore } from "@/lib/store";

export const Route = createFileRoute("/save")({
  head: () => ({
    meta: [
      { title: "احفظ مقطعك — استوديو الشخصيات 3D" },
      { name: "description", content: "شاهد مقطعك، حمّله على جهازك أو شاركه مع أصدقائك." },
      { property: "og:title", content: "احفظ مقطعك — استوديو الشخصيات 3D" },
      {
        property: "og:description",
        content: "شاهد مقطعك، حمّله على جهازك أو شاركه مع أصدقائك.",
      },
    ],
  }),
  component: SavePage,
});

function SavePage() {
  const navigate = useNavigate();
  const recordedVideo = useStudioStore((s) => s.recordedVideo);
  const reset = useStudioStore((s) => s.reset);
  const [url, setUrl] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (!recordedVideo) {
      navigate({ to: "/" });
      return;
    }
    const objectUrl = URL.createObjectURL(recordedVideo);
    setUrl(objectUrl);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    return () => URL.revokeObjectURL(objectUrl);
  }, [recordedVideo, navigate]);

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-cartoon-video-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleShare = async () => {
    if (!recordedVideo) return;
    const file = new File([recordedVideo], "cartoon-video.webm", { type: recordedVideo.type });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "مقطعي الكرتوني" });
      } else {
        await navigator.share({ title: "مقطعي الكرتوني", text: "شاهد مقطعي الكرتوني!" });
      }
    } catch {
      /* المستخدم ألغى المشاركة */
    }
  };

  const handleNew = () => {
    reset();
    navigate({ to: "/" });
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-black text-foreground">مقطعك جاهز! 🎉</h1>
        <p className="mt-2 text-lg font-semibold text-muted-foreground">
          شاهده، حمّله على جهازك، أو صوّر مقطعًا جديدًا.
        </p>

        <div className="mt-8 overflow-hidden rounded-3xl border-4 border-secondary bg-card shadow-xl">
          {url ? (
            <video src={url} controls playsInline className="h-auto w-full bg-black" />
          ) : (
            <div className="flex h-64 items-center justify-center font-bold text-muted-foreground">
              جاري تجهيز المقطع…
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-xl font-black text-primary-foreground shadow-lg transition hover:brightness-105"
          >
            <Download className="size-6" />
            تحميل المقطع
          </button>
          {canShare && (
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-full bg-sunny px-8 py-4 text-xl font-black text-sunny-foreground shadow-lg transition hover:brightness-105"
            >
              <Share2 className="size-6" />
              مشاركة
            </button>
          )}
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-8 py-4 text-xl font-black text-secondary-foreground shadow-lg transition hover:brightness-105"
          >
            <RotateCcw className="size-6" />
            تصوير جديد
          </button>
        </div>
      </div>
    </main>
  );
}
