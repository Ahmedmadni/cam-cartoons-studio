/**
 * Deterministic, layered 2D vector character rigs.
 * No generated human image, webcam or network request is involved.
 * The mouth poses are animation shapes driven by audio energy, NOT phoneme recognition.
 */
import type { CartoonId, SceneExpression, SceneMotion } from "./socialStudio";

type Ctx = CanvasRenderingContext2D;
type Human = Exclude<CartoonId, "nour">;
type Palette = { skin: string; shade: string; light: string; hair: string; hairLight: string; shirt: string; shirtShade: string; eye: string; eyebrow: string; blush: string };
const palettes: Record<Human, Palette> = {
  sami: { skin: "#f6b78f", shade: "#d9866f", light: "#ffd6af", hair: "#2e2539", hairLight: "#604353", shirt: "#efac35", shirtShade: "#d9832d", eye: "#2b2432", eyebrow: "#332535", blush: "#e68b86" },
  layla: { skin: "#f4c3a9", shade: "#d89284", light: "#ffddbf", hair: "#5c367c", hairLight: "#9167b4", shirt: "#9567d0", shirtShade: "#6e47b2", eye: "#362d41", eyebrow: "#5e3a59", blush: "#e9a1a0" },
  omar: { skin: "#dca47d", shade: "#b57b62", light: "#f1bd95", hair: "#302c35", hairLight: "#61515b", shirt: "#329f8c", shirtShade: "#247b7a", eye: "#252936", eyebrow: "#3b3134", blush: "#c9887a" },
};
const circle = (c: Ctx, x: number, y: number, rx: number, ry: number, fill: string) => {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
};
const path = (c: Ctx, fill: string, draw: (c: Ctx) => void) => {
  c.beginPath(); draw(c); c.closePath(); c.fillStyle = fill; c.fill();
};
const line = (c: Ctx, color: string, width: number, draw: (c: Ctx) => void) => {
  c.beginPath(); draw(c); c.strokeStyle = color; c.lineWidth = width;
  c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
};
const rounded = (c: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) => {
  c.beginPath(); c.roundRect(x,y,w,h,r); c.fillStyle = fill; c.fill();
};
const mix = (a: number, b: number, t: number) => a + (b-a)*t;
const clamp = (x:number,min=0,max=1)=>Math.max(min,Math.min(max,x));

