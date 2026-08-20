import { create } from "zustand";

export type CharacterType = "robot" | "bear" | "rabbit" | "dino";
export type AnimationType = "idle" | "jump" | "wave" | "spin";

export const ANIMATIONS: AnimationType[] = ["idle", "jump", "wave", "spin"];

export const ANIMATION_LABELS: Record<AnimationType, string> = {
  idle: "هدوء",
  jump: "قفز",
  wave: "تلويح",
  spin: "دوران",
};

export const CHARACTER_LABELS: Record<CharacterType, string> = {
  robot: "روبوت",
  bear: "دبدوب",
  rabbit: "أرنوب",
  dino: "ديناصور",
};

type StudioState = {
  selectedCharacter: CharacterType | null;
  animation: AnimationType;
  isRecording: boolean;
  recordedVideo: Blob | null;
  setSelectedCharacter: (character: CharacterType) => void;
  setAnimation: (animation: AnimationType) => void;
  nextAnimation: () => void;
  setIsRecording: (value: boolean) => void;
  setRecordedVideo: (blob: Blob | null) => void;
  reset: () => void;
};

export const useStudioStore = create<StudioState>((set, get) => ({
  selectedCharacter: null,
  animation: "idle",
  isRecording: false,
  recordedVideo: null,
  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
  setAnimation: (animation) => set({ animation }),
  nextAnimation: () => {
    const current = get().animation;
    const index = ANIMATIONS.indexOf(current);
    set({ animation: ANIMATIONS[(index + 1) % ANIMATIONS.length] ?? "idle" });
  },
  setIsRecording: (value) => set({ isRecording: value }),
  setRecordedVideo: (blob) => set({ recordedVideo: blob }),
  reset: () =>
    set({
      selectedCharacter: null,
      animation: "idle",
      isRecording: false,
      recordedVideo: null,
    }),
}));
