import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Camera, CheckCircle2, ExternalLink, Film, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import CharacterStage from "@/components/characters/CharacterStage";
import { useCharacterLibrary } from "@/lib/characterLibrary";
import { useStudioStore } from "@/lib/store";
import { FRAMING_LABELS, type CameraFraming } from "@/lib/cameraComposition";
import { LIGHTING_LABELS, type LightingStyle } from "@/lib/studioLighting";
import { assessAnimationReadiness, type AvatarDiagnostics } from "@/lib/modelPresentation";

export const Route = createFileRoute("/customize")({
  head: () => ({
    meta: [
      { title: "معاينة مجسم GLB الأصلي — Cam Cartoons Studio" },
      { name: "description", content: "معاينة الإضاءة والتأطير لمجسم الشخصية ثلاثي الأبعاد الأصلي دون التحويل إلى رسومات هندسية." },
    ],
  }),
  component: CustomizePage,
});

function CustomizePage() {
  const navigate = useNavigate();
  const id = useStudioStore((state) => state.selectedCharacter);
  const character = useCharacterLibrary((state) => state.characters.find((entry) => entry.id === id));
  const [lighting, setLighting] = useState<LightingStyle>("cinematic");
  const [framing, setFraming] = useState<CameraFraming>("upper");
  const [diagnostics, setDiagnostics] = useState<AvatarDiagnostics | null>(null);

  useEffect(() => {
    if (!character) navigate({ to: "/" });
  }, [character, navigate]);

  useEffect(() => {
    setDiagnostics(null);
    setFraming(character?.preferredFraming ?? "upper");
  }, [character?.id, character?.preferredFraming]);

  if (!character || !id) return null;
  const readiness = assessAnimationReadiness(diagnostics);

  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-black text-accent-foreground">
              <Film className="size-4" /> مجسمات GLB أصلية
            </span>
            <h1 className="mt-3 text-3xl font-black text-foreground">معاينة وتطوير {character.name}</h1>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              يتم عرض النموذج الأصلي بخاماته وهندسته؛ لا يوجد وضع كرتوني هندسي أو تحويل تلقائي يقلل دقته.
            </p>
          </div>
          <button type="button" onClick={() => navigate({ to: "/" })}
            className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-3 font-black">
            <ArrowRight className="size-5" /> العودة إلى مكتبة الشخصيات
          </button>
        </header>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <section className="overflow-hidden rounded-3xl border-2 border-border bg-card shadow-xl">
            <div className="h-[500px] sm:h-[630px]">
              <CharacterStage type={id} animation="idle" spin={false}
                framing={framing} lighting={lighting} onDiagnostics={setDiagnostics} />
            </div>
            <div className="border-t border-border p-5">
              <h2 className="text-lg font-black">معاينة مباشرة للنموذج الأصلي</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                التغييرات التالية تخص التصوير والإضاءة فقط، ولا تستبدل الجلد أو الشعر أو الملابس.
              </p>
            </div>
          </section>
          <section className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-5">
              <h2 className="text-xl font-black">تكوين الصورة</h2>
              <p className="mt-3 text-sm font-bold">الإضاءة</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(LIGHTING_LABELS) as LightingStyle[]).map((value) =>
                  <button key={value} type="button" aria-pressed={lighting === value}
                    onClick={() => setLighting(value)}
                    className={"rounded-xl border px-3 py-3 text-sm font-bold " +
                      (lighting === value ? "border-primary bg-primary/10" : "border-border bg-background")}>
                    {LIGHTING_LABELS[value]}
                  </button>)}
              </div>
              <p className="mt-4 text-sm font-bold">التأطير</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(Object.keys(FRAMING_LABELS) as CameraFraming[]).map((value) =>
                  <button key={value} type="button" aria-pressed={framing === value}
                    onClick={() => setFraming(value)}
                    className={"rounded-xl border px-2 py-3 text-xs font-bold " +
                      (framing === value ? "border-primary bg-primary/10" : "border-border bg-background")}>
                    {FRAMING_LABELS[value]}
                  </button>)}
              </div>
              <button type="button" onClick={() => { setLighting("cinematic"); setFraming(character.preferredFraming ?? "upper"); }}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-bold">
                <RotateCcw className="size-4" /> إعادة إعدادات المعاينة
              </button>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <h2 className="text-xl font-black">فحص الملف الأصلي</h2>
              {!diagnostics && <p className="mt-2 text-sm text-muted-foreground">جارٍ تحميل المجسم الأصلي وتحليل قدراته…</p>}
              {diagnostics?.status === "error" && <p role="alert" className="mt-2 text-sm text-destructive">
                تعذر تحميل ملف GLB: {diagnostics.message}
              </p>}
              {diagnostics?.status === "ready" && <div className="mt-3 space-y-2 text-sm">
                <p className="flex items-center gap-2 font-black"><CheckCircle2 className="size-4 text-primary" /> {readiness.title}</p>
                <p>المجسمات: {diagnostics.meshCount ?? 0} · العظام: {diagnostics.boneCount ?? 0}</p>
                <p>تعابير الوجه: {diagnostics.morphCount ?? 0} · خرائط الخامات: {diagnostics.textureCount ?? 0}</p>
              </div>}
              <p className="mt-3 text-xs text-muted-foreground">
                تعديل هندسة الشعر والوجه والملابس يتطلب تحرير أصل GLB ثم إعادة استيراده، وليس استخدام أزرار ألوان وهمية.
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <h2 className="text-lg font-black">خيارات العمل</h2>
              <div className="mt-3 grid gap-2">
                <button type="button" onClick={() => navigate({ to: "/" })}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-black text-primary-foreground">
                  <ExternalLink className="size-4" /> تعديل ملف الشخصية أو استيراد GLB
                </button>
                <button type="button" onClick={() => navigate({ to: "/story" })}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 font-black">
                  <Camera className="size-4" /> الذهاب إلى القصة
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
