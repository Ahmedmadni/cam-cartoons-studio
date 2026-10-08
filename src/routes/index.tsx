import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookOpen as Camera,
  ExternalLink,
  Palette,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import CharacterStage from "@/components/characters/CharacterStage";
import ReadyPlayerMeCreator from "@/components/characters/ReadyPlayerMeCreator";
import {
  CHARACTER_CATEGORY_LABELS,
  CHARACTER_LIBRARY_FILTERS,
  filterCharacters,
  getAllCharacters,
  providerLabel,
  useCharacterLibraryStore,
  type CharacterCategory,
  type CharacterDefinition,
  type CharacterLibraryFilter,
  type CharacterProvider,
} from "@/lib/characterLibrary";
import {
  CHARACTER_LABELS,
  useStudioStore,
  type CharacterSelection,
  type CharacterType,
  type VoiceType,
} from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مكتبة الشخصيات — استوديو الشخصيات 3D" },
      {
        name: "description",
        content:
          "اختر من مكتبة الشخصيات أو أضف شخصيات GLB وReady Player Me بلا حد، ثم ابدأ قصتك.",
      },
      { property: "og:title", content: "مكتبة الشخصيات — استوديو الشخصيات 3D" },
      {
        property: "og:description",
        content: "مكتبة شخصيات ثلاثية الأبعاد قابلة للتوسع والاستيراد.",
      },
    ],
  }),
  component: Index,
});

const BASE_TYPES: CharacterType[] = ["boy", "girl", "man", "woman"];
const CATEGORIES: CharacterCategory[] = ["kids", "teens", "adults", "fantasy", "other"];

const BASE_EMOJI: Record<CharacterType, string> = {
  boy: "👦",
  girl: "👧",
  man: "👨",
  woman: "👩",
};

function voiceForBase(type: CharacterType): VoiceType {
  if (type === "boy") return "boy";
  if (type === "girl") return "girl";
  if (type === "man") return "man";
  return "woman";
}

function selectionFromCharacter(character: CharacterDefinition): CharacterSelection {
  return {
    id: character.id,
    name: character.name,
    baseType: character.baseType,
    modelUrl: character.modelUrl,
    voicePreset: character.voicePreset,
  };
}

type AddCharacterDialogProps = {
  onClose: () => void;
  onAdded: (character: CharacterDefinition) => void;
};

