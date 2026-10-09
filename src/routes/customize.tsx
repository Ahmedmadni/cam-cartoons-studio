import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, ExternalLink, Link2, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import CharacterStage from "@/components/characters/CharacterStage";
import ReadyPlayerMeCreator from "@/components/characters/ReadyPlayerMeCreator";
import { getAvatarProfile, type FaceShape, type GlassesStyle, type HairStyle, type HeadwearStyle, type OutfitStyle } from "@/lib/avatarCatalog";
import {
  ACCENT_COLORS,
  BOTTOM_COLORS,
  EYE_COLORS,
  FACE_SHAPE_LABELS,
  GLASSES_STYLE_LABELS,
  HAIR_COLORS,
  HEADWEAR_STYLE_LABELS,
  HAIR_STYLE_LABELS,
  OUTFIT_STYLE_LABELS,
  SHOE_COLORS,
  SKIN_COLORS,
  TOP_COLORS,
  useAvatarCustomizationStore,
  type AvatarCustomization,
  type AvatarRenderMode,
} from "@/lib/avatarCustomization";
import { useStudioStore } from "@/lib/store";
import { getCharacterLabel, getCharacterDefinition } from "@/lib/characterLibrary";

export const Route = createFileRoute("/customize")({
  head: () => ({
    meta: [
      { title: "صمّم شخصيتك — استوديو الشخصيات 3D" },
      {
        name: "description",
        content: "خصص مظهر شخصيتك الكرتونية ثلاثية الأبعاد واحفظها تلقائيًا.",
      },
    ],
  }),
  component: CustomizePage,
});

type SwatchProps = {
  label: string;
  colors: string[];
  value: string;
  onChange: (color: string) => void;
};

