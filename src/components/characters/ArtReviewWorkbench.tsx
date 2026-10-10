import { useEffect, useRef, useState } from "react";
import {
  ART_REVIEW_CRITERIA, ART_REVIEW_GRADES, ART_REVIEW_SHOTS,
  artReviewSourceKey, artReviewStorageKey, completedArtReviewCount,
  emptyArtReview, parseArtReview,
  type ArtReviewCriterion, type ArtReviewGrade, type ArtReviewRecord,
} from "@/lib/artReview";
import type { CharacterDefinition } from "@/lib/characterLibrary";
import type { CameraFraming, ReviewCameraAngle } from "@/lib/cameraComposition";
import type { LightingStyle } from "@/lib/studioLighting";
import type { AvatarDiagnostics } from "@/lib/modelPresentation";
import { REVIEW_STUDIO_GRADIENTS } from "@/lib/reviewBackdrops";

type Props = {
  character: CharacterDefinition;
  diagnostics: AvatarDiagnostics | null;
  getCanvas: () => HTMLCanvasElement | null;
  framing: CameraFraming;
  lighting: LightingStyle;
  angle: ReviewCameraAngle;
  setFraming: (value: CameraFraming) => void;
  setLighting: (value: LightingStyle) => void;
  setAngle: (value: ReviewCameraAngle) => void;
  prepareNeutralReview: () => void;
};

/** Capture a user-approved still only from the currently mounted genuine WebGL canvas. */
function drawFrame(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, frame: number) {
  if (!source.width || !source.height) throw new Error("المعاينة ثلاثية الأبعاد غير جاهزة.");
  const shot = ART_REVIEW_SHOTS[frame];
  if (!shot) throw new Error("زاوية مراجعة غير صالحة.");
  const width = 320, height = 330, header = 44, imageHeight = height - header;
  const x = (frame % 3) * width;
  const y = Math.floor(frame / 3) * height;
  const gradient = ctx.createLinearGradient(x, y + header, x + width, y + height);
  const stops = REVIEW_STUDIO_GRADIENTS[shot.lighting];
  gradient.addColorStop(0, stops.start);
  gradient.addColorStop(1, stops.end);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y + header, width, imageHeight);
  const targetAspect = width / imageHeight;
  const sourceAspect = source.width / source.height;
  const cropWidth = sourceAspect > targetAspect ? source.height * targetAspect : source.width;
  const cropHeight = sourceAspect > targetAspect ? source.height : source.width / targetAspect;
  ctx.drawImage(source, (source.width - cropWidth) / 2, (source.height - cropHeight) / 2,
    cropWidth, cropHeight, x, y + header, width, imageHeight);
  ctx.fillStyle = "#152237";
  ctx.fillRect(x, y, width, header);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 18px sans-serif";
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillText(shot.label, x + width - 14, y + 28);
}