function AddCharacterDialog({ onClose, onAdded }: AddCharacterDialogProps) {
  const addCharacter = useCharacterLibraryStore((state) => state.addCharacter);
  const [name, setName] = useState("شخصية جديدة");
  const [baseType, setBaseType] = useState<CharacterType>("man");
  const [category, setCategory] = useState<CharacterCategory>("teens");
  const [modelUrl, setModelUrl] = useState("");
  const [showReadyPlayerMe, setShowReadyPlayerMe] = useState(false);
  const [subdomain, setSubdomain] = useState(
    import.meta.env["VITE_RPM_SUBDOMAIN"]?.trim() || "demo",
  );
  const [error, setError] = useState<string | null>(null);

  const finish = (url: string, provider: CharacterProvider) => {
    const cleanName = name.trim();
    const cleanUrl = url.trim();

    if (!cleanName) {
      setError("اكتب اسمًا للشخصية.");
      return;
    }
    if (!cleanUrl) {
      setError("أضف رابط GLB صالحًا.");
      return;
    }

    try {
      const parsed = new URL(cleanUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("unsupported protocol");
      }
    } catch {
      setError("رابط النموذج غير صالح. استخدم رابط HTTP أو HTTPS مباشرًا.");
      return;
    }

    const definition: Omit<CharacterDefinition, "id" | "createdAt" | "builtIn"> = {
      name: cleanName,
      baseType,
      category,
      provider,
      modelUrl: cleanUrl,
      voicePreset: voiceForBase(baseType),
      emoji: BASE_EMOJI[baseType],
      tags: [
        CHARACTER_LABELS[baseType],
        provider === "readyplayerme" ? "Ready Player Me" : "GLB",
        "3D",
      ],
    };

    const id = addCharacter(definition);
    const saved =
      useCharacterLibraryStore
        .getState()
        .characters.find((character) => character.id === id) ??
      ({
        ...definition,
        id,
        builtIn: false,
        createdAt: new Date().toISOString(),
      } satisfies CharacterDefinition);

    onAdded(saved);
  };

  const importGlb = () => {
    setError(null);
    finish(modelUrl, "imported-glb");
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="إضافة شخصية"
      >
        <div className="w-full max-w-xl rounded-[2rem] border-2 border-border bg-card p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-black text-primary">
                <Sparkles className="size-4" />
                شخصية احترافية جديدة
              </span>
              <h2 className="mt-2 text-2xl font-black text-foreground">
                أضف أي شخصية GLB
              </h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                لا يوجد حد لعدد الشخصيات. اختر الهيكل الأقرب فقط لضبط المقاس والحركة الاحتياطية.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-black text-foreground">اسم الشخصية</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-bold text-foreground outline-none focus:border-primary"
                placeholder="مثال: آدم الكيرلي"
              />
            </label>

            <div>
              <p className="text-sm font-black text-foreground">الهيكل الاحتياطي</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {BASE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBaseType(type)}
                    className={`rounded-2xl border-2 px-2 py-3 text-sm font-black transition ${
                      baseType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground"
                    }`}
                  >
                    <span className="block text-xl">{BASE_EMOJI[type]}</span>
                    {CHARACTER_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-black text-foreground">التصنيف</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as CharacterCategory)}
                className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-bold text-foreground outline-none focus:border-primary"
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {CHARACTER_CATEGORY_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-black text-foreground">رابط ملف GLB</span>
              <input
                value={modelUrl}
                onChange={(event) => setModelUrl(event.target.value)}
                dir="ltr"
                type="url"
                className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
                placeholder="https://.../character.glb"
              />
            </label>

            {error && (
              <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-black text-destructive">
                {error}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={importGlb}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-4 font-black text-secondary-foreground shadow"
              >
                <ExternalLink className="size-5" />
                استيراد GLB
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  if (!name.trim()) {
                    setError("اكتب اسمًا للشخصية أولًا.");
                    return;
                  }
                  setShowReadyPlayerMe(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-4 font-black text-primary-foreground shadow"
              >
                <Sparkles className="size-5" />
                إنشاء عبر Ready Player Me
              </button>
            </div>

            <details className="rounded-2xl bg-muted/50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-black text-foreground">
                إعداد Ready Player Me
              </summary>
              <label className="mt-3 block text-xs font-black text-muted-foreground">
                Subdomain
                <input
                  value={subdomain}
                  onChange={(event) => setSubdomain(event.target.value)}
                  dir="ltr"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none"
                />
              </label>
            </details>
          </div>
        </div>
      </div>

      {showReadyPlayerMe && (
        <ReadyPlayerMeCreator
          subdomain={subdomain}
          onAvatarExported={(url) => {
            finish(url, "readyplayerme");
            setShowReadyPlayerMe(false);
          }}
          onClose={() => setShowReadyPlayerMe(false)}
        />
      )}
    </>
  );
}

function Index() {
  const navigate = useNavigate();
  const selectedCharacter = useStudioStore((state) => state.selectedCharacter);
  const selectedCharacterId = useStudioStore((state) => state.selectedCharacterId);
  const selectedCharacterModelUrl = useStudioStore((state) => state.selectedCharacterModelUrl);
  const selectCharacter = useStudioStore((state) => state.selectCharacter);
  const setSelectedCharacter = useStudioStore((state) => state.setSelectedCharacter);
  const customCharacters = useCharacterLibraryStore((state) => state.characters);
  const removeCharacter = useCharacterLibraryStore((state) => state.removeCharacter);
  const [filter, setFilter] = useState<CharacterLibraryFilter>("all");
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const allCharacters = useMemo(
    () => getAllCharacters(customCharacters),
    [customCharacters],
  );
  const visibleCharacters = useMemo(
    () => filterCharacters(allCharacters, filter, query),
    [allCharacters, filter, query],
  );

  const selectedDefinition =
    allCharacters.find((character) => character.id === selectedCharacterId) ?? null;
  const selectedIsExternal = Boolean(selectedCharacterModelUrl);

  const chooseCharacter = (character: CharacterDefinition) => {
    selectCharacter(selectionFromCharacter(character));
  };

  const deleteCharacter = (character: CharacterDefinition) => {
    if (character.builtIn) return;
    removeCharacter(character.id);
    if (selectedCharacterId === character.id) {
      setSelectedCharacter("boy");
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-accent-foreground">
            <Sparkles className="size-4" />
            مكتبة الشخصيات المفتوحة
          </span>
          <h1 className="mt-4 text-4xl font-black text-foreground sm:text-5xl">
            اختر أو أضف شخصيتك
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-lg font-semibold text-muted-foreground">
            لست مقيدًا بأربع شخصيات. استورد أي GLB احترافي أو أنشئ أفاتارات Ready Player Me واحفظها في مكتبتك.
          </p>
        </header>

        <section className="mt-8 rounded-3xl border-2 border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-full border-2 border-border bg-background py-3 pl-4 pr-12 font-bold text-foreground outline-none focus:border-primary"
                placeholder="ابحث باسم الشخصية أو التصنيف..."
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-black text-primary-foreground shadow-lg transition hover:brightness-105"
            >
              <Plus className="size-5" />
              إضافة شخصية احترافية
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CHARACTER_LIBRARY_FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  filter === item
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {CHARACTER_CATEGORY_LABELS[item]}
              </button>
            ))}
          </div>
        </section>

        {visibleCharacters.length ? (
          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleCharacters.map((character) => {
              const selected = selectedCharacterId === character.id;
              const active = hovered === character.id || selected;

              return (
                <article
                  key={character.id}
                  onMouseEnter={() => setHovered(character.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`group relative overflow-hidden rounded-[2rem] border-4 bg-card shadow-lg transition duration-200 hover:-translate-y-1 ${
                    selected
                      ? "border-primary ring-4 ring-primary/20"
                      : "border-border hover:border-secondary"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => chooseCharacter(character)}
                    className="block w-full text-right"
                    aria-pressed={selected}
                  >
                    <div className="relative h-64 overflow-hidden bg-muted">
                      <CharacterStage
                        type={character.baseType}
                        modelUrl={character.modelUrl}
                        spin={active}
                      />
                      {!character.builtIn && (
                        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-black text-white backdrop-blur">
                          {providerLabel(character.provider)}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-xl font-black text-foreground">
                            {character.emoji} {character.name}
                          </h2>
                          <p className="mt-1 text-xs font-bold text-muted-foreground">
                            {CHARACTER_CATEGORY_LABELS[character.category]} ·{" "}
                            {providerLabel(character.provider)}
                          </p>
                        </div>
                        {selected && (
                          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-black text-primary">
                            مختارة ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {!character.builtIn && (
                    <button
                      type="button"
                      onClick={() => deleteCharacter(character)}
                      className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-card/90 text-destructive opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100"
                      aria-label={`حذف ${character.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border-2 border-dashed border-border bg-card p-10 text-center">
            <p className="text-xl font-black text-foreground">لا توجد شخصيات مطابقة</p>
            <p className="mt-2 font-semibold text-muted-foreground">
              غيّر الفلتر أو أضف شخصية GLB جديدة إلى مكتبتك.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            disabled={!selectedCharacter || selectedIsExternal}
            onClick={() => navigate({ to: "/customize" })}
            className="inline-flex items-center gap-3 rounded-full bg-secondary px-8 py-5 text-xl font-black text-secondary-foreground shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            title={
              selectedIsExternal
                ? "الشخصيات الخارجية تحتفظ بتصميمها الأصلي؛ عدّلها من مصدرها أو أضف نسخة أخرى."
                : undefined
            }
          >
            <Palette className="size-7" />
            صمّم الشخصية المدمجة
          </button>
          <button
            type="button"
            disabled={!selectedCharacter}
            onClick={() => navigate({ to: "/story" })}
            className="inline-flex items-center gap-3 rounded-full bg-primary px-10 py-5 text-xl font-black text-primary-foreground shadow-xl transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Camera className="size-7" />
            ابدأ القصة
          </button>
        </div>

        {selectedDefinition && (
          <p className="mt-3 text-center text-sm font-bold text-muted-foreground">
            الشخصية الحالية: {selectedDefinition.name}
            {selectedIsExternal ? " · نموذج 3D خارجي احترافي" : " · fallback مدمج"}
          </p>
        )}
      </div>

      {showAdd && (
        <AddCharacterDialog
          onClose={() => setShowAdd(false)}
          onAdded={(character) => {
            chooseCharacter(character);
            setShowAdd(false);
          }}
        />
      )}
    </main>
  );
}
