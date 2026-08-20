import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Sparkles } from "lucide-react";
import CharacterStage from "@/components/characters/CharacterStage";
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
  { type: "robot", emoji: "🤖" },
  { type: "bear", emoji: "🐻" },
  { type: "rabbit", emoji: "🐰" },
  { type: "dino", emoji: "🦖" },
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
            اضغط على الشخصية التي تحبها، ثم ابدأ التصوير معها.
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
                <span
                  className={`mt-1 text-sm font-bold ${
                    isSelected ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {isSelected ? "تم الاختيار ✓" : "اضغط للاختيار"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center">
          <button
            type="button"
            disabled={!selectedCharacter}
            onClick={() => navigate({ to: "/studio" })}
            className="inline-flex items-center gap-3 rounded-full bg-primary px-12 py-6 text-2xl font-black text-primary-foreground shadow-xl transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Camera className="size-8" />
            ابدأ التصوير
          </button>
        </div>
      </div>
    </main>
  );
}