type Pose = { expression: SceneExpression; motion: SceneMotion; time: number; energy: number };
function blinkAt(t:number) {
  const phase = (t + 1.3) % 4.6;
  const short = phase < .08 ? phase / .08 : phase < .17 ? ( .17-phase)/.09 : 0;
  return 1 - .96 * clamp(short);
}
function drawTorso(c:Ctx,p:Palette,motion:SceneMotion,t:number,veil:boolean) {
  // Back arm and articulated near-hand: separate layers from body silhouette.
  c.save(); c.translate(-134,125); c.rotate(-.03 + (motion==="explain" ? Math.sin(t*2.9)*.09 : 0));
  path(c,p.shirtShade,x=>{x.moveTo(-40,0);x.bezierCurveTo(-78,55,-64,172,-38,239);x.lineTo(26,241);x.bezierCurveTo(20,150,45,75,25,4);});
  circle(c,-10,235,31,37,p.skin); circle(c,1,224,22,19,p.light);
  c.restore();
  c.save(); c.translate(133,120);
  const waving = motion==="wave";
  const explaining = motion==="explain";
  c.rotate(waving ? -.98+Math.sin(t*6)*.20 : explaining ? -.64+Math.sin(t*3)*.12 : -.04);
  path(c,p.shirtShade,x=>{x.moveTo(-20,10);x.bezierCurveTo(-2,-9,45,-6,55,17);x.lineTo(61,187);x.bezierCurveTo(37,227,-8,202,-16,170);});
  circle(c,35,185,32,37,p.skin);
  for(let n=0;n<4;n++) {
    const dx=n*13-3;
    line(c,p.shade,3,x=>{x.moveTo(dx,188);x.lineTo(dx+2,203);});
  }
  circle(c,24,175,20,13,p.light);
  c.restore();
  // Torso: hem, collar and inner T-shirt
  path(c,p.shirt,x=>{
    x.moveTo(-75,38);x.bezierCurveTo(-128,48,-158,65,-176,120);
    x.lineTo(-197,316);x.lineTo(194,316);x.lineTo(176,116);
    x.bezierCurveTo(163,65,130,49,73,38);x.quadraticCurveTo(0,88,-75,38);
  });
  path(c,p.shirtShade,x=>{x.moveTo(143,67);x.quadraticCurveTo(166,96,174,156);x.lineTo(189,316);x.lineTo(147,316);x.closePath();});
  path(c,"#fff9ee",x=>{x.moveTo(-49,49);x.quadraticCurveTo(0,133,49,49);x.lineTo(33,154);x.lineTo(-34,154);});
  line(c,p.shirtShade,5,x=>{x.moveTo(-108,90);x.lineTo(-120,290);x.moveTo(110,88);x.lineTo(121,290);});
  if(veil) {
    // Scarf drapes over shoulders, without covering garment completely.
    path(c,p.hair,x=>{x.moveTo(-113,-92);x.bezierCurveTo(-150,-12,-138,95,-144,215);x.lineTo(-103,305);x.quadraticCurveTo(-79,100,-63,35);x.lineTo(76,28);x.quadraticCurveTo(112,122,123,306);x.lineTo(165,243);x.quadraticCurveTo(157,-30,117,-131);});
    path(c,p.hairLight,x=>{x.moveTo(93,-35);x.quadraticCurveTo(142,91,136,233);x.lineTo(121,281);x.quadraticCurveTo(112,103,66,0);});
  }
  // Neck is deliberately behind jaw and above shirt collar.
  rounded(c,-35,4,70,88,22,p.shade);
  rounded(c,-29,6,58,74,18,p.skin);
}
function mouthShape(c:Ctx,energy:number,t:number,expression:SceneExpression,p:Palette) {
  const speaking=clamp(energy);
  const pose = speaking < .10 ? 0 : speaking<.28 ? 1 : speaking<.52 ? 2 : speaking<.77 ? 3 : 4;
  c.save();c.translate(0,-73);
  if(expression==="happy" && pose===0) {
    line(c,"#963f4d",5,x=>{x.moveTo(-22,-5);x.quadraticCurveTo(0,18,24,-5);});
    circle(c,-21,-5,3,3,"#963f4d");circle(c,24,-5,3,3,"#963f4d");
  } else if(expression==="serious" && pose===0) {
    line(c,"#813f46",5,x=>{x.moveTo(-20,1);x.quadraticCurveTo(0,-3,20,2);});
  } else if(pose===0) {
    path(c,"#8c414c",x=>{x.moveTo(-20,0);x.quadraticCurveTo(0,11,20,0);x.quadraticCurveTo(0,5,-20,0);});
  } else {
    const w=pose===1?20:pose===2?16:pose===3?27:33;
    const h=pose===1?10:pose===2?24:pose===3?25:36;
    circle(c,0,2,w,h,"#782c43");
    if(pose!==2) {
      path(c,"#fff5ee",x=>{x.moveTo(-w+4,-h/2);x.quadraticCurveTo(0,-h/2+7,w-4,-h/2);x.lineTo(w-7,-h/2+6);x.quadraticCurveTo(0,-h/2+12,-w+7,-h/2+6);});
    }
    circle(c,1,h/2+1,w*.57,h*.22,"#eb8092");
  }
  c.restore();
  if(expression==="surprised" && speaking<.10) {
    circle(c,0,-73,13,19,"#813f48");
  }
  // Small breathing motion below lower lip.
  if(speaking>.52) line(c,p.shade,2,x=>{x.moveTo(-5,-32);x.quadraticCurveTo(0,-30+Math.sin(t*4)*2,6,-32);});
}
function eyes(c:Ctx,t:number,p:Palette,expression:SceneExpression,glasses:boolean) {
  const openness = blinkAt(t);
  const raised = expression==="surprised" ? -14 : expression==="curious" ? -7 : expression==="serious" ? 7 : -1;
  const gaze = Math.sin(t*.83)*3;
  // eyebrows move independently of eye frames
  line(c,p.eyebrow,7,x=>{x.moveTo(-81,-204+raised);x.quadraticCurveTo(-53,-220+raised,-23,-208+raised);});
  line(c,p.eyebrow,7,x=>{x.moveTo(24,-208+raised);x.quadraticCurveTo(56,-220+(expression==="curious"? -14 : raised),83,-204+raised);});
  for(const sign of [-1,1]) {
    const ex=sign*53;
    circle(c,ex,-167,26,30*openness,"#fffdfb");
    if(openness>.32){
      circle(c,ex+gaze*sign,-167,13,18,p.eye);
      circle(c,ex+gaze*sign+4,-175,4.5,6,"#ffffff");
      circle(c,ex+gaze*sign-3,-162,2,3,"#dbc9ba");
    } else {
      line(c,p.eyebrow,4,x=>{x.moveTo(ex-20,-167);x.quadraticCurveTo(ex,-164,ex+20,-167);});
    }
  }
  if(glasses) {
    c.lineWidth=6;c.strokeStyle="#2c3945";
    c.beginPath();c.roundRect(-90,-200,78,68,18);c.roundRect(13,-200,78,68,18);c.stroke();
    line(c,"#2c3945",5,x=>{x.moveTo(-12,-177);x.quadraticCurveTo(0,-184,13,-177);});
    line(c,"#2c3945",5,x=>{x.moveTo(-90,-181);x.lineTo(-109,-189);x.moveTo(91,-181);x.lineTo(109,-189);});
    circle(c,-78,-193,4,3,"#ffffff");
  }
}
function hairBack(c:Ctx,id:Human,p:Palette) {
  if(id==="layla") {
    path(c,p.hair,x=>{x.moveTo(-133,-144);x.bezierCurveTo(-159,-232,-106,-299,7,-304);x.bezierCurveTo(110,-300,143,-227,129,-140);x.lineTo(117,9);x.lineTo(-122,9);});
    path(c,p.hairLight,x=>{x.moveTo(-80,-268);x.quadraticCurveTo(14,-327,94,-267);x.quadraticCurveTo(122,-244,125,-198);x.quadraticCurveTo(70,-296,-80,-268);});
  } else {
    path(c,p.hair,x=>{
      x.moveTo(-119,-148);x.bezierCurveTo(-149,-219,-129,-291,-65,-307);
      x.bezierCurveTo(11,-348,112,-303,125,-239);
      x.quadraticCurveTo(147,-174,113,-128);x.lineTo(-108,-124);
    });
  }
}
function hairFront(c:Ctx,id:Human,p:Palette) {
  if(id==="layla") {
    line(c,p.hair,23,x=>{x.moveTo(-102,-205);x.bezierCurveTo(-94,-293,40,-317,110,-227);});
    line(c,p.hairLight,8,x=>{x.moveTo(-81,-229);x.quadraticCurveTo(-29,-290,39,-275);});
  } else if(id==="sami") {
    path(c,p.hair,x=>{x.moveTo(-122,-218);x.quadraticCurveTo(-148,-303,-58,-313);x.quadraticCurveTo(15,-350,82,-305);x.quadraticCurveTo(126,-274,120,-213);x.quadraticCurveTo(88,-248,61,-270);x.quadraticCurveTo(13,-206,-34,-210);x.quadraticCurveTo(-78,-186,-122,-218);});
    path(c,p.hair,x=>{x.moveTo(-80,-250);x.quadraticCurveTo(-55,-306,-18,-326);x.quadraticCurveTo(-82,-321,-113,-273);});
    line(c,p.hairLight,8,x=>{x.moveTo(-99,-279);x.quadraticCurveTo(-53,-317,-19,-302);});
  } else {
    path(c,p.hair,x=>{x.moveTo(-113,-218);x.quadraticCurveTo(-124,-296,-61,-304);x.quadraticCurveTo(2,-317,60,-295);x.quadraticCurveTo(104,-305,120,-252);x.quadraticCurveTo(71,-261,34,-247);x.quadraticCurveTo(-7,-232,-42,-254);x.quadraticCurveTo(-81,-222,-113,-218);});
    line(c,p.hairLight,7,x=>{x.moveTo(-70,-281);x.quadraticCurveTo(-24,-305,20,-279);});
  }
}
function drawHuman(c:Ctx,id:Human,pose:Pose){
  const p=palettes[id];const veil=id==="layla", glasses=id==="omar";
  const t=pose.time, motion=pose.motion, expr=pose.expression;
  const bob=(motion==="idle"?2:5)*Math.sin(t*2.9), lean=(motion==="explain"? .035*Math.sin(t*2.2):0);
  c.save();c.translate(360,684+bob);c.rotate(lean);
  hairBack(c,id,p);
  drawTorso(c,p,motion,t,veil);
  // Rear ears and cheek surfaces
  if(!veil){circle(c,-110,-122,24,36,p.shade);circle(c,110,-122,24,36,p.shade);
    circle(c,-112,-125,15,24,p.skin);circle(c,112,-125,15,24,p.skin);}
  // Real tapered jaw, cheeks, forehead + soft under-jaw shading
  path(c,p.shade,x=>{x.moveTo(-106,-204);x.bezierCurveTo(-126,-139,-99,-42,-37,-19);x.quadraticCurveTo(0,1,37,-19);x.bezierCurveTo(100,-51,121,-137,106,-204);x.quadraticCurveTo(11,-306,-106,-204);});
  path(c,p.skin,x=>{x.moveTo(-105,-209);x.bezierCurveTo(-121,-157,-96,-52,-28,-27);x.quadraticCurveTo(0,-15,27,-27);x.bezierCurveTo(100,-52,119,-144,105,-211);x.quadraticCurveTo(0,-305,-105,-209);});
  // Cheek glow; restrained so that rendered art remains legible at phone size.
  circle(c,-78,-97,27,14,p.blush);circle(c,79,-97,27,14,p.blush);
  c.globalAlpha=.33;circle(c,-70,-110,29,10,p.light);circle(c,73,-110,29,10,p.light);c.globalAlpha=1;
  line(c,p.shade,4,x=>{x.moveTo(-5,-144);x.quadraticCurveTo(7,-122,-2,-121);});
  eyes(c,t,p,expr,glasses);
  mouthShape(c,pose.energy,t,expr,p);
  hairFront(c,id,p);
  // Collar seam on top of neckline
  line(c,"#ffffff",6,x=>{x.moveTo(-48,50);x.quadraticCurveTo(0,99,48,50);});
  c.restore();
}
function drawRobot(c:Ctx,pose:Pose){
  const t=pose.time,energy=pose.energy,expr=pose.expression;
  c.save();c.translate(360,684+Math.sin(t*3)*5);
  const wave=pose.motion==="wave"?Math.sin(t*6)*34:0;
  path(c,"#3979bd",x=>{x.moveTo(-142,68);x.quadraticCurveTo(-173,105,-160,240);x.lineTo(-117,308);x.lineTo(126,308);x.quadraticCurveTo(165,252,157,130);x.quadraticCurveTo(151,79,116,65);});
  rounded(c,-127,92,254,210,49,"#8ad9f0");
  c.save();c.translate(-146,132);c.rotate(wave*.012);rounded(c,-24,-8,51,159,25,"#315f9d");circle(c,1,150,24,28,"#8dd2ed");c.restore();
  c.save();c.translate(146,132);c.rotate(-wave*.012);rounded(c,-26,-8,51,159,25,"#315f9d");circle(c,-1,150,24,28,"#8dd2ed");c.restore();
  rounded(c,-139,-275,278,259,65,"#326fae");
  rounded(c,-117,-252,234,209,45,"#e7f9ff");
  c.globalAlpha=.46;rounded(c,-96,-232,194,22,12,"#ffffff");c.globalAlpha=1;
  const blink=blinkAt(t);
  for(const sign of [-1,1]) {
    circle(c,sign*59,-161,26,30*blink,"#213755");
    if(blink>.28)circle(c,sign*59+6,-171,7,9,"#ffffff");
  }
  const open=clamp(energy);
  if(expr==="happy"&&open<.10)line(c,"#325271",6,x=>{x.moveTo(-33,-97);x.quadraticCurveTo(0,-64,33,-97);});
  else rounded(c,-38,-106,76,mix(9,44,open),14,"#243b5b");
  line(c,"#3a6f9f",13,x=>{x.moveTo(0,-275);x.lineTo(0,-310);});
  circle(c,0,-323,19,19,"#ffcb54");
  rounded(c,-86,149,172,80,26,"#376ea3");
  circle(c,-38,189,15,15,"#80f4cf");circle(c,16,189,15,15,"#fdd66e");
  c.restore();
}

export function renderCartoonCharacter(
  ctx: Ctx,
  character: CartoonId,
  time: number,
  energy: number,
  motion: SceneMotion,
  expression: SceneExpression = "happy",
) {
  const pose:Pose = { time, energy:clamp(energy), motion, expression };
  if(character==="nour") drawRobot(ctx,pose);
  else drawHuman(ctx,character,pose);
}
