import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Camera, Edit3, Heart, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import CharacterStage from "@/components/characters/CharacterStage";
import {
  CHARACTER_CATEGORIES, PROVIDER_LABELS, useCharacterLibrary,
  type CharacterDefinition, type CharacterDraft, type CharacterCategory, type CharacterProvider,
} from "@/lib/characterLibrary";
import { useStudioStore, VOICES, type VoiceType } from "@/lib/store";
import type { AvatarDiagnostics } from "@/lib/modelPresentation";
import { cacheRemoteGlb, deleteGlbAsset, saveGlbAsset, MAX_GLB_BYTES } from "@/lib/localGlbStorage";

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
          <label className="block text-sm font-bold">اسم الشخصية
            <input required maxLength={80} className={inputClass} value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    setDiagnostics(null);
    setCaptureError(null);
    setOfflineError(null);
    canvasRef.current = null;
  }, [selectedCharacter]);
  const selected = characters.find((item) => item.id === selectedCharacter);
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

  const captureThumbnail = () => {
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
      gradient.addColorStop(0, "#203251");
      gradient.addColorStop(1, "#556d86");
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
      setCaptureError(error instanceof Error ? error.message : "تعذر التقاط صورة المعاينة.");
    }
  };

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
          <div className="h-80 overflow-hidden rounded-2xl bg-muted">
            <CharacterStage type={selected.id} animation="idle" spin
              onCanvasReady={(canvas) => { canvasRef.current = canvas; }}
              onDiagnostics={setDiagnostics} />
          </div>
          <div className="flex flex-col justify-center gap-3">
            <h2 className="text-3xl font-black">{selected.name}</h2>
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
                  </>
                ) : <p className="text-muted-foreground">لا يوجد ملف GLB لهذا النموذج.</p>}
                {offlineError && <p role="alert" className="mt-2 font-bold text-destructive">{offlineError}</p>}
              </div>
            )}
            <button type="button" onClick={captureThumbnail}
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
                <p>العظام: {diagnostics.boneCount ?? 0} · تعابير Morph: {diagnostics.morphCount ?? 0}</p>
                <p>تحريك الرأس: {diagnostics.hasHeadRig ? "متاح" : "غير مدعوم"} · الذراعان: {diagnostics.hasArmRig ? "متاحان" : "غير مدعومين"}</p>
                <p>تحريك الفم: {diagnostics.hasLipSync ? "مدعوم" : "غير مدعوم"} · رمش العين: {diagnostics.hasBlink ? "مدعوم" : "غير مدعوم"}</p>
                {diagnostics.dimensions && <p>
                  أبعاد الأصل: {diagnostics.dimensions.width.toFixed(2)} × {diagnostics.dimensions.height.toFixed(2)} × {diagnostics.dimensions.depth.toFixed(2)}
                </p>}
                {diagnostics.message && <p className="text-amber-700">{diagnostics.message}</p>}
                {!diagnostics.hasLipSync && <p>يحتاج النموذج إلى Morph Targets مناسبة ليتحرك فمه أثناء الكلام.</p>}
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