export default function ArtReviewWorkbench({
  character, diagnostics, getCanvas,
  framing, lighting, angle, setFraming, setLighting, setAngle, prepareNeutralReview,
}: Props) {
  const sourceKey = artReviewSourceKey(character);
  const storageKey = artReviewStorageKey(character.id);
  const [record, setRecord] = useState<ArtReviewRecord>(() => emptyArtReview(sourceKey));
  const [sheet, setSheet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const generation = useRef(0);

  useEffect(() => {
    generation.current++;
    setSheet(null);
    setError("");
    try {
      setRecord(parseArtReview(localStorage.getItem(storageKey), sourceKey));
      setStorageError("");
    } catch {
      setRecord(emptyArtReview(sourceKey));
      setStorageError("لم يمكن قراءة تقييم الجودة السابق من ذاكرة هذا المتصفح.");
    }
    return () => { generation.current++; };
  }, [sourceKey, storageKey]);

  const update = (next: ArtReviewRecord) => {
    setRecord(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError("لم يمكن حفظ التقييم محليًا؛ التغييرات الحالية ستضيع عند إغلاق الصفحة.");
    }
  };

  const setGrade = (criterion: ArtReviewCriterion, grade: ArtReviewGrade) =>
    update({ ...record, grades: { ...record.grades, [criterion]: grade } });

  const takeContactSheet = async () => {
    if (busy || diagnostics?.status !== "ready") return;
    const token = ++generation.current;
    const old = { framing, lighting, angle };
    setBusy(true);
    setError("");
    setSheet(null);
    try {
      prepareNeutralReview();
      const output = document.createElement("canvas");
      output.width = 960;
      output.height = 660;
      const ctx = output.getContext("2d");
      if (!ctx) throw new Error("لا يدعم المتصفح إنشاء لوحة مقارنة.");
      for (let index = 0; index < ART_REVIEW_SHOTS.length; index++) {
        if (generation.current !== token) return;
        const shot = ART_REVIEW_SHOTS[index]!;
        setFraming(shot.framing);
        setLighting(shot.lighting);
        setAngle(shot.angle);
        // React and the live R3F camera must commit before reading pixels.
        await new Promise<void>((resolve) => window.setTimeout(resolve, 460));
        if (generation.current !== token) return;
        const source = getCanvas();
        if (!source) throw new Error("تعذر الوصول إلى نموذج WebGL الفعلي.");
        drawFrame(ctx, source, index);
      }
      if (generation.current !== token) return;
      const preview = output.toDataURL("image/webp", 0.85);
      if (!preview.startsWith("data:image/webp;base64,") || preview.length > 10_000_000) {
        throw new Error("تعذر حفظ لوحة المقارنة بتنسيق WebP.");
      }
      setSheet(preview);
    } catch (caught) {
      if (generation.current === token)
        setError(caught instanceof Error ? caught.message : "فشل التقاط لقطات النموذج.");
    } finally {
      if (generation.current === token) {
        setFraming(old.framing);
        setLighting(old.lighting);
        setAngle(old.angle);
        setBusy(false);
      }
    }
  };

  const downloadSheet = () => {
    if (!sheet) return;
    const element = document.createElement("a");
    element.href = sheet;
    element.download = "cam-cartoons-art-review-" + character.id.replace(/[^a-zA-Z0-9-]/g, "") + ".webp";
    element.click();
  };

  const reviewed = completedArtReviewCount(record);
  return (
    <section aria-labelledby="art-review-heading" className="rounded-2xl border border-border bg-muted/30 p-4">
      <h3 id="art-review-heading" className="text-base font-black">لوحة المراجعة الفنية للشخصية</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        التقط ست صور حقيقية من مجسم GLB نفسه: الوجه من ثلاث زوايا بإضاءة ناعمة،
        ثم الجزء العلوي والملابس من الزوايا نفسها بإضاءة طبيعية.
        الصور لا تنشئ تفاصيل هندسية جديدة ولا تغيّر بيانات الشخصية.
      </p>
      <button type="button" onClick={() => void takeContactSheet()}
        disabled={busy || diagnostics?.status !== "ready"}
        className="mt-3 rounded-full border border-primary px-4 py-2 text-sm font-bold text-foreground disabled:opacity-40">
        {busy ? "جارٍ التقاط المقارنة..." : "إنشاء لوحة مقارنة حقيقية (6 زوايا)"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      {sheet && <div className="mt-3 space-y-3">
        <img src={sheet} alt={"ست لقطات حقيقية للوجه والملابس للشخصية " + character.name}
          className="w-full rounded-xl border border-border" />
        <button type="button" onClick={downloadSheet}
          className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          حفظ لوحة المقارنة WebP
        </button>
      </div>}
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm font-black">تقييم فني يدوي — {reviewed} من 4 عناصر تمت مراجعتها</p>
        <p className="mt-1 text-xs text-muted-foreground">اختر تقييمًا لكل عنصر بعد رؤية اللقطات. هذه آراء فنية محفوظة على هذا الجهاز، وليست تقييمًا آليًا أو شهادة مطابقة.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {ART_REVIEW_CRITERIA.map(({ id, label, hint }) => <label key={id} className="block rounded-xl border border-border bg-background p-3">
            <span className="text-sm font-black">{label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
            <select aria-label={"تقييم " + label} value={record.grades[id]}
              onChange={(event) => setGrade(id, event.target.value as ArtReviewGrade)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm">
              {(Object.entries(ART_REVIEW_GRADES) as [ArtReviewGrade, string][]).map(([value, text]) =>
                <option key={value} value={value}>{text}</option>)}
            </select>
          </label>)}
        </div>
        <label className="mt-3 block text-sm font-black" htmlFor={"art-review-notes-" + character.id}>ملاحظات الفنان أو المراجع</label>
        <textarea id={"art-review-notes-" + character.id} aria-label="ملاحظات الجودة الفنية"
          value={record.notes} maxLength={600} rows={3}
          onChange={(event) => update({ ...record, notes: event.target.value.slice(0, 600) })}
          placeholder="مثلًا: حواف الشعر خشنة في الجانب، تفاصيل العين تحتاج تحسين..."
          className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm" />
        {storageError && <p role="alert" className="mt-2 text-xs text-destructive">{storageError}</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          إذا تغيّر ملف GLB أو نسخته المحلية، يبدأ تقييم جديد حتى لا يُعتمد نموذج مختلف استنادًا إلى تقييم قديم.
        </p>
      </div>
    </section>
  );
}
