/**
 * Illustration-first, organic 2D characters for the social video editor.
 *
 * Every human uses a continuous, hand-contoured silhouette. Arms overlap at their
 * actual shoulders, hands grow out of sleeves, and the neck is hidden behind
 * the chin/collar. Curved cubic paths and clipped colour washes replace the
 * previous pile of detached ellipses/rectangles.
 *
 * Canvas preview and exported frames use this exact same renderer.
 * Facial animation is still voice-envelope based, not phoneme recognition.
 */
import type { CartoonId, SceneExpression, SceneMotion } from "./socialStudio";

type C = CanvasRenderingContext2D;
type Person = Exclude<CartoonId, "nour">;
type Ink = {
  skin: string; skinLight: string; skinShade: string; blush: string;
  hair: string; hairLight: string; clothes: string; clothesShade: string;
  clothesLight: string; outline: string; scarf?: string; scarfLight?: string;
};
const palette: Record<Person, Ink> = {
  sami: {
    skin:"#f6b18e",skinLight:"#ffd7b4",skinShade:"#da8872",blush:"#ea9b91",
    hair:"#292030",hairLight:"#5e3c40",clothes:"#f7b638",clothesShade:"#d88a2e",
    clothesLight:"#ffd36e",outline:"#633a3c",
  },
  layla: {
    skin:"#efbc9f",skinLight:"#ffe0c2",skinShade:"#cc8d80",blush:"#e9a49d",
    hair:"#5f457a",hairLight:"#9672ad",clothes:"#aa78cb",clothesShade:"#76559f",
    clothesLight:"#cba8e7",outline:"#674b68",scarf:"#dac7e7",scarfLight:"#f2e3f0",
  },
  omar: {
    skin:"#d89f78",skinLight:"#efc29a",skinShade:"#ae755e",blush:"#bf8a76",
    hair:"#332b35",hairLight:"#65505b",clothes:"#348e82",clothesShade:"#23746a",
    clothesLight:"#72beb0",outline:"#543f45",
  },
};
type Brush = string | CanvasGradient;
const fill = (c:C, brush:Brush, draw:(ctx:C)=>void) => {
  c.beginPath();draw(c);c.closePath();c.fillStyle=brush;c.fill();
};
const stroke = (c:C,color:string,width:number,draw:(ctx:C)=>void) => {
  c.beginPath();draw(c);c.lineWidth=width;c.lineCap="round";c.lineJoin="round";c.strokeStyle=color;c.stroke();
};
const oval = (c:C,x:number,y:number,rx:number,ry:number,color:Brush) => {
  c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();
};
const gradient = (c:C,y1:number,y2:number,colors:string[]):CanvasGradient => {
  const g=c.createLinearGradient(-125,y1,145,y2);
  colors.forEach((v,i)=>g.addColorStop(i/(colors.length-1),v));
  return g;
};
const soft = (c:C,opacity:number,fn:()=>void)=>{
  c.save();c.globalAlpha=opacity;fn();c.restore();
};
function blink(time:number) {
  // smooth, occasional blink that doesn't get stuck closed at specific frames
  const phase=(time+1.6)%4.15;
  if(phase>.19)return 1;
  return .12+.88*Math.abs(phase-.095)/.095;
}
function drawClothing(c:C,id:Person,ink:Ink,pose:SceneMotion,time:number){
  const sleeve=gradient(c,60,370,[ink.clothesLight,ink.clothes,ink.clothesShade]);
  // One continuous coat + both hanging arms: the seams are cosmetic, not gaps.
  fill(c,ink.outline,x=>{
    x.moveTo(-87,55);
    x.bezierCurveTo(-133,62,-161,86,-178,131);
    x.bezierCurveTo(-197,184,-198,264,-213,357);
    x.lineTo(212,357);
    x.bezierCurveTo(197,265,199,183,178,129);
    x.bezierCurveTo(158,80,133,62,87,55);
    x.bezierCurveTo(24,67,-20,66,-87,55);
  });
  fill(c,sleeve,x=>{
    x.moveTo(-85,61);
    x.bezierCurveTo(-131,68,-156,96,-171,141);
    x.bezierCurveTo(-188,192,-190,260,-205,352);
    x.lineTo(204,352);
    x.bezierCurveTo(187,262,190,194,171,141);
    x.bezierCurveTo(157,94,132,69,86,61);
    x.bezierCurveTo(21,70,-26,71,-85,61);
  });
  // Rounded shoulder creases and soft fabric shading.
  soft(c,.28,()=>fill(c,ink.clothesLight,x=>{
    x.moveTo(-145,99);x.bezierCurveTo(-183,156,-167,253,-155,296);
    x.bezierCurveTo(-151,207,-131,144,-101,99);
  }));
  soft(c,.30,()=>fill(c,ink.clothesShade,x=>{
    x.moveTo(144,96);x.bezierCurveTo(177,140,169,258,172,324);
    x.bezierCurveTo(147,279,150,175,120,115);
  }));
  // Inner white shirt joins the neckline. Collar is drawn over neck later.
  fill(c,"#fff7ee",x=>{
    x.moveTo(-45,66);x.quadraticCurveTo(0,118,45,66);
    x.lineTo(55,164);x.quadraticCurveTo(0,179,-55,164);
  });
  soft(c,.52,()=>fill(c,"#d6dcea",x=>{
    x.moveTo(27,104);x.quadraticCurveTo(37,140,54,160);
    x.lineTo(25,168);x.quadraticCurveTo(32,142,27,104);
  }));
  // Jacket lapels/collar flow from neck onto torso.
  fill(c,ink.clothesLight,x=>{
    x.moveTo(-80,67);x.lineTo(-44,70);x.quadraticCurveTo(-24,113,0,128);
    x.quadraticCurveTo(-61,130,-80,67);
  });
  fill(c,ink.clothesShade,x=>{
    x.moveTo(80,67);x.lineTo(43,71);x.quadraticCurveTo(22,115,0,128);
    x.quadraticCurveTo(62,131,80,67);
  });
  stroke(c,ink.clothesShade,3,x=>{
    x.moveTo(-104,148);x.bezierCurveTo(-112,201,-113,248,-113,327);
    x.moveTo(107,149);x.bezierCurveTo(112,201,113,251,114,329);
  });
  soft(c,.70,()=>stroke(c,ink.clothesLight,2,x=>{
    x.moveTo(-94,148);x.bezierCurveTo(-97,203,-99,252,-101,322);
  }));
  // Shirt chest button/pocket, drawn on fabric not as separate components.
  stroke(c,ink.clothesShade,3,x=>{
    x.moveTo(40,215);x.lineTo(90,215);x.lineTo(90,264);
    x.quadraticCurveTo(66,274,40,264);x.closePath();
  });
  for(let n=0;n<3;n++)oval(c,17,182+n*64,3,4,"#ffe7ac");
  if(id==="omar"){
    // Presenter glasses character wears a tie; still below the actual neck.
    fill(c,"#2d6270",x=>{x.moveTo(-12,127);x.lineTo(13,127);x.lineTo(19,164);
      x.lineTo(0,247);x.lineTo(-20,164);});
    fill(c,"#c9e3e1",x=>{x.moveTo(-47,80);x.lineTo(-13,129);x.lineTo(-22,146);
      x.quadraticCurveTo(-62,110,-47,80);});
  }
  // If gesturing, a connected sleeve is painted over the shoulder.
  if(pose==="explain"||pose==="wave"){
    const wave=pose==="wave";
    const sway=Math.sin(time*(wave?5:2.7))*10;
    const handX=wave?188+sway:210+sway;
    const handY=wave?-87:43;
    // Curved forearm bent from shoulder -> elbow -> wrist in a single sleeve.
    fill(c,ink.outline,x=>{
      x.moveTo(103,83);
      x.bezierCurveTo(152,78,182,96,193,129);
      x.bezierCurveTo(203,101,194,49,handX-10,handY+42);
      x.lineTo(handX+22,handY+56);
      x.bezierCurveTo(244,119,229,183,202,194);
      x.bezierCurveTo(163,213,127,145,102,122);
    });
    fill(c,gradient(c,50,230,[ink.clothesLight,ink.clothes,ink.clothesShade]),x=>{
      x.moveTo(103,88);
      x.bezierCurveTo(145,83,178,100,187,136);
      x.bezierCurveTo(200,114,194,50,handX-6,handY+46);
      x.lineTo(handX+18,handY+60);
      x.bezierCurveTo(230,122,222,177,198,187);
      x.bezierCurveTo(169,204,127,140,103,115);
    });
    // Visible wrist directly touches sleeve; five fingers curve organically.
    fill(c,ink.skinShade,x=>{
      x.moveTo(handX-10,handY+56);
      x.quadraticCurveTo(handX-27,handY+31,handX-28,handY+5);
      x.bezierCurveTo(handX-27,handY-15,handX-15,handY-15,handX-9,handY-3);
      x.lineTo(handX-9,handY-40);
      x.quadraticCurveTo(handX-5,handY-55,handX+3,handY-43);
      x.lineTo(handX+6,handY-54);
      x.quadraticCurveTo(handX+14,handY-66,handX+19,handY-48);
      x.lineTo(handX+20,handY-50);
      x.quadraticCurveTo(handX+30,handY-61,handX+32,handY-39);
      x.lineTo(handX+31,handY-29);
      x.quadraticCurveTo(handX+45,handY-46,handX+48,handY-28);
      x.bezierCurveTo(handX+58,handY+14,handX+30,handY+47,handX+22,handY+60);
      x.closePath();
    });
    soft(c,.65,()=>fill(c,ink.skinLight,x=>{
      x.moveTo(handX-12,handY+48);x.bezierCurveTo(handX-18,handY+5,handX,handY-7,handX+12,handY+9);
      x.bezierCurveTo(handX+29,handY+18,handX+24,handY+44,handX+13,handY+51);
    }));
  }
}
function drawNeck(c:C,ink:Ink) {
  // Entire neck is rooted in collar and covered by facial chin.
  fill(c,ink.skinShade,x=>{
    x.moveTo(-43,-76);x.bezierCurveTo(-38,-29,-40,50,-22,70);
    x.quadraticCurveTo(0,86,24,70);
    x.bezierCurveTo(41,46,37,-33,45,-76);
  });
  fill(c,gradient(c,-58,70,[ink.skinLight,ink.skin,ink.skinShade]),x=>{
    x.moveTo(-34,-61);x.bezierCurveTo(-33,-19,-35,47,-17,65);
    x.quadraticCurveTo(0,76,17,65);
    x.bezierCurveTo(34,44,32,-17,34,-61);
  });
  soft(c,.4,()=>stroke(c,"#a56760",3,x=>{x.moveTo(-24,63);x.quadraticCurveTo(0,83,24,63);}));
}
function drawHairBehind(c:C,id:Person,ink:Ink) {
  if(id==="layla"){
    fill(c,gradient(c,-335,185,["#aa8fbd",ink.hair,"#483257"]),x=>{
      x.moveTo(-126,-182);x.bezierCurveTo(-147,-256,-96,-321,-6,-328);
      x.bezierCurveTo(103,-337,151,-250,139,-170);
      x.bezierCurveTo(154,-80,147,94,165,254);
      x.quadraticCurveTo(113,288,72,244);
      x.lineTo(-71,245);x.quadraticCurveTo(-131,278,-168,242);
      x.bezierCurveTo(-147,89,-154,-97,-126,-182);
    });
  } else {
    fill(c,ink.hair,x=>{
      x.moveTo(-117,-180);x.bezierCurveTo(-158,-241,-125,-310,-61,-320);
      x.bezierCurveTo(7,-357,104,-331,132,-272);
      x.bezierCurveTo(154,-225,128,-166,110,-153);
      x.lineTo(-105,-138);
    });
  }
}
function drawFace(c:C,id:Person,ink:Ink) {
  const faceGradient=gradient(c,-310,-11,[ink.skinLight,ink.skin,ink.skinShade]);
  // Unified facial outline including the ears, jawline and chin.
  const face=(x:C)=>{
    x.moveTo(0,-292);
    x.bezierCurveTo(-74,-300,-108,-267,-116,-206);
    x.bezierCurveTo(-126,-184,-128,-170,-127,-158);
    x.bezierCurveTo(-152,-168,-167,-149,-156,-126);
    x.bezierCurveTo(-145,-103,-121,-104,-114,-114);
    x.bezierCurveTo(-110,-70,-88,-35,-54,-19);
    x.quadraticCurveTo(0,18,54,-19);
    x.bezierCurveTo(88,-36,109,-74,115,-115);
    x.bezierCurveTo(132,-103,150,-105,158,-129);
    x.bezierCurveTo(166,-149,148,-167,127,-158);
    x.bezierCurveTo(129,-192,121,-241,91,-266);
    x.quadraticCurveTo(58,-294,0,-292);
  };
  fill(c,ink.outline,face);
  c.save();c.translate(0,3);c.scale(.977,.977);fill(c,faceGradient,face);c.restore();
  // Realistic ear inner contours and curved cheek planes.
  stroke(c,ink.skinShade,4,x=>{
    x.moveTo(-134,-151);x.bezierCurveTo(-153,-149,-148,-127,-133,-130);
    x.moveTo(134,-151);x.bezierCurveTo(155,-150,147,-125,134,-128);
  });
  soft(c,.35,()=>fill(c,ink.skinLight,x=>{
    x.moveTo(-70,-263);x.bezierCurveTo(-109,-225,-101,-164,-86,-138);
    x.bezierCurveTo(-113,-199,-76,-254,-45,-269);
  }));
  soft(c,.55,()=>oval(c,-84,-100,25,13,ink.blush));
  soft(c,.55,()=>oval(c,84,-100,25,13,ink.blush));
  if(id==="omar") {
    // Connected beard around jaw; leaves mouth uncovered for speech shapes.
    soft(c,.45,()=>fill(c,ink.hair,x=>{
      x.moveTo(-103,-87);x.bezierCurveTo(-88,-37,-48,-12,0,0);
      x.bezierCurveTo(44,-10,82,-39,104,-87);
      x.bezierCurveTo(77,-45,47,-20,0,-13);
      x.bezierCurveTo(-43,-23,-83,-52,-103,-87);
    }));
  }
}
function drawEyes(c:C,ink:Ink,expression:SceneExpression,t:number,glasses:boolean) {
  const lift = expression==="surprised"?-13:expression==="curious"?-8:expression==="serious"?5:0;
  const opening=blink(t);
  const pupilMotion=Math.sin(t*.71)*2.2;
  for(const sign of [-1,1]){
    const x=sign*51;
    stroke(c,ink.hair,8,q=>{
      q.moveTo(x-23,-212+lift);
      q.quadraticCurveTo(x,-222+lift,x+24,-209+lift);
    });
    // Upper eyelid follows round eyeball, never looks detached.
    fill(c,"#ffffff",q=>{
      q.moveTo(x-29,-181);
      q.bezierCurveTo(x-23,-208*0.96,x+15,-207,x+29,-178);
      q.bezierCurveTo(x+30,-144,x-25,-140,x-29,-181);
    });
    if(opening>.28){
      oval(c,x+pupilMotion,-172,15,19*opening,"#4d332f");
      oval(c,x+pupilMotion+1,-173,9,14*opening,"#211e2b");
      oval(c,x+pupilMotion+4,-181,5,7,"#ffffff");
      oval(c,x+pupilMotion-5,-166,2.4,3.1,"#d9c9be");
    } else stroke(c,ink.outline,4,q=>{q.moveTo(x-24,-171);q.quadraticCurveTo(x,-163,x+23,-170);});
    stroke(c,ink.outline,5,q=>{
      q.moveTo(x-29,-182);
      q.bezierCurveTo(x-22,-211,x+20,-210,x+29,-182);
    });
    soft(c,.5,()=>stroke(c,ink.skinShade,2,q=>{q.moveTo(x-21,-142);q.quadraticCurveTo(x,-137,x+20,-143);}));
  }
  if(glasses){
    stroke(c,"#344355",6,q=>{
      q.roundRect(-88,-210,79,73,20);
      q.roundRect(10,-210,79,73,20);
      q.moveTo(-9,-180);q.quadraticCurveTo(0,-187,10,-180);
      q.moveTo(-87,-177);q.lineTo(-111,-192);
      q.moveTo(88,-177);q.lineTo(113,-192);
    });
    soft(c,.6,()=>stroke(c,"#ffffff",3,q=>{
      q.moveTo(-73,-198);q.lineTo(-61,-204);
      q.moveTo(23,-198);q.lineTo(34,-204);
    }));
  }
}
function drawNose(c:C,ink:Ink){
  soft(c,.95,()=>stroke(c,ink.skinShade,3,q=>{
    q.moveTo(2,-166);q.bezierCurveTo(-7,-148,-1,-132,8,-134);
  }));
  soft(c,.8,()=>oval(c,4,-136,8,3,ink.skinLight));
}
function drawMouth(c:C,ink:Ink,expression:SceneExpression,energy:number){
  // Five stable natural mouth shapes. Blends into face; no floating face disc.
  const level=energy<.11?0:energy<.26?1:energy<.47?2:energy<.74?3:4;
  const smiling=expression==="happy"||expression==="surprised";
  if(!level){
    if(expression==="surprised"){
      oval(c,0,-91,13,19,"#804250");
      soft(c,.7,()=>oval(c,0,-99,7,4,"#e7a4a7"));
    } else {
      stroke(c,"#9e4d59",4,q=>{
        q.moveTo(-22,-91);
        q.quadraticCurveTo(0,smiling?-67:-88,22,-91);
      });
      soft(c,.4,()=>stroke(c,ink.skinShade,2,q=>{q.moveTo(-11,-78);q.quadraticCurveTo(0,-74,11,-78);}));
    }
    return;
  }
  const width=level===1?18:level===2?13:level===3?25:31;
  const height=level===1?12:level===2?22:level===3?24:32;
  fill(c,"#8a3e50",q=>{
    q.moveTo(-width,-93);
    q.bezierCurveTo(-width,-101,0,-103,width,-93);
    q.bezierCurveTo(width+3,-93+height,0,-93+height*1.75,-width-3,-93+height);
  });
  if(level!==2){
    fill(c,"#fff9f1",q=>{
      q.moveTo(-width+4,-94);q.quadraticCurveTo(0,-90,width-4,-94);
      q.quadraticCurveTo(width-1,-90,width-4,-86);
      q.quadraticCurveTo(0,-80,-width+4,-86);
    });
  }
  soft(c,.85,()=>oval(c,0,-93+height*1.28,width*.57,height*.19,"#f28894"));
  stroke(c,ink.skinShade,2,q=>{q.moveTo(-13,-72+height*.28);q.quadraticCurveTo(0,-66+height*.28,13,-72+height*.28);});
}
function drawTopHair(c:C,id:Person,ink:Ink) {
  if(id==="layla"){
    fill(c,gradient(c,-310,-152,[ink.scarfLight??"#eee1f0",ink.scarf??"#ccb0d7",ink.hairLight]),q=>{
      q.moveTo(-108,-220);
      q.bezierCurveTo(-113,-289,-59,-322,12,-322);
      q.bezierCurveTo(90,-319,121,-284,116,-220);
      q.bezierCurveTo(94,-263,59,-291,6,-283);
      q.bezierCurveTo(-44,-293,-78,-268,-108,-220);
    });
    stroke(c,ink.hairLight,7,q=>{q.moveTo(-98,-216);q.bezierCurveTo(-53,-290,45,-300,101,-232);});
    fill(c,ink.scarf??"#d2c0dd",q=>{
      q.moveTo(110,-236);q.bezierCurveTo(141,-196,132,-99,120,-29);
      q.bezierCurveTo(106,42,118,127,131,178);
      q.bezierCurveTo(82,149,66,72,77,10);
      q.bezierCurveTo(91,-61,103,-167,110,-236);
    });
    soft(c,.75,()=>stroke(c,ink.scarfLight??"#eee1f0",9,q=>{
      q.moveTo(119,-167);q.bezierCurveTo(104,-97,103,-17,111,54);
    }));
    return;
  }
  if(id==="sami"){
    // Broad sculpted forelock, tapered silhouette and three fine hair strands.
    fill(c,gradient(c,-345,-200,[ink.hairLight,ink.hair,ink.hair]),q=>{
      q.moveTo(-117,-208);
      q.bezierCurveTo(-161,-292,-105,-328,-43,-324);
      q.bezierCurveTo(19,-367,104,-328,126,-276);
      q.bezierCurveTo(140,-250,140,-213,117,-190);
      q.bezierCurveTo(108,-235,83,-266,50,-264);
      q.bezierCurveTo(58,-224,31,-209,17,-201);
      q.bezierCurveTo(22,-245,1,-263,-16,-263);
      q.bezierCurveTo(-49,-230,-83,-195,-117,-208);
    });
    fill(c,ink.hair,q=>{
      q.moveTo(-85,-291);q.bezierCurveTo(-133,-308,-141,-266,-131,-235);
      q.bezierCurveTo(-157,-258,-157,-310,-111,-321);
    });
    stroke(c,ink.hairLight,6,q=>{
      q.moveTo(-103,-291);q.bezierCurveTo(-66,-332,-13,-340,20,-318);
      q.moveTo(54,-312);q.bezierCurveTo(87,-302,109,-273,111,-244);
    });
  } else {
    fill(c,gradient(c,-333,-185,[ink.hairLight,ink.hair,ink.hair]),q=>{
      q.moveTo(-113,-211);q.bezierCurveTo(-137,-284,-95,-323,-34,-326);
      q.bezierCurveTo(41,-347,123,-314,126,-247);
      q.bezierCurveTo(88,-261,69,-266,35,-255);
      q.bezierCurveTo(-7,-248,-34,-266,-54,-256);
      q.bezierCurveTo(-76,-232,-98,-222,-113,-211);
    });
    soft(c,.8,()=>stroke(c,ink.hairLight,6,q=>{
      q.moveTo(-88,-287);q.bezierCurveTo(-32,-315,23,-305,54,-290);
    }));
  }
}
function drawPerson(c:C,id:Person,time:number,energy:number,motion:SceneMotion,expression:SceneExpression) {
  const ink=palette[id];
  c.save();
  c.translate(360,711+Math.sin(time*2.6)*3);
  c.rotate(motion==="explain"?Math.sin(time*1.9)*.015:0);
  // All body regions intentionally overlap, so there are no jigsaw-like joints.
  drawHairBehind(c,id,ink);
  drawClothing(c,id,ink,motion,time);
  drawNeck(c,ink);
  drawFace(c,id,ink);
  drawEyes(c,ink,expression,time,id==="omar");
  drawNose(c,ink);
  drawMouth(c,ink,expression,motion==="idle"?0:energy);
  drawTopHair(c,id,ink);
  c.restore();
}
function drawRobot(c:C,time:number,energy:number,motion:SceneMotion,expression:SceneExpression) {
  // Robots are designed as one seamless capsule body rather than floating circles.
  c.save();c.translate(360,711+Math.sin(time*2.5)*3);
  const shell=gradient(c,-200,360,["#c7f4ff","#5bb4e7","#3375b7"]);
  fill(c,"#295986",q=>{
    q.moveTo(-75,32);q.bezierCurveTo(-156,45,-188,123,-188,206);
    q.bezierCurveTo(-195,273,-167,335,0,344);
    q.bezierCurveTo(158,332,193,274,189,207);
    q.bezierCurveTo(185,124,155,48,75,32);
  });
  c.save();c.translate(0,-3);c.scale(.97,.97);
  fill(c,shell,q=>{
    q.moveTo(-75,32);q.bezierCurveTo(-156,45,-188,123,-188,206);
    q.bezierCurveTo(-195,273,-167,335,0,344);
    q.bezierCurveTo(158,332,193,274,189,207);
    q.bezierCurveTo(185,124,155,48,75,32);
  });c.restore();
  fill(c,"#295986",q=>{
    q.moveTo(-115,-204);q.bezierCurveTo(-123,-277,-64,-315,0,-315);
    q.bezierCurveTo(66,-316,123,-277,116,-205);
    q.lineTo(107,-57);q.quadraticCurveTo(0,2,-107,-57);
  });
  fill(c,gradient(c,-290,-54,["#f7fdff","#c9f6ff","#7abce5"]),q=>{
    q.moveTo(-104,-199);q.bezierCurveTo(-113,-263,-50,-292,0,-292);
    q.bezierCurveTo(55,-293,110,-263,103,-199);
    q.lineTo(93,-76);q.quadraticCurveTo(0,-28,-93,-76);
  });
  const openness=blink(time);
  for(const s of [-1,1]){
    oval(c,s*53,-181,24,26*openness,"#263b61");
    if(openness>.3)oval(c,s*53+7,-190,6,7,"#ffffff");
  }
  if(energy>.12){
    oval(c,0,-108,24,7+Math.min(1,energy)*23,"#28476a");
  } else stroke(c,"#2c4f76",5,q=>{
    q.moveTo(-22,-111);q.quadraticCurveTo(0,expression==="happy"?-91:-106,22,-111);
  });
  stroke(c,"#43749d",12,q=>{q.moveTo(0,-315);q.lineTo(0,-341);});
  oval(c,0,-353,15,15,"#ffc55a");
  oval(c,-31,178,18,18,"#b3ffde");
  oval(c,32,178,18,18,"#ffdf83");
  soft(c,.65,()=>stroke(c,"#d8fbff",6,q=>{
    q.moveTo(-142,126);q.bezierCurveTo(-152,158,-153,205,-146,238);
  }));
  c.restore();
}
export function renderCartoonCharacter(
  ctx:C, character:CartoonId, time:number, energy:number,
  motion:SceneMotion, expression:SceneExpression="happy",
){
  const value=Number.isFinite(energy)?Math.max(0,Math.min(1,energy)):0;
  if(character==="nour")drawRobot(ctx,time,value,motion,expression);
  else drawPerson(ctx,character,time,value,motion,expression);
}
