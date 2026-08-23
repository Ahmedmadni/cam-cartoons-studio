import { create } from "zustand";

export type CharacterType = "boy" | "girl" | "man" | "woman";
export type AnimationType =
  | "idle"
  | "jump"
  | "wave"
  | "spin"
  | "clap"
  | "sad"
  | "happy"
  | "bye"
  | "nod"
  | "dance"
  | "think";
export type VoiceType = "normal" | "child" | "boy" | "girl" | "man" | "woman";

export const VOICES: VoiceType[] = ["normal", "child", "boy", "girl", "man", "woman"];


export const ANIMATIONS: AnimationType[] = ["idle", "jump", "wave", "spin"];

export const ANIMATION_LABELS: Record<AnimationType, string> = {
  idle: "هدوء",
  jump: "قفز",
  wave: "تلويح",
  spin: "دوران",
};

export const CHARACTER_LABELS: Record<CharacterType, string> = {
  boy: "ولد",
  girl: "بنت",
  man: "شاب",
  woman: "فتاة",
};

type StudioState = {
  selectedCharacter: CharacterType | null;
  animation: AnimationType;
  isRecording: boolean;
  recordedVideo: Blob | null;
  recordedAudio: Blob | null;
  selectedVoice: VoiceType;
  /** درجة الصوت (نصف نغمات) من -12 إلى +12 */
  voicePitch: number;
  /** نبرة الصوت: 0 = ناعم/دافئ، 1 = لامع/كرتوني */
  voiceTone: number;
  isFaceTrackingEnabled: boolean;
  setSelectedCharacter: (character: CharacterType) => void;
  setAnimation: (animation: AnimationType) => void;
  nextAnimation: () => void;
  setIsRecording: (value: boolean) => void;
  setRecordedVideo: (blob: Blob | null) => void;
  setRecordedAudio: (blob: Blob | null) => void;
  setSelectedVoice: (voice: VoiceType) => void;
  setVoicePitch: (value: number) => void;
  setVoiceTone: (value: number) => void;
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
  selectedVoice: "child",
  voicePitch: 0,
  voiceTone: 0.5,
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
  setVoicePitch: (value) => set({ voicePitch: Math.max(-12, Math.min(12, value)) }),
  setVoiceTone: (value) => set({ voiceTone: Math.max(0, Math.min(1, value)) }),
  toggleFaceTracking: () => set({ isFaceTrackingEnabled: !get().isFaceTrackingEnabled }),
  setFaceTracking: (value) => set({ isFaceTrackingEnabled: value }),
  reset: () =>
    set({
      selectedCharacter: null,
      animation: "idle",
      isRecording: false,
      recordedVideo: null,
      recordedAudio: null,
      selectedVoice: "child",
      voicePitch: 0,
      voiceTone: 0.5,
      isFaceTrackingEnabled: false,
    }),
}));
