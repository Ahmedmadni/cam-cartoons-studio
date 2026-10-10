import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Camera, Edit3, Heart, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import CharacterStage from "@/components/characters/CharacterStage";
import {
  CHARACTER_CATEGORIES, PROVIDER_LABELS, useCharacterLibrary,
  type CharacterDefinition, type CharacterDraft, type CharacterCategory, type CharacterProvider,
} from "@/lib/characterLibrary";
import { useStudioStore, VOICES, ANIMATION_LABELS, type AnimationType, type VoiceType } from "@/lib/store";
import { assessAnimationReadiness, type AvatarDiagnostics } from "@/lib/modelPresentation";
import { cacheRemoteGlb, deleteGlbAsset, saveGlbAsset, MAX_GLB_BYTES } from "@/lib/localGlbStorage";
import { probeRemoteGlb } from "@/lib/glbSourceProbe";
import { FRAMING_LABELS, REVIEW_ANGLE_LABELS, type CameraFraming, type ReviewCameraAngle } from "@/lib/cameraComposition";
import { LIGHTING_LABELS, type LightingStyle } from "@/lib/studioLighting";
import { describeSurfaceLimitations } from "@/lib/avatarSurfaceQuality";
import { REVIEW_BACKDROPS, REVIEW_STUDIO_GRADIENTS, type ReviewBackdropId } from "@/lib/reviewBackdrops";
import { REVIEW_EXPRESSION_LABELS, type ReviewExpression } from "@/lib/facialPerformance";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "مكتبة الشخصيات — Cam Cartoons Studio" },
    { name: "description", content: "استوديو مفتوح لشخصيات Premium GLB وReady Player Me مع تخصيص كل شخصية." },
  ] }),
  component: LibraryPage,
});

const emptyDraft: CharacterDraft = {
  name: "", category: "other", provider: "imported-glb", modelUrl: "", thumbnail: "",
  voicePreset: "normal", tags: [], basePreset: "man", scale: 1.02, yOffset: -1.62,
  preferredFraming: "upper",
};

