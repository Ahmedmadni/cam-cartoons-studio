/** Three-point cinematic lighting tuned for skinned PBR characters. */
export type LightingStyle = "cinematic" | "daylight" | "dramatic";

export const LIGHTING_LABELS: Record<LightingStyle, string> = {
  cinematic: "سينمائية",
  daylight: "طبيعية",
  dramatic: "درامية",
};

export const LIGHTING_RECIPES = {
  cinematic: {
    key: 2.15, fill: 0.78, rim: 3.4, ambience: 0.64, env: 0.62,
    keyColor: "#FFF4E8", fillColor: "#D7E8FF", rimColor: "#FFE0B8",
    ambientSky: "#FFF8EE", ambientGround: "#6E7A86",
  },
  daylight: {
    key: 1.85, fill: 1.12, rim: 1.55, ambience: 0.92, env: 0.78,
    keyColor: "#FFF9F2", fillColor: "#EDF5FF", rimColor: "#FFF5E8",
    ambientSky: "#FFFFFF", ambientGround: "#B7C3D2",
  },
  dramatic: {
    key: 2.55, fill: 0.3, rim: 3.8, ambience: 0.34, env: 0.42,
    keyColor: "#F8DEC7", fillColor: "#74A9E0", rimColor: "#95BFFF",
    ambientSky: "#D9E6FF", ambientGround: "#354252",
  },
} as const satisfies Record<LightingStyle, {
  key: number; fill: number; rim: number; ambience: number; env: number;
  keyColor: string; fillColor: string; rimColor: string;
  ambientSky: string; ambientGround: string;
}>;
