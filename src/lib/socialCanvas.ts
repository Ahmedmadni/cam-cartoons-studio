import { sceneAt, type CartoonId, type SceneTheme, type SocialProject } from "./socialStudio";

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
function drawHuman(ctx: Ctx, id: Exclude<CartoonId, "nour">, t: number, mouth: number, motion: string) {
  const isLayla = id === "layla";
  const isOmar = id === "omar";
  const outfit = isLayla ? "#a679dc" : isOmar ? "#269e8c" : "#efaa31";
  const outline = "#654448";
  const skin = isOmar ? "#d99d72" : isLayla ? "#f4bf9f" : "#f2af8d";
  const gesture = motion === "wave" ? Math.sin(t * 7) * .22 : motion === "explain" ? Math.sin(t * 4) * .10 : 0;
  const bounce = Math.sin(t * 3) * (motion === "idle" ? 2 : 5);
  ctx.save();
  ctx.translate(360, 685 + bounce);
  // Body and arms behind the head. The arm is articulated rather than a static icon.
  path(ctx, [[-168, 265], [-134, 58], [-62, 22], [55, 22], [147, 58], [177, 265]], outfit);
  ctx.save();
  ctx.translate(140, 95); ctx.rotate(-.12 + gesture);
  round(ctx, -22, -15, 57, 163, 28, outfit);
  circle(ctx, 6, 140, 26, 27, skin);
  ctx.restore();
  round(ctx, -185, 120, 55, 148, 26, outfit);
  circle(ctx, 0, 32, 37, 58, skin);
  if (isLayla) {
    // Headscarf silhouette, shoulder drape and visible face opening
    path(ctx, [[-125, -125], [-120, -206], [-83, -265], [-6, -292], [82, -264], [131, -193], [113, -86], [157, 215], [-139, 215]], "#674898");
    path(ctx, [[-135, 60], [-87, -26], [83, -26], [139, 60], [115, 260], [-133, 260]], "#9169c8");
  } else {
    // Ears, hair silhouette, and natural 2D forehead.
    circle(ctx, -114, -113, 26, 39, skin);
    circle(ctx, 114, -113, 26, 39, skin);
  }
  // Face
  circle(ctx, 0, -155, 112, 131, skin);
  circle(ctx, -72, -98, 28, 10, "#df9676");
  circle(ctx, 72, -98, 28, 10, "#df9676");
  if (!isLayla) {
    const hair = isOmar ? "#332c34" : "#32202b";
    circle(ctx, -35, -267, 90, 62, hair);
    circle(ctx, 65, -260, 62, 64, hair);
    path(ctx, [[-107, -218], [-130, -270], [-90, -310], [-15, -287], [-65, -231]], hair);
    path(ctx, [[10, -280], [93, -305], [119, -245], [76, -237]], hair);
  } else {
    stroke(ctx, [[-97, -223], [-44, -289], [35, -279], [105, -203]], "#4f336f", 20);
  }
  // Brows & blinking eyes
  stroke(ctx, [[-82, -207], [-49, -218], [-20, -209]], outline, 8);
  stroke(ctx, [[25, -209], [54, -218], [85, -207]], outline, 8);
  const blink = Math.abs(Math.sin(t * 1.37)) > .992 ? .12 : 1;
  circle(ctx, -52, -170, 26, 30 * blink, "#ffffff");
  circle(ctx, 52, -170, 26, 30 * blink, "#ffffff");
  if (blink > .3) {
    circle(ctx, -45, -169, 13, 18, "#3b2932");
    circle(ctx, 59, -169, 13, 18, "#3b2932");
    circle(ctx, -42, -178, 4, 5, "#ffffff");
    circle(ctx, 62, -178, 4, 5, "#ffffff");
  }
  stroke(ctx, [[-4, -147], [5, -124], [-2, -120]], "#d58b73", 4);
  // Mouth reacts to measured volume; this is amplitude-driven, not phoneme-level lipsync.
  const open = Math.max(.10, Math.min(1, mouth));
  circle(ctx, 0, -83, 20 + open * 5, 5 + open * 31, "#71303c");
  if (open > .35) {
    circle(ctx, 0, -73 + open * 4, 12, 5 + open * 6, "#e67e8e");
    round(ctx, -14, -93 - open * 3, 28, 6, 3, "#ffffff");
  }
  if (isOmar) {
    // Eyeglasses drawn above eyes
    ctx.strokeStyle = "#252c39"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.roundRect(-91, -207, 78, 64, 18); ctx.roundRect(13, -207, 78, 64, 18); ctx.stroke();
    stroke(ctx, [[-13, -181], [13, -181]], "#252c39", 7);
  }
  // Neckline and jacket seams
  path(ctx, [[-36, 48], [0, 112], [37, 48]], "#fff7ee");
  stroke(ctx, [[-67, 91], [-20, 220]], isLayla ? "#c8b2f7" : "#fff0c8", 7);
  stroke(ctx, [[74, 91], [28, 220]], isLayla ? "#c8b2f7" : "#fff0c8", 7);
  ctx.restore();
}
function drawRobot(ctx: Ctx, t: number, mouth: number, motion: string) {
  ctx.save(); ctx.translate(360, 690 + Math.sin(t * 3) * 7);
  const wave = motion === "wave" ? Math.sin(t * 7) * 45 : 0;
  round(ctx, -149, 40, 300, 280, 60, "#4e85c9");
  round(ctx, -125, 78, 250, 215, 36, "#8fd5f2");
  round(ctx, -176, 110 - wave, 48, 155, 24, "#3d73a7");
  round(ctx, 128, 110 + wave, 48, 155, 24, "#3d73a7");
  round(ctx, -131, -255, 262, 250, 65, "#4486c0");
  round(ctx, -112, -234, 224, 195, 44, "#dff9ff");
  circle(ctx, -59, -150, 25, 30, "#253758");
  circle(ctx, 59, -150, 25, 30, "#253758");
  circle(ctx, -52, -161, 8, 10, "#ffffff");
  circle(ctx, 66, -161, 8, 10, "#ffffff");
  round(ctx, -42, -100, 84, 9 + Math.max(0, mouth) * 45, 12, "#273a5c");
  stroke(ctx, [[0, -255], [0, -299]], "#32689b", 13);
  circle(ctx, 0, -309, 18, 18, "#f5b94f");
  round(ctx, -85, 115, 170, 70, 30, "#356a9a");
  circle(ctx, -38, 148, 14, 14, "#64f0cd");
  circle(ctx, 9, 148, 14, 14, "#ffe296");
  ctx.restore();
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
  const mouth = scene.motion === "idle" ? .06 : Math.min(1, .11 + voiceAmplitude * 2.7);
  if (scene.character === "nour") drawRobot(ctx, seconds, mouth, scene.motion);
  else drawHuman(ctx, scene.character, seconds, mouth, scene.motion);
  // A gentle transition that never obscures captions for the entire first frame.
  if (scene.transition === "fade" && elapsed < .32) {
    ctx.fillStyle = "rgba(255,255,255," + (0.7 * (1 - elapsed / .32)) + ")";
    ctx.fillRect(0, 0, W, H);
  }
  drawCopy(ctx, project, scene.headline, scene.caption, scene.theme);
  ctx.restore();
}
