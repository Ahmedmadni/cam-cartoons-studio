import { create } from "zustand";

export type CharacterType = "robot" | "bear" | "rabbit" | "dino";
export type AnimationType = "idle" | "jump" | "wave" | "spin";
export type VoiceType = "normal" | "bear" | "robot" | "rabbit" | "dino";

export const VOICES: VoiceType[] = ["normal", "bear", "robot", "rabbit", "dino"];


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
  recordedAudio: Blob | null;
  selectedVoice: VoiceType;
  isFaceTrackingEnabled: boolean;
  setSelectedCharacter: (character: CharacterType) => void;
  setAnimation: (animation: AnimationType) => void;
  nextAnimation: () => void;
  setIsRecording: (value: boolean) => void;
  setRecordedVideo: (blob: Blob | null) => void;
  setRecordedAudio: (blob: Blob | null) => void;
  setSelectedVoice: (voice: VoiceType) => void;
  toggleFaceTracking: () => void;
  setFaceTracking: (value: boolean) => void;
  reset: () => void;
};

export const useStudioStore = create<StudioState>((set, get) => ({
  selectedCharacter: null,
  animation: "idle",
  isRecording: false,
  recordedVideo: null,
  recordedAudio: null,
  selectedVoice: "normal",
  isFaceTrackingEnabled: false,
  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
  setAnimation: (animation) => set({ animation }),
  nextAnimation: () => {
    const current = get().animation;
    const index = ANIMATIONS.indexOf(current);
    set({ animation: ANIMATIONS[(index + 1) % ANIMATIONS.length] ?? "idle" });
  },
  setIsRecording: (value) => set({ isRecording: value }),
  setRecordedVideo: (blob) => set({ recordedVideo: blob }),
  setRecordedAudio: (blob) => set({ recordedAudio: blob }),
  setSelectedVoice: (voice) => set({ selectedVoice: voice }),
  toggleFaceTracking: () => set({ isFaceTrackingEnabled: !get().isFaceTrackingEnabled }),
  setFaceTracking: (value) => set({ isFaceTrackingEnabled: value }),
  reset: () =>
    set({
      selectedCharacter: null,
      animation: "idle",
      isRecording: false,
      recordedVideo: null,
      recordedAudio: null,
      selectedVoice: "normal",
      isFaceTrackingEnabled: false,
    }),
}));