function Editor({ initial, onClose, onSave }: {
  initial?: CharacterDefinition | undefined;
  onClose: () => void;
  onSave: (draft: CharacterDraft, file: File | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CharacterDraft>(() => initial ? {
    name: initial.name, category: initial.category, provider: initial.provider,
    modelUrl: initial.modelUrl ?? "", assetId: initial.assetId, thumbnail: initial.thumbnail ?? "",
    voicePreset: initial.voicePreset ?? "normal", tags: initial.tags,
    basePreset: initial.basePreset ?? "man", scale: initial.scale ?? 1.02,
    yOffset: initial.yOffset ?? -1.62,
    preferredFraming: initial.preferredFraming ?? "upper",
  } : { ...emptyDraft });
  const [tags, setTags] = useState(initial?.tags.join("، ") ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const patch = (change: Partial<CharacterDraft>) => setDraft((current) => ({ ...current, ...change }));
  const inputClass = "mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 font-semibold text-foreground outline-none focus:border-primary";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="editor-title" dir="rtl"
        className="max-h-full w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 id="editor-title" className="text-2xl font-black text-foreground">{initial ? "تعديل الشخصية" : "إضافة شخصية GLB"}</h2>
          <button type="button" disabled={saving} onClick={onClose} aria-label="إغلاق"><X className="size-6" /></button>
        </div>
        <form className="mt-4 space-y-3" onSubmit={(event) => {
          event.preventDefault();
          if (saving) return;
          setSaving(true);
          setError("");
          void onSave({ ...draft, tags: tags.split(/[,،]/).map((tag) => tag.trim()).filter(Boolean) }, file)
            .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "تعذّر الحفظ."))
            .finally(() => setSaving(false));
        }}>
          <label htmlFor="character-editor-name" className="block text-sm font-bold">اسم الشخصية
            <input id="character-editor-name" required maxLength={80} className={inputClass} value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold">المصدر
              <select className={inputClass} value={draft.provider} onChange={(e) => patch({ provider: e.target.value as CharacterProvider })}>
                {Object.entries(PROVIDER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold">التصنيف
              <select className={inputClass} value={draft.category} onChange={(e) => patch({ category: e.target.value as CharacterCategory })}>
                {CHARACTER_CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          {draft.provider !== "procedural" && <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-3">
            <label className="block text-sm font-black text-foreground">
              استيراد شخصية 3D من جهازك — GLB
              <input type="file" accept=".glb,model/gltf-binary" className={inputClass}
                onChange={(e) => {
                  const chosen = e.target.files?.[0] ?? null;
                  setFile(chosen);
                  if (chosen) patch({ assetId: undefined, modelUrl: "" });
                }} />
            </label>
            {file && <p className="text-xs font-bold text-primary">
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>}
            {!file && draft.assetId && <p className="text-xs font-bold text-primary">
              النموذج محفوظ داخل هذا المتصفح. يمكنك استبداله بملف جديد.
            </p>}
            <p className="text-xs font-semibold text-muted-foreground">
              يقبل ملف GLB 2.0 حتى {(MAX_GLB_BYTES / 1024 / 1024).toFixed(0)} ميجابايت ويخزّنه على هذا الجهاز دون رفعه لخادم.
            </p>
            <label className="block text-sm font-bold">أو رابط GLB مباشر (HTTPS أو مسار محلي)
              <input dir="ltr" className={inputClass} value={draft.modelUrl ?? ""}
                onChange={(e) => {
                  setFile(null);
                  patch({ modelUrl: e.target.value, assetId: undefined });
                }}
                placeholder="https://example.com/avatar.glb" />
            </label>
          </div>}
          <label className="block text-sm font-bold">رابط صورة المعاينة (اختياري)
            <input dir="ltr" className={inputClass} value={draft.thumbnail ?? ""} onChange={(e) => patch({ thumbnail: e.target.value })}
              placeholder="https://example.com/avatar.webp" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold">الصوت
              <select className={inputClass} value={draft.voicePreset ?? "normal"} onChange={(e) => patch({ voicePreset: e.target.value as VoiceType })}>
                {VOICES.map((voice) => <option key={voice} value={voice}>{voice}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold">شكل احتياطي
              <select className={inputClass} value={draft.basePreset ?? "man"} onChange={(e) => patch({ basePreset: e.target.value as CharacterDraft["basePreset"] })}>
                <option value="boy">ولد</option><option value="girl">بنت</option>
                <option value="man">شاب</option><option value="woman">فتاة</option>
              </select>
            </label>
          </div>
          {draft.provider !== "procedural" && <label className="block text-sm font-bold">
            لقطة المعاينة الافتراضية
            <select className={inputClass} value={draft.preferredFraming ?? "upper"}
              onChange={(e) => patch({ preferredFraming: e.target.value as CameraFraming })}>
              {Object.entries(FRAMING_LABELS).map(([framing, label]) =>
                <option key={framing} value={framing}>{label}</option>)}
            </select>
            <span className="mt-1 block text-xs text-muted-foreground">للصور وبطاقات المكتبة؛ لا يغيّر كاميرا القصص.</span>
          </label>}
          {draft.provider !== "procedural" && <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold">المقياس
              <input type="number" className={inputClass} min={0.1} max={4} step={0.01}
                value={draft.scale ?? 1.02} onChange={(e) => patch({ scale: Number(e.target.value) })} />
            </label>
            <label className="text-sm font-bold">الإزاحة الرأسية
              <input type="number" className={inputClass} min={-5} max={5} step={0.01}
                value={draft.yOffset ?? -1.62} onChange={(e) => patch({ yOffset: Number(e.target.value) })} />
            </label>
          </div>}
          <label className="block text-sm font-bold">وسوم (مفصولة بفاصلة)
            <input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="سينمائي، قصص، أطفال" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-bold text-destructive">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" disabled={saving} onClick={onClose} className="rounded-full bg-muted px-5 py-3 font-bold">إلغاء</button>
            <button type="submit" disabled={saving} className="rounded-full bg-primary px-6 py-3 font-black text-primary-foreground disabled:opacity-50">{saving ? "جارٍ حفظ ملف الشخصية..." : "حفظ الشخصية"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function LibraryPage() {
  const navigate = useNavigate();
  const characters = useCharacterLibrary((s) => s.characters);
  const addCharacter = useCharacterLibrary((s) => s.addCharacter);
  const updateCharacter = useCharacterLibrary((s) => s.updateCharacter);
  const deleteCharacter = useCharacterLibrary((s) => s.deleteCharacter);
  const toggleFavorite = useCharacterLibrary((s) => s.toggleFavorite);
  const selectedCharacter = useStudioStore((s) => s.selectedCharacter);
  const setSelectedCharacter = useStudioStore((s) => s.setSelectedCharacter);
  const setSelectedVoice = useStudioStore((s) => s.setSelectedVoice);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<CharacterDefinition | "new" | null>(null);
  const [diagnostics, setDiagnostics] = useState<AvatarDiagnostics | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [offlineSavingId, setOfflineSavingId] = useState<string | null>(null);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [reviewAnimation, setReviewAnimation] = useState<AnimationType>("idle");
  const [reviewSpin, setReviewSpin] = useState(false);
  const [reviewFraming, setReviewFraming] = useState<CameraFraming>("upper");
  const [reviewLighting, setReviewLighting] = useState<LightingStyle>("cinematic");
  const [reviewAngle, setReviewAngle] = useState<ReviewCameraAngle>("front");
  const [reviewBackdrop, setReviewBackdrop] = useState<ReviewBackdropId>("studio");
  const [previewSpeech, setPreviewSpeech] = useState(false);
  const [reviewExpression, setReviewExpression] = useState<ReviewExpression>("neutral");
  const [sourceProbe, setSourceProbe] = useState<{
    characterId: string; phase: "checking" | "success" | "error"; message: string;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    setDiagnostics(null);
    setCaptureError(null);
    setOfflineError(null);
    setReviewAnimation("idle");
    setReviewSpin(false);
    setReviewFraming(useCharacterLibrary.getState().characters
      .find((character) => character.id === selectedCharacter)?.preferredFraming ?? "upper");
    setReviewLighting("cinematic");
    setReviewAngle("front");
    setReviewBackdrop("studio");
    setPreviewSpeech(false);
    setReviewExpression("neutral");
    setSourceProbe(null);
    canvasRef.current = null;
  }, [selectedCharacter]);
  const selected = characters.find((item) => item.id === selectedCharacter);
  const readiness = assessAnimationReadiness(diagnostics);
  const filters = [
    { value: "all", label: "الكل" }, { value: "imported-glb", label: "Premium GLB" },
    { value: "readyplayerme", label: "Ready Player Me" }, { value: "favorites", label: "المفضلة" },
    ...CHARACTER_CATEGORIES, { value: "procedural", label: "المدمجة" },
  ];
  const visible = useMemo(() => characters.filter((item) => {
    const matchesFilter = filter === "all" || (filter === "favorites" ? item.isFavorite :
      item.provider === filter || item.category === filter);
    const q = search.trim().toLocaleLowerCase();
    return matchesFilter && (!q || [item.name, ...item.tags, item.provider].some((s) => s.toLocaleLowerCase().includes(q)));
  }).sort((a, b) => Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite)) ||
    Number(b.provider === "imported-glb") - Number(a.provider === "imported-glb")), [characters, filter, search]);

  const captureThumbnail = (silent = false) => {
    if (!selected) return;
    try {
      const source = canvasRef.current;
      if (!source || !source.width || !source.height) throw new Error("المعاينة لم تجهز بعد.");
      const output = document.createElement("canvas");
      output.width = 480;
      output.height = 360;
      const ctx = output.getContext("2d");
      if (!ctx) throw new Error("تعذر تجهيز صورة المعاينة.");
      const gradient = ctx.createLinearGradient(0, 0, 480, 360);
      gradient.addColorStop(0, REVIEW_STUDIO_GRADIENTS[reviewLighting].start);
      gradient.addColorStop(1, REVIEW_STUDIO_GRADIENTS[reviewLighting].end);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 480, 360);
      const srcRatio = source.width / source.height;
      const cropW = srcRatio > 4 / 3 ? source.height * 4 / 3 : source.width;
      const cropH = srcRatio > 4 / 3 ? source.height : source.width * 3 / 4;
      ctx.drawImage(source, (source.width - cropW) / 2, (source.height - cropH) / 2,
        cropW, cropH, 0, 0, 480, 360);
      const image = output.toDataURL("image/webp", 0.72);
      if (!image.startsWith("data:image/webp;base64,") || image.length > 300000) {
        throw new Error("صورة المعاينة كبيرة جدًا أو الصيغة غير مدعومة.");
      }
      const { id: _id, isFavorite: _favorite, isDefault: _default, ...draft } = selected;
      updateCharacter(selected.id, { ...draft, thumbnail: image });
      setCaptureError(null);
    } catch (error) {
      if (!silent) setCaptureError(error instanceof Error ? error.message : "تعذر التقاط صورة المعاينة.");
    }
  };

  // Build a real model-specific portrait after the 3D stage has fully loaded.
  // The model stays as an emoji placeholder only if WebGL/CORS capture fails.
  useEffect(() => {
    if (!selected || selected.provider === "procedural" || selected.thumbnail || diagnostics?.status !== "ready") return;
    const timer = window.setTimeout(() => captureThumbnail(true), 1400);
    return () => window.clearTimeout(timer);
    // The store update from capture adds thumbnail, which stops re-captures.
  }, [selected?.id, selected?.thumbnail, selected?.provider, diagnostics?.status]);

  const saveOffline = async (item: CharacterDefinition) => {
    if (!item.modelUrl || item.assetId || offlineSavingId) return;
    setOfflineError(null);
    setOfflineSavingId(item.id);
    let copiedAsset: string | null = null;
    try {
      copiedAsset = await cacheRemoteGlb(item.modelUrl);
      const { id: _id, isDefault: _default, isFavorite: _favorite, ...draft } = item;
      updateCharacter(item.id, { ...draft, assetId: copiedAsset });
      copiedAsset = null;
    } catch (error) {
      if (copiedAsset) await deleteGlbAsset(copiedAsset).catch(() => {});
      setOfflineError(error instanceof Error ? error.message : "تعذر حفظ النسخة المحلية.");
    } finally {
      setOfflineSavingId(null);
    }
  };

  const checkSource = async (item: CharacterDefinition) => {
    if (!item.modelUrl || item.assetId) return;
    setSourceProbe({ characterId: item.id, phase: "checking", message: "جارٍ التحقق من المصدر وCORS..." });
    try {
      const result = await probeRemoteGlb(item.modelUrl);
      setSourceProbe({
        characterId: item.id, phase: "success",
        message: "المصدر متاح من هذا المتصفح ويعيد GLB 2.0 (" +
          (result.declaredBytes / 1024 / 1024).toFixed(2) + " ميجابايت).",
      });
    } catch (error) {
      setSourceProbe({
        characterId: item.id, phase: "error",
        message: error instanceof Error ? error.message : "تعذر فحص رابط الشخصية.",
      });
    }
  };

  const choose = (item: CharacterDefinition) => {
    setSelectedCharacter(item.id);
    if (item.voicePreset) setSelectedVoice(item.voicePreset);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-black"><Sparkles className="size-4" /> Cam Cartoons Studio</span>
            <h1 className="mt-3 text-3xl font-black sm:text-5xl">مكتبة الشخصيات المفتوحة</h1>
            <p className="mt-2 max-w-xl font-semibold text-muted-foreground">شخصيات GLB احترافية متعددة ومفضلة ووسوم وتصنيفات، بعيدًا عن قيد الأربع شخصيات.</p>
          </div>
          <button type="button" onClick={() => setEditor("new")}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-4 font-black text-primary-foreground shadow-lg">
            <Plus className="size-5" /> إضافة شخصية
          </button>
        </header>
        <section className="mt-7 rounded-3xl border border-border bg-card p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-3 size-5 text-muted-foreground" />
            <input type="search" aria-label="البحث عن شخصية" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الوسوم..." className="w-full rounded-2xl border border-border bg-background py-3 pl-4 pr-12 outline-none focus:border-primary" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map(({ value, label }) => <button type="button" key={value} onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={"rounded-full px-4 py-2 text-sm font-bold " + (filter === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {label}
            </button>)}
          </div>
          <p className="mt-3 text-sm font-semibold text-muted-foreground">{visible.length} من {characters.length} شخصية</p>
        </section>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => <article key={item.id} className={"overflow-hidden rounded-3xl border-2 bg-card shadow-sm " +
            (selectedCharacter === item.id ? "border-primary ring-2 ring-primary/20" : "border-border")}>
            <button type="button" onClick={() => choose(item)} aria-pressed={selectedCharacter === item.id} className="w-full text-right">
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-muted to-secondary/20">
                {item.thumbnail ? <img src={item.thumbnail} alt={"معاينة " + item.name} loading="lazy" className="h-full w-full object-cover" />
                  : <span className="text-7xl" aria-hidden>{item.provider === "imported-glb" ? "🎬" : item.basePreset === "boy" ? "👦" : item.basePreset === "girl" ? "👧" : item.basePreset === "woman" ? "👩" : "👨"}</span>}
                <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2 py-1 text-xs font-black">{PROVIDER_LABELS[item.provider]}</span>
              </div>
              <div className="px-4 pt-3">
                <h2 className="truncate text-xl font-black">{item.name}</h2>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {CHARACTER_CATEGORIES.find((c) => c.value === item.category)?.label ?? "أخرى"} · {item.voicePreset ?? "normal"}
                </p>
                <p className="mt-2 min-h-5 truncate text-xs text-muted-foreground">{item.tags.join(" · ") || "بدون وسوم"}</p>
              </div>
            </button>
            <div className="flex items-center justify-between px-3 pb-3 pt-2">
              <button type="button" onClick={() => toggleFavorite(item.id)} aria-pressed={Boolean(item.isFavorite)}
                aria-label={item.isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"} className="rounded-full p-2 hover:bg-muted">
                <Heart className={"size-5 " + (item.isFavorite ? "fill-red-500 text-red-500" : "")} />
              </button>
              <div className="flex gap-1">
                <button type="button" aria-label={"تعديل " + item.name} onClick={() => setEditor(item)} className="rounded-full p-2 hover:bg-muted"><Edit3 className="size-5" /></button>
                <button type="button" aria-label={"حذف " + item.name} onClick={() => {
                  if (!window.confirm("حذف الشخصية " + item.name + " من المكتبة؟")) return;
                  deleteCharacter(item.id);
                  if (item.assetId) void deleteGlbAsset(item.assetId).catch(() => {
                    setCaptureError("تم حذف الشخصية، لكن تعذر حذف ملفها المحلي من مساحة الجهاز.");
                  });
                  if (selectedCharacter === item.id) setSelectedCharacter("");
                }} className="rounded-full p-2 text-destructive hover:bg-destructive/10"><Trash2 className="size-5" /></button>
              </div>
            </div>
          </article>)}
        </div>
        {visible.length === 0 && <p className="mt-8 rounded-3xl border border-dashed border-border p-8 text-center font-bold">
          لا توجد شخصيات مطابقة. استخدم «إضافة شخصية» أو غيّر البحث والتصفية.
        </p>}
        {selected && <section className="mt-8 grid gap-5 rounded-3xl border-2 border-primary/40 bg-card p-5 md:grid-cols-2">
          <div className="h-[420px] overflow-hidden rounded-2xl md:h-[540px]"
            style={{ background: REVIEW_STUDIO_GRADIENTS[reviewLighting].css }}>
            <CharacterStage type={selected.id} animation={reviewAnimation} spin={reviewSpin} previewSpeech={previewSpeech}
               framing={reviewFraming} lighting={reviewLighting} reviewAngle={reviewAngle} reviewMode reviewExpression={reviewExpression}
               backgroundUrl={REVIEW_BACKDROPS.find((item) => item.id === reviewBackdrop)?.url ?? ""}
              onCanvasReady={(canvas) => { canvasRef.current = canvas; }}
              onDiagnostics={setDiagnostics} />
          </div>
          <div className="flex flex-col justify-center gap-3">
            <h2 className="text-3xl font-black">{selected.name}</h2>
            <div className="rounded-2xl border border-border bg-muted/40 p-3">
              <p className="text-sm font-black">اختبار الشخصية قبل استخدامها</p>
              <p className="mt-1 text-xs text-muted-foreground">قارن ملامح الوجه والشعر والملابس من الأمام والجانب بإضاءة ثابتة؛ فنجاح العظام لا يعني الجودة الفنية.</p>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="إطار التصوير">
                {(Object.entries(FRAMING_LABELS) as [CameraFraming, string][]).map(([framing, label]) =>
                  <button key={framing} type="button" aria-pressed={reviewFraming === framing}
                    onClick={() => setReviewFraming(framing)}
                    className={"rounded-full px-3 py-2 text-xs font-bold " + (reviewFraming === framing
                      ? "bg-primary text-primary-foreground" : "bg-card text-foreground")}>
                    {label}
                  </button>)}
              </div>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="إضاءة المعاينة">
                {(Object.entries(LIGHTING_LABELS) as [LightingStyle, string][]).map(([lighting, label]) =>
                  <button key={lighting} type="button" aria-pressed={reviewLighting === lighting}
                    onClick={() => setReviewLighting(lighting)}
                    className={"rounded-full px-3 py-2 text-xs font-bold " + (reviewLighting === lighting
                      ? "bg-primary text-primary-foreground" : "bg-card text-foreground")}>
                    {label}
                  </button>)}
              </div>
              <p className="mt-3 text-xs font-black">زاوية مشاهدة ثابتة</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="زاوية المعاينة">
                {(Object.entries(REVIEW_ANGLE_LABELS) as [ReviewCameraAngle, string][]).map(([angle, label]) =>
                  <button key={angle} type="button" aria-pressed={reviewAngle === angle}
                    onClick={() => { setReviewSpin(false); setReviewAngle(angle); }}
                    className={"rounded-full px-3 py-2 text-xs font-bold " + (reviewAngle === angle
                      ? "bg-primary text-primary-foreground" : "bg-card text-foreground")}>
                    {label}
                  </button>)}
              </div>
              <label className="mt-2 block text-xs font-black" htmlFor="review-backdrop">خلفية المشهد</label>
              <select id="review-backdrop" value={reviewBackdrop}
                onChange={(event) => setReviewBackdrop(event.target.value as ReviewBackdropId)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold">
                {REVIEW_BACKDROPS.map((backdrop) => <option key={backdrop.id} value={backdrop.id}>{backdrop.label}</option>)}
              </select>
              <p className="mt-2 text-xs text-muted-foreground">يمكن التقاط صورة من النموذج الحقيقي بهذه الزاوية والخلفية. الصور المحلية لا تغير هندسة الشخصية أو خاماتها.</p>
              <p className="mt-3 text-xs font-black">تعابير الوجه (عند دعم النموذج)</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="تعابير الوجه">
                {(Object.entries(REVIEW_EXPRESSION_LABELS) as [ReviewExpression, string][]).map(([expression, label]) => {
                  const supported = expression === "neutral" || (diagnostics?.status === "ready" && (
                    expression === "smile" ? diagnostics.hasSmile :
                      expression === "surprise" ? (diagnostics.hasBrowUp || diagnostics.hasLipSync) :
                        diagnostics.hasHeadRig
                  ));
                  return <button key={expression} type="button" disabled={!supported}
                    aria-pressed={reviewExpression === expression}
                    onClick={() => { setReviewExpression(expression); setReviewAnimation("idle"); setPreviewSpeech(false); setReviewSpin(false); }}
                    className={"rounded-full px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 " + (reviewExpression === expression
                      ? "bg-primary text-primary-foreground" : "bg-card text-foreground")}>
                    {label}
                  </button>;
                })}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">هذه تجربة تعابير من Morph Targets وعظام النموذج الحقيقي وليست مزامنة شفاه مع صوت عربي.</p>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="حركات فحص الشخصية">
                {(["idle", "wave", "happy", "nod", "dance"] as AnimationType[]).map((animation) =>
                  <button key={animation} type="button" aria-pressed={reviewAnimation === animation}
                    onClick={() => setReviewAnimation(animation)}
                    className={"rounded-full px-3 py-2 text-xs font-bold " + (reviewAnimation === animation
                      ? "bg-primary text-primary-foreground" : "bg-card text-foreground")}>
                    {ANIMATION_LABELS[animation]}
                  </button>)}
                <button type="button" aria-pressed={previewSpeech}
                  disabled={diagnostics?.status !== "ready" || !diagnostics.hasLipSync}
                  onClick={() => { setReviewExpression("neutral"); setPreviewSpeech(!previewSpeech); }}
                  className={"rounded-full border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 " + (previewSpeech
                    ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
                  {previewSpeech ? "إيقاف تجربة الفم" : "تجربة حركة الفم"}
                </button>
                <button type="button" aria-pressed={reviewSpin} onClick={() => setReviewSpin(!reviewSpin)}
                  className={"rounded-full border px-3 py-2 text-xs font-bold " + (reviewSpin
                    ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
                  {reviewSpin ? "إيقاف الدوران" : "تدوير الشخصية"}
                </button>
              </div>
            </div>
            <p className="font-semibold text-muted-foreground">معاينة مباشرة داخل الاستوديو — {PROVIDER_LABELS[selected.provider]}</p>
            {selected.provider === "imported-glb" && (
              <div className="rounded-2xl border border-border bg-muted/40 p-3 text-sm">
                {selected.assetId ? (
                  <p className="font-bold text-primary">هذا النموذج محفوظ فعليًا داخل متصفحك، ويمكن عرضه دون إعادة تنزيله من المصدر.</p>
                ) : selected.modelUrl ? (
                  <>
                    <p className="font-semibold text-muted-foreground">هذا النموذج مستضاف خارجيًا؛ يمكنك الاحتفاظ بنسخة محلية داخل التطبيق.</p>
                    <button type="button" disabled={Boolean(offlineSavingId)}
                      onClick={() => void saveOffline(selected)}
                      className="mt-2 rounded-full bg-primary px-5 py-3 font-black text-primary-foreground disabled:opacity-50">
                      {offlineSavingId === selected.id ? "جارٍ تنزيل وحفظ GLB..." : "حفظ الشخصية على هذا الجهاز"}
                    </button>
                    <button type="button"
                      disabled={sourceProbe?.characterId === selected.id && sourceProbe.phase === "checking"}
                      onClick={() => void checkSource(selected)}
                      className="mt-2 mr-2 rounded-full border border-primary px-4 py-2 font-bold text-foreground disabled:opacity-50">
                      فحص رابط GLB وCORS
                    </button>
                    {sourceProbe?.characterId === selected.id &&
                      <p role="status" className={"mt-2 font-bold " + (sourceProbe.phase === "error"
                        ? "text-destructive" : "text-primary")}>{sourceProbe.message}</p>}
                  </>
                ) : <p className="text-muted-foreground">لا يوجد ملف GLB لهذا النموذج.</p>}
                {offlineError && <p role="alert" className="mt-2 font-bold text-destructive">{offlineError}</p>}
              </div>
            )}
            <button type="button" onClick={() => captureThumbnail()}
              disabled={selected.provider !== "procedural" && diagnostics?.status !== "ready"}
              className="rounded-full border-2 border-primary px-6 py-3 font-bold text-foreground disabled:cursor-not-allowed disabled:opacity-40">
              التقاط صورة معاينة من النموذج
            </button>
            {captureError && <p role="alert" className="text-sm font-bold text-destructive">{captureError}</p>}
            {selected.provider !== "procedural" && <div className="rounded-2xl border border-border bg-background p-4 text-sm">
              <h3 className="font-black">تقرير جاهزية نموذج GLB</h3>
              {!diagnostics && <p className="mt-2 text-muted-foreground">جارٍ فحص النموذج وتحميله...</p>}
              {diagnostics?.status === "error" && <p role="alert" className="mt-2 text-destructive">
                تعذر تحميل النموذج: {diagnostics.message}. يتم عرض الشخصية الاحتياطية.
              </p>}
              {diagnostics?.status === "ready" && <div className="mt-2 space-y-1 font-semibold text-muted-foreground">
                <p className="font-black text-foreground">حالة التوافق: {readiness.title}</p>
                <p>المجسمات: {diagnostics.meshCount ?? 0} · الخامات: {diagnostics.materialCount ?? 0} · المجسمات المرتبطة بالعظام: {diagnostics.skinnedMeshCount ?? 0}</p>
                <p>العظام: {diagnostics.boneCount ?? 0} · تعابير Morph: {diagnostics.morphCount ?? 0} · مقاطع الحركة المرفقة: {diagnostics.animationClipCount ?? 0}</p>
                <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
                  <p className="font-black text-foreground">تحليل الأسطح والخامات الفعلية</p>
                  <p className="mt-1">المثلثات (تقديريًا): {(diagnostics.triangleCount ?? 0).toLocaleString("ar")} · خرائط النسيج: {diagnostics.textureCount ?? 0}</p>
                  <p>خامات PBR: {diagnostics.pbrMaterialCount ?? 0} · خامات ذات Normal Maps: {diagnostics.normalMappedMaterialCount ?? 0}</p>
                  <p>خرائط معروفة الدقة: {diagnostics.knownResolutionCount ?? 0} · خرائط منخفضة الدقة: {diagnostics.lowResolutionCount ?? 0}</p>
                  <p>خرائط تحسّن ترشيح عرضها: {diagnostics.enhancedTextureCount ?? 0}</p>
                  <p className="mt-2 text-xs font-normal">يتم الحفاظ على خشونة المواد وألوانها الأصلية؛ دقة الخرائط وحدها لا تثبت جودة التصميم.</p>
                  {describeSurfaceLimitations({
                    triangleCount: diagnostics.triangleCount ?? 0,
                    textureCount: diagnostics.textureCount ?? 0,
                    knownResolutionCount: diagnostics.knownResolutionCount ?? 0,
                    lowResolutionCount: diagnostics.lowResolutionCount ?? 0,
                    pbrMaterialCount: diagnostics.pbrMaterialCount ?? 0,
                    normalMappedMaterialCount: diagnostics.normalMappedMaterialCount ?? 0,
                    enhancedTextureCount: diagnostics.enhancedTextureCount ?? 0,
                  }).length > 0 && <ul className="mt-2 list-disc space-y-1 pr-5 text-xs">
                    {describeSurfaceLimitations({
                      triangleCount: diagnostics.triangleCount ?? 0,
                      textureCount: diagnostics.textureCount ?? 0,
                      knownResolutionCount: diagnostics.knownResolutionCount ?? 0,
                      lowResolutionCount: diagnostics.lowResolutionCount ?? 0,
                      pbrMaterialCount: diagnostics.pbrMaterialCount ?? 0,
                      normalMappedMaterialCount: diagnostics.normalMappedMaterialCount ?? 0,
                      enhancedTextureCount: diagnostics.enhancedTextureCount ?? 0,
                    }).map((note) => <li key={note}>{note}</li>)}
                  </ul>}
                </div>
                <p>تحريك الرأس: {diagnostics.hasHeadRig ? "متاح" : "غير مدعوم"} · الذراعان: {diagnostics.hasArmRig ? "متاحان" : "غير مدعومين"}</p>
                <p>تحريك الفم: {diagnostics.hasLipSync ? "مدعوم" : "غير مدعوم"} · رمش العين: {diagnostics.hasBlink ? "مدعوم" : "غير مدعوم"}</p>
                {diagnostics.dimensions && <p>
                  أبعاد الأصل: {diagnostics.dimensions.width.toFixed(2)} × {diagnostics.dimensions.height.toFixed(2)} × {diagnostics.dimensions.depth.toFixed(2)}
                </p>}
                {diagnostics.message && <p className="text-amber-700">{diagnostics.message}</p>}
                {readiness.limitations.length > 0 && <div className="mt-3 rounded-xl border border-border p-3">
                  <p className="font-bold text-foreground">ملاحظات التوافق مع الحركة:</p>
                  <ul className="mt-2 list-disc space-y-1 pr-5">
                    {readiness.limitations.map((message) => <li key={message}>{message}</li>)}
                  </ul>
                </div>}
                <p className="text-xs font-normal">هذا فحص تقني للتوافق فقط، ولا يُعد تقييمًا لجودة الوجه أو الملابس أو مطابقة المراجع.</p>
              </div>}
            </div>}
            <button type="button" onClick={() => navigate({ to: "/customize" })} className="rounded-full bg-secondary px-6 py-3 font-black">تخصيص الشخصية</button>
            <button type="button" onClick={() => navigate({ to: "/story" })} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-black text-primary-foreground"><BookOpen className="size-5" /> ابدأ القصة</button>
            <button type="button" onClick={() => navigate({ to: "/studio" })} className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-border px-6 py-3 font-black"><Camera className="size-5" /> استوديو التصوير</button>
          </div>
        </section>}
      </div>
      {editor && <Editor key={editor === "new" ? "new" : editor.id}
        initial={editor === "new" ? undefined : editor} onClose={() => setEditor(null)}
        onSave={async (draft, file) => {
          const previousAsset = editor === "new" ? undefined : editor.assetId;
          const importedAsset = file ? await saveGlbAsset(file) : undefined;
          const saved = file ? { ...draft, assetId: importedAsset, modelUrl: undefined } : draft;
          try {
          if (editor === "new") {
            const id = addCharacter(saved);
            const added = useCharacterLibrary.getState().characters.find((item) => item.id === id);
            if (added) choose(added);
            setFilter("all"); setSearch("");
          } else updateCharacter(editor.id, saved);
          if (previousAsset && previousAsset !== saved.assetId) {
            void deleteGlbAsset(previousAsset).catch(() => {
              setCaptureError("تم حفظ التعديل، لكن تعذر تنظيف الملف السابق من مساحة الجهاز.");
            });
          }
          setEditor(null);
          } catch (caught) {
            if (importedAsset) await deleteGlbAsset(importedAsset).catch(() => {});
            throw caught;
          }
        }} />}
    </main>
  );
}