function ColorSwatches({ label, colors, value, onChange }: SwatchProps) {
  return (
    <div>
      <p className="text-sm font-black text-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {colors.map((color) => {
          const selected = color.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`relative size-10 rounded-full border-2 shadow-sm transition hover:scale-105 ${
                selected ? "border-primary ring-2 ring-primary/30" : "border-border"
              }`}
              style={{ backgroundColor: color }}
              aria-label={`${label}: ${color}`}
              aria-pressed={selected}
            >
              {selected && (
                <Check
                  className="absolute inset-0 m-auto size-5 drop-shadow"
                  style={{ color: "#ffffff" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const HAIR_STYLES: HairStyle[] = ["crop", "curls", "bun", "waves"];
const FACE_SHAPES: FaceShape[] = ["round", "oval", "square"];
const GLASSES_STYLES: GlassesStyle[] = ["none", "round", "square"];
const HEADWEAR_STYLES: HeadwearStyle[] = ["none", "cap", "beanie"];
const OUTFIT_STYLES: OutfitStyle[] = ["casual", "hoodie", "formal"];

const MODE_LABELS: Record<AvatarRenderMode, { label: string; hint: string }> = {
  auto: {
    label: "تلقائي",
    hint: "يستخدم Ready Player Me عند توفره، وإلا الشخصية المدمجة.",
  },
  custom: {
    label: "قابل للتخصيص",
    hint: "يستخدم الشخصية المدمجة ويطبق كل اختياراتك مباشرة.",
  },
  readyplayerme: {
    label: "Ready Player Me",
    hint: "يستخدم نموذج GLB الخارجي بكامل الـrig وتعابير الوجه.",
  },
};

function CustomizePage() {
  const navigate = useNavigate();
  const selectedCharacter = useStudioStore((state) => state.selectedCharacter);
  const customization = useAvatarCustomizationStore((state) =>
    selectedCharacter ? state.customizations[selectedCharacter] : undefined,
  );
  const renderMode = useAvatarCustomizationStore((state) =>
    selectedCharacter ? state.renderModes[selectedCharacter] : "auto",
  );
  const updateCustomization = useAvatarCustomizationStore((state) => state.updateCustomization);
  const resetCustomization = useAvatarCustomizationStore((state) => state.resetCustomization);
  const setRenderMode = useAvatarCustomizationStore((state) => state.setRenderMode);
  const [showReadyPlayerMe, setShowReadyPlayerMe] = useState(false);
  const [readyPlayerMeSubdomain, setReadyPlayerMeSubdomain] = useState(
    import.meta.env["VITE_RPM_SUBDOMAIN"]?.trim() || "demo",
  );

  useEffect(() => {
    if (!selectedCharacter) navigate({ to: "/" });
  }, [navigate, selectedCharacter]);

  const handleReadyPlayerMeExport = useCallback(
    (modelUrl: string) => {
      if (!selectedCharacter) return;
      updateCustomization(selectedCharacter, { modelUrl });
      setRenderMode(selectedCharacter, "readyplayerme");
      setShowReadyPlayerMe(false);
    },
    [selectedCharacter, setRenderMode, updateCustomization],
  );

  if (!selectedCharacter) return null;

  const base = getAvatarProfile(selectedCharacter);
  const current: AvatarCustomization = {
    skin: customization?.skin ?? base.skin,
    hair: customization?.hair ?? base.hair,
    top: customization?.top ?? base.top,
    bottom: customization?.bottom ?? base.bottom,
    shoes: customization?.shoes ?? base.shoes,
    accent: customization?.accent ?? base.accent,
    eye: customization?.eye ?? base.eye,
    hairStyle: customization?.hairStyle ?? base.hairStyle,
    faceShape: customization?.faceShape ?? base.faceShape,
    eyeScale: customization?.eyeScale ?? base.eyeScale,
    eyeSpacing: customization?.eyeSpacing ?? base.eyeSpacing,
    noseScale: customization?.noseScale ?? base.noseScale,
    mouthScale: customization?.mouthScale ?? base.mouthScale,
    glassesStyle: customization?.glassesStyle ?? base.glassesStyle,
    outfitStyle: customization?.outfitStyle ?? base.outfitStyle,
    headwearStyle: customization?.headwearStyle ?? base.headwearStyle,
    bodyScale: customization?.bodyScale ?? base.bodyScale,
    shoulderScale: customization?.shoulderScale ?? base.shoulderScale,
    headScale: customization?.headScale ?? base.headScale,
  };
  const currentModelUrl = customization?.modelUrl ?? getCharacterDefinition(selectedCharacter)?.modelUrl ?? base.modelUrl ?? "";
  const hasReadyPlayerMe = Boolean(currentModelUrl.trim());
  const definition = getCharacterDefinition(selectedCharacter);

  const update = (patch: AvatarCustomization) => {
    updateCustomization(selectedCharacter, patch);
    if (renderMode !== "custom") setRenderMode(selectedCharacter, "custom");
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-black text-accent-foreground">
              <Sparkles className="size-4" />
              مصمم الشخصيات
            </span>
            <h1 className="mt-2 text-3xl font-black text-foreground sm:text-4xl">
              صمّم {getCharacterLabel(selectedCharacter)} كما تحب
            </h1>
            <p className="mt-1 font-semibold text-muted-foreground">
              كل التغييرات تُحفظ تلقائيًا على هذا الجهاز.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-3 font-black text-foreground transition hover:brightness-95"
          >
            <ArrowRight className="size-5" />
            العودة للاختيار
          </button>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="lg:sticky lg:top-5 lg:self-start">
            <div className="overflow-hidden rounded-[2rem] border-4 border-primary bg-card shadow-xl">
              <div className="h-[460px] sm:h-[580px]">
                <CharacterStage type={selectedCharacter} animation="idle" spin />
              </div>
              <div className="border-t border-border bg-card px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-foreground">
                      معاينة مباشرة
                    </p>
                    <p className="text-sm font-semibold text-muted-foreground">
                      حرّك الألوان والشكل وشاهد النتيجة فورًا.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetCustomization(selectedCharacter);
                      setRenderMode(selectedCharacter, "custom");
                    }}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-border px-4 py-2 text-sm font-black text-foreground transition hover:bg-muted"
                  >
                    <RotateCcw className="size-4" />
                    استعادة الأصل
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm">
              <h2 className="text-xl font-black text-foreground">مصدر الشخصية</h2>
              {definition?.provider === "imported-glb" && <p className="mt-2 text-sm font-semibold text-muted-foreground">الشخصية المستوردة هي المصدر الأساسي؛ يمكنك ضبط المقياس والإزاحة من محرر المكتبة.</p>}
              <div className="mt-3 grid gap-2">
                {(Object.keys(MODE_LABELS) as AvatarRenderMode[]).map((mode) => {
                  const disabled = mode === "readyplayerme" && !hasReadyPlayerMe;
                  const selected = renderMode === mode;
                  const item = MODE_LABELS[mode];

                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={disabled}
                      onClick={() => setRenderMode(selectedCharacter, mode)}
                      className={`rounded-2xl border-2 p-3 text-right transition ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/60"
                      } disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      <span className="block font-black text-foreground">{item.label}</span>
                      <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                        {disabled ? "لا يوجد رابط GLB لهذه الشخصية حاليًا." : item.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4">
                <label htmlFor="avatar-model-url" className="text-sm font-black text-foreground">
                  رابط GLB / Ready Player Me
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border-2 border-border bg-background px-3">
                  <Link2 className="size-5 shrink-0 text-muted-foreground" />
                  <input
                    id="avatar-model-url"
                    type="url"
                    value={currentModelUrl}
                    onChange={(event) => {
                      const modelUrl = event.target.value;
                      updateCustomization(selectedCharacter, { modelUrl });
                      if (modelUrl.trim()) setRenderMode(selectedCharacter, "readyplayerme");
                    }}
                    placeholder="https://models.readyplayer.me/...glb"
                    dir="ltr"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-foreground outline-none"
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  يمكن لصق رابط Ready Player Me مباشرة؛ سيضيف النظام إعدادات تعابير الوجه تلقائيًا.
                </p>
              </div>

              <div className="mt-4 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <ExternalLink className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-foreground">أنشئ الشخصية داخل Ready Player Me</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      افتح المصمم داخل التطبيق، ثم عند إنهاء الشخصية سيتم استيراد رابط GLB تلقائيًا.
                    </p>
                  </div>
                </div>

                <label
                  htmlFor="rpm-subdomain"
                  className="mt-3 block text-xs font-black text-foreground"
                >
                  Ready Player Me Subdomain
                </label>
                <div className="mt-1 flex items-center rounded-xl border border-border bg-background px-3">
                  <span className="text-xs font-bold text-muted-foreground">https://</span>
                  <input
                    id="rpm-subdomain"
                    type="text"
                    value={readyPlayerMeSubdomain}
                    onChange={(event) => setReadyPlayerMeSubdomain(event.target.value)}
                    dir="ltr"
                    spellCheck={false}
                    className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm font-semibold text-foreground outline-none"
                    placeholder="demo"
                  />
                  <span className="text-xs font-bold text-muted-foreground">.readyplayer.me</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReadyPlayerMe(true)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-black text-primary-foreground shadow transition hover:brightness-105"
                >
                  <ExternalLink className="size-5" />
                  فتح المصمم المتقدم
                </button>
              </div>

              {renderMode === "readyplayerme" && hasReadyPlayerMe && (
                <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">
                  تخصيص الألوان والشعر أدناه يخص النموذج الكرتوني المدمج. عند تغيير أي منها
                  سيعود العرض تلقائيًا إلى الوضع القابل للتخصيص.
                </p>
              )}
            </div>

            <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm">
              <h2 className="text-xl font-black text-foreground">الوجه والشعر</h2>
              <div className="mt-4 space-y-5">
                <ColorSwatches
                  label="لون البشرة"
                  colors={SKIN_COLORS}
                  value={current.skin!}
                  onChange={(skin) => update({ skin })}
                />
                <ColorSwatches
                  label="لون الشعر"
                  colors={HAIR_COLORS}
                  value={current.hair!}
                  onChange={(hair) => update({ hair })}
                />
                <ColorSwatches
                  label="لون العين"
                  colors={EYE_COLORS}
                  value={current.eye!}
                  onChange={(eye) => update({ eye })}
                />

                <div>
                  <p className="text-sm font-black text-foreground">تسريحة الشعر</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {HAIR_STYLES.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => update({ hairStyle: style })}
                        className={`rounded-xl border-2 px-3 py-2 text-sm font-black transition ${
                          current.hairStyle === style
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {HAIR_STYLE_LABELS[style]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black text-foreground">غطاء الرأس</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {HEADWEAR_STYLES.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => update({ headwearStyle: style })}
                        className={`rounded-xl border-2 px-3 py-2 text-sm font-black transition ${
                          current.headwearStyle === style
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {HEADWEAR_STYLE_LABELS[style]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black text-foreground">شكل الوجه</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {FACE_SHAPES.map((shape) => (
                      <button
                        key={shape}
                        type="button"
                        onClick={() => update({ faceShape: shape })}
                        className={`rounded-xl border-2 px-3 py-2 text-sm font-black transition ${
                          current.faceShape === shape
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {FACE_SHAPE_LABELS[shape]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black text-foreground">النظارات</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {GLASSES_STYLES.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => update({ glassesStyle: style })}
                        className={`rounded-xl border-2 px-3 py-2 text-sm font-black transition ${
                          current.glassesStyle === style
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {GLASSES_STYLE_LABELS[style]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl bg-muted/45 p-4">
                  <label className="block">
                    <span className="flex items-center justify-between text-sm font-black text-foreground">
                      <span>حجم العين</span>
                      <span>{current.eyeScale!.toFixed(2)}</span>
                    </span>
                    <input
                      type="range"
                      min="0.82"
                      max="1.22"
                      step="0.01"
                      value={current.eyeScale}
                      onChange={(event) => update({ eyeScale: Number(event.target.value) })}
                      className="mt-2 w-full accent-primary"
                    />
                  </label>

                  <label className="block">
                    <span className="flex items-center justify-between text-sm font-black text-foreground">
                      <span>تباعد العينين</span>
                      <span>{current.eyeSpacing!.toFixed(2)}</span>
                    </span>
                    <input
                      type="range"
                      min="0.85"
                      max="1.18"
                      step="0.01"
                      value={current.eyeSpacing}
                      onChange={(event) => update({ eyeSpacing: Number(event.target.value) })}
                      className="mt-2 w-full accent-primary"
                    />
                  </label>

                  <label className="block">
                    <span className="flex items-center justify-between text-sm font-black text-foreground">
                      <span>حجم الأنف</span>
                      <span>{current.noseScale!.toFixed(2)}</span>
                    </span>
                    <input
                      type="range"
                      min="0.80"
                      max="1.22"
                      step="0.01"
                      value={current.noseScale}
                      onChange={(event) => update({ noseScale: Number(event.target.value) })}
                      className="mt-2 w-full accent-primary"
                    />
                  </label>

                  <label className="block">
                    <span className="flex items-center justify-between text-sm font-black text-foreground">
                      <span>عرض الفم</span>
                      <span>{current.mouthScale!.toFixed(2)}</span>
                    </span>
                    <input
                      type="range"
                      min="0.82"
                      max="1.25"
                      step="0.01"
                      value={current.mouthScale}
                      onChange={(event) => update({ mouthScale: Number(event.target.value) })}
                      className="mt-2 w-full accent-primary"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm">
              <h2 className="text-xl font-black text-foreground">الملابس</h2>
              <div className="mt-4 space-y-5">
                <div>
                  <p className="text-sm font-black text-foreground">ستايل الملابس</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {OUTFIT_STYLES.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => update({ outfitStyle: style })}
                        className={`rounded-xl border-2 px-3 py-2 text-sm font-black transition ${
                          current.outfitStyle === style
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {OUTFIT_STYLE_LABELS[style]}
                      </button>
                    ))}
                  </div>
                </div>

                <ColorSwatches
                  label="الجزء العلوي"
                  colors={TOP_COLORS}
                  value={current.top!}
                  onChange={(top) => update({ top })}
                />
                <ColorSwatches
                  label="البنطال"
                  colors={BOTTOM_COLORS}
                  value={current.bottom!}
                  onChange={(bottom) => update({ bottom })}
                />
                <ColorSwatches
                  label="الحذاء"
                  colors={SHOE_COLORS}
                  value={current.shoes!}
                  onChange={(shoes) => update({ shoes })}
                />
                <ColorSwatches
                  label="لون التفاصيل"
                  colors={ACCENT_COLORS}
                  value={current.accent!}
                  onChange={(accent) => update({ accent })}
                />
              </div>
            </div>

            <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm">
              <h2 className="text-xl font-black text-foreground">النِّسب الكرتونية</h2>
              <div className="mt-4 space-y-5">
                <label className="block">
                  <span className="flex items-center justify-between text-sm font-black text-foreground">
                    <span>حجم الرأس</span>
                    <span>{current.headScale!.toFixed(2)}</span>
                  </span>
                  <input
                    type="range"
                    min="0.82"
                    max="1.25"
                    step="0.01"
                    value={current.headScale}
                    onChange={(event) => update({ headScale: Number(event.target.value) })}
                    className="mt-2 w-full accent-primary"
                  />
                </label>

                <label className="block">
                  <span className="flex items-center justify-between text-sm font-black text-foreground">
                    <span>عرض الكتفين</span>
                    <span>{current.shoulderScale!.toFixed(2)}</span>
                  </span>
                  <input
                    type="range"
                    min="0.78"
                    max="1.18"
                    step="0.01"
                    value={current.shoulderScale}
                    onChange={(event) => update({ shoulderScale: Number(event.target.value) })}
                    className="mt-2 w-full accent-primary"
                  />
                </label>

                <label className="block">
                  <span className="flex items-center justify-between text-sm font-black text-foreground">
                    <span>حجم الجسم</span>
                    <span>{current.bodyScale!.toFixed(2)}</span>
                  </span>
                  <input
                    type="range"
                    min="0.82"
                    max="1.12"
                    step="0.01"
                    value={current.bodyScale}
                    onChange={(event) => update({ bodyScale: Number(event.target.value) })}
                    className="mt-2 w-full accent-primary"
                  />
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate({ to: "/story" })}
              className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-primary px-8 py-5 text-xl font-black text-primary-foreground shadow-lg transition hover:brightness-105"
            >
              <Check className="size-6" />
              استخدم الشخصية وابدأ القصة
            </button>
          </section>
        </div>
      </div>

      {showReadyPlayerMe && (
        <ReadyPlayerMeCreator
          subdomain={readyPlayerMeSubdomain}
          onAvatarExported={handleReadyPlayerMeExport}
          onClose={() => setShowReadyPlayerMe(false)}
        />
      )}
    </main>
  );
}
