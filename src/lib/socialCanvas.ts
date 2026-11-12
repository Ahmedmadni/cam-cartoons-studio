import { sceneAt, visibleCaptionAt, type SceneTheme, type SocialProject } from "./socialStudio";
import { renderCartoonCharacter } from "./socialCharacterRig";
import { paintIllustratedCharacter } from "./socialCharacterArt";

/** Offline 2D vector renderer. Export and live preview use exactly the same pixels. */
const W = 720;
const H = 1280;
type Ctx = CanvasRenderingContext2D;
const COLORS: Record<SceneTheme, [string, string]> = {
  sky: ["#65eaf0", "#b5fcf5"],
  studio: ["#bfc8ff", "#fbf1ff"],
  classroom: ["#b9eed8", "#eefdf4"],
  warm: ["#ffc5a2", "#fff1be"],
  night: ["#2b3977", "#778ac6"],
  mint: ["#9af2ce", "#f0fffb"],
};
function path(ctx: Ctx, points: [number, number][], color: string) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
function circle(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
}
function round(ctx: Ctx, x: number, y: number, w: number, h: number, radius: number, fill: string) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
}
function stroke(ctx: Ctx, points: [number, number][], color: string, width: number) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = color; ctx.stroke();
}
function drawBackground(ctx: Ctx, theme: SceneTheme, seconds: number) {
  const [top, bottom] = COLORS[theme];
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, top); gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = .24;
  circle(ctx, 90, 280, 170, 170, "#ffffff");
  circle(ctx, 645, 690, 210, 210, "#ffffff");
  circle(ctx, 610 + 10 * Math.sin(seconds * .4), 160, 80, 80, "#ffffff");
  ctx.globalAlpha = 1;
  if (theme === "classroom") {
    round(ctx, 55, 340, 610, 420, 28, "#428c74");
    round(ctx, 75, 360, 570, 378, 20, "#2b6e5b");
    stroke(ctx, [[90, 770], [630, 770]], "#b78359", 16);
    circle(ctx, 580, 404, 16, 16, "#ffe29b");
  } else if (theme === "studio") {
    round(ctx, 55, 340, 610, 380, 38, "#eef2ff");
    stroke(ctx, [[90, 420], [625, 420]], "#b1bdfd", 14);
    circle(ctx, 595, 380, 20, 20, "#a7a4e9");
  } else if (theme === "night") {
    for (let i = 0; i < 12; i++) {
      const x = 42 + (i * 113) % 644;
      const y = 125 + (i * 83) % 520;
      circle(ctx, x, y, 3 + (i % 3), 3 + (i % 3), "#f8f8ca");
    }
  }
  ctx.globalAlpha = .24;
  circle(ctx, 360, 1070, 225, 45, "#183e52");
  ctx.globalAlpha = 1;
}
function splitLines(ctx: Ctx, text: string, width: number, maxLines: number): string[] {
  const words = text.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (ctx.measureText(candidate).width > width && line) {
      lines.push(line); line = word;
      if (lines.length === maxLines) break;
    } else line = candidate;
  }
  if (lines.length < maxLines && line) lines.push(line);
  return lines;
}
function drawCopy(ctx: Ctx, project: SocialProject, headline: string, caption: string, theme: SceneTheme) {
  ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  round(ctx, 78, 78, 564, 114, 33, "rgba(255,255,255,.94)");
  ctx.fillStyle = "#25364a"; ctx.font = "900 48px Cairo, sans-serif";
  ctx.fillText(headline || project.title, W / 2, 137, 490);
  if (project.showCaptions && caption.trim()) {
    const captionBg = theme === "night" ? "rgba(5,12,29,.92)" : "rgba(23,38,58,.88)";
    round(ctx, 42, 900, 636, 246, 32, captionBg);
    ctx.font = "900 34px Cairo, sans-serif";
    const lines = splitLines(ctx, caption, 565, 4);
    ctx.fillStyle = project.captionColor === "yellow" ? "#ffdf6a" : "#ffffff";
    const top = 1022 - (lines.length - 1) * 26;
    lines.forEach((line, i) => ctx.fillText(line, W / 2, top + i * 52, 575));
  }
  if (project.watermark.trim()) {
    ctx.fillStyle = theme === "night" ? "#ffffff" : "#26374e";
    ctx.globalAlpha = .85; ctx.font = "700 23px Cairo, sans-serif";
    ctx.fillText(project.watermark.trim(), W / 2, 1212, 580); ctx.globalAlpha = 1;
  }
}
export function renderSocialFrame(
  ctx: Ctx, project: SocialProject, seconds: number, voiceAmplitude = 0,
) {
  if (!project.scenes.length) return;
  ctx.save();
  ctx.setTransform(ctx.canvas.width / W, 0, 0, ctx.canvas.height / H, 0, 0);
  const { scene, elapsed } = sceneAt(project, Math.max(0, seconds));
  drawBackground(ctx, scene.theme, seconds);
  const mouth = scene.motion === "idle" ? .06 : Math.min(1, voiceAmplitude * 2.7);
  if (!paintIllustratedCharacter(ctx, scene.character, seconds, mouth, scene.motion, scene.expression, scene.rig, elapsed*1000)) {
    renderCartoonCharacter(ctx, scene.character, seconds, mouth, scene.motion, scene.expression);
  }
  // A gentle transition that never obscures captions for the entire first frame.
  if (scene.transition === "fade" && elapsed < .32) {
    ctx.fillStyle = "rgba(255,255,255," + (0.7 * (1 - elapsed / .32)) + ")";
    ctx.fillRect(0, 0, W, H);
  }
  drawCopy(ctx, project, scene.headline,
    visibleCaptionAt(scene.caption, elapsed, scene.duration, project.captionAnimation), scene.theme);
  ctx.restore();
}
