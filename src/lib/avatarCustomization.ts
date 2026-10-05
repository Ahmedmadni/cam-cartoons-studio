import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { FaceShape, GlassesStyle, HairStyle } from "./avatarCatalog";
import type { CharacterType } from "./store";

export type AvatarRenderMode = "auto" | "custom" | "readyplayerme";

export type AvatarCustomization = {
  modelUrl?: string;
  skin?: string;
  hair?: string;
  top?: string;
  bottom?: string;
  shoes?: string;
  accent?: string;
  eye?: string;
  hairStyle?: HairStyle;
  faceShape?: FaceShape;
  eyeScale?: number;
  eyeSpacing?: number;
  noseScale?: number;
  mouthScale?: number;
  glassesStyle?: GlassesStyle;
  bodyScale?: number;
  shoulderScale?: number;
  headScale?: number;
};

type AvatarCustomizationState = {
  customizations: Partial<Record<CharacterType, AvatarCustomization>>;
  renderModes: Record<CharacterType, AvatarRenderMode>;
  updateCustomization: (type: CharacterType, patch: AvatarCustomization) => void;
  resetCustomization: (type: CharacterType) => void;
  setRenderMode: (type: CharacterType, mode: AvatarRenderMode) => void;
};

const DEFAULT_MODES: Record<CharacterType, AvatarRenderMode> = {
  boy: "auto",
  girl: "auto",
  man: "auto",
  woman: "auto",
};

export const useAvatarCustomizationStore = create<AvatarCustomizationState>()(
  persist(
    (set) => ({
      customizations: {},
      renderModes: DEFAULT_MODES,
      updateCustomization: (type, patch) =>
        set((state) => ({
          customizations: {
            ...state.customizations,
            [type]: {
              ...state.customizations[type],
              ...patch,
            },
          },
        })),
      resetCustomization: (type) =>
        set((state) => {
          const next = { ...state.customizations };
          delete next[type];
          return { customizations: next };
        }),
      setRenderMode: (type, mode) =>
        set((state) => ({
          renderModes: {
            ...state.renderModes,
            [type]: mode,
          },
        })),
    }),
    {
      name: "cam-cartoons-avatar-customizations-v1",
      partialize: (state) => ({
        customizations: state.customizations,
        renderModes: state.renderModes,
      }),
    },
  ),
);

export const SKIN_COLORS = ["#F2D2BD", "#E8B894", "#D8A078", "#C98E68", "#A86F4F", "#7C4F3B"];
export const HAIR_COLORS = ["#1F1714", "#3A251D", "#5C3828", "#7A4B32", "#A66B3F", "#D9B382"];
export const EYE_COLORS = ["#2D211C", "#4B3428", "#6B4A34", "#3D5D52", "#48698A", "#6C7586"];

export const TOP_COLORS = ["#43A6D9", "#5D6EC7", "#46B5A7", "#D97855", "#E78FB3", "#6F7E8D"];
export const BOTTOM_COLORS = ["#24354D", "#435A7B", "#698CB6", "#7D695A", "#64636B", "#A48163"];
export const SHOE_COLORS = ["#F7F2E8", "#D7D9DF", "#6D7380", "#2C2D31", "#A66A45", "#C44C4C"];
export const ACCENT_COLORS = ["#F7C948", "#46B5A7", "#FF8B7B", "#8A7DD8", "#73BDE8", "#F1A6C5"];

export const HAIR_STYLE_LABELS: Record<HairStyle, string> = {
  crop: "قصير",
  curls: "كيرلي",
  bun: "كعكة",
  waves: "مموّج",
};


export const FACE_SHAPE_LABELS: Record<FaceShape, string> = {
  round: "دائري",
  oval: "بيضاوي",
  square: "مربع",
};

export const GLASSES_STYLE_LABELS: Record<GlassesStyle, string> = {
  none: "بدون",
  round: "دائرية",
  square: "مربعة",
};
