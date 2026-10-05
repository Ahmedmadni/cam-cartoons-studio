import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen as Camera, Palette, Sparkles } from "lucide-react";
import CharacterStage from "@/components/characters/CharacterStage";
import { usesReadyPlayerMe } from "@/lib/avatarCatalog";
import { CHARACTER_LABELS, useStudioStore, type CharacterType } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "اختر شخصيتك — استوديو الشخصيات 3D" },
      {
        name: "description",
        content: "اختر واحدة من أربع شخصيات كرتونية ثلاثية الأبعاد وابدأ التصوير معها.",
      },
      { property: "og:title", content: "اختر شخصيتك — استوديو الشخصيات 3D" },
      {
        property: "og:description",
        content: "اختر واحدة من أربع شخصيات كرتونية ثلاثية الأبعاد وابدأ التصوير معها.",
      },
    ],
  }),
  component: Index,
});

const CHARACTERS: { type: CharacterType; emoji: string }[] = [
  { type: "boy", emoji: "👦" },
  { type: "girl", emoji: "👧" },
  { type: "man", emoji: "👨" },
  { type: "woman", emoji: "👩" },
];


function Index() {
  const navigate = useNavigate();
  const selectedCharacter = useStudioStore((s) => s.selectedCharacter);
  const setSelectedCharacter = useStudioStore((s) => s.setSelectedCharacter);
  const [hovered, setHovered] = useState<CharacterType | null>(null);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-accent-foreground">
            <Sparkles className="size-4" />
            استوديو المرح
          </span>
          <h1 className="mt-4 text-4xl font-black text-foreground sm:text-5xl">
            اختر شخصيتك الكرتونية!
          </h1>
          <p className="mt-3 text-lg font-semibold text-muted-foreground">
            اضغط على الشخصية التي تحبها، ثم اكتب لها قصة قصيرة.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CHARACTERS.map(({ type, emoji }) => {
            const isSelected = selectedCharacter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedCharacter(type)}
                onMouseEnter={() => setHovered(type)}
                onMouseLeave={() => setHovered(null)}
                aria-pressed={isSelected}
                className={`group flex flex-col items-center rounded-3xl border-4 bg-card p-4 shadow-lg transition-transform duration-200 hover:-translate-y-1 ${
                  isSelected
                    ? "border-primary ring-4 ring-primary/25"
                    : "border-border hover:border-secondary"
                }`}
              >
                <div className="h-52 w-full overflow-hidden rounded-2xl bg-muted">
                  <CharacterStage type={type} spin={hovered !== type} />
                </div>
                <span className="mt-4 text-2xl font-black text-foreground">
                  {emoji} {CHARACTER_LABELS[type]}
                </span>
                <span className="mt-2 rounded-full bg-muted px-3 py-1 text-[11px] font-black text-muted-foreground">
                  {usesReadyPlayerMe(type) ? "نموذج 3D متقدم" : "نموذج كرتوني مدمج"}
                </span>
                <span
                  className={`mt-2 text-sm font-bold ${
                    isSelected ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {isSelected ? "تم الاختيار ✓" : "اضغط للاختيار"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            disabled={!selectedCharacter}
            onClick={() => navigate({ to: "/customize" })}
            className="inline-flex items-center gap-3 rounded-full bg-secondary px-8 py-5 text-xl font-black text-secondary-foreground shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Palette className="size-7" />
            صمّم الشخصية
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
      </div>
    </main>
  );
}
