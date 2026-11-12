/**
 * Genuine cut-out rig renderer. Each joint only moves its own artist-supplied
 * full-frame transparent part and its descendants. A flattened screenshot
 * cannot be "articulated" and is intentionally left in the still fallback.
 */
import type { CharacterArt } from "./socialCharacterArt";
import { type RigPose, type RigSettings, type RigPoint } from "./characterRig";
const W=488,H=644,X=360-W/2,Y=249;
function draw(ctx:CanvasRenderingContext2D,img:ImageBitmap | undefined){
  if(img)ctx.drawImage(img,X,Y,W,H);
}
function rotate(ctx:CanvasRenderingContext2D,pivot:RigPoint,angle:number){
  const x=X+pivot.x*W,y=Y+pivot.y*H;
  ctx.translate(x,y);ctx.rotate(angle*Math.PI/180);ctx.translate(-x,-y);
}
type Arm = "left"|"right";
function arm(ctx:CanvasRenderingContext2D, art:CharacterArt,rig:RigSettings,pose:RigPose,side:Arm){
  const elbow=(side+"Elbow") as "leftElbow"|"rightElbow";
  const shoulder=(side+"Shoulder") as "leftShoulder"|"rightShoulder";
  const wrist=(side+"Wrist") as "leftWrist"|"rightWrist";
  const upper=(side+"UpperArm") as "leftUpperArm"|"rightUpperArm";
  const fore=(side+"Forearm") as "leftForearm"|"rightForearm";
  const hand=(side+"Hand") as "leftHand"|"rightHand";
  ctx.save();
  rotate(ctx,rig.pivots[shoulder],pose[shoulder]);
  draw(ctx,art[upper]);
  ctx.save();
  rotate(ctx,rig.pivots[elbow],pose[elbow]);
  draw(ctx,art[fore]);
  ctx.save();
  rotate(ctx,rig.pivots[wrist],pose[wrist]);
  draw(ctx,art[hand]);
  ctx.restore();
  ctx.restore();
  ctx.restore();
}
export const RIG_REQUIRED_LAYERS = [
  "torso","head",
  "leftUpperArm","leftForearm","leftHand",
  "rightUpperArm","rightForearm","rightHand",
] as const;
export function isFullCutoutRig(art:CharacterArt|null):boolean {
  return !!art && RIG_REQUIRED_LAYERS.every(key=>!!art[key]);
}
export function paintCutoutRig(
  ctx:CanvasRenderingContext2D,art:CharacterArt,rig:RigSettings,pose:RigPose,time:number
):boolean {
  if(!isFullCutoutRig(art))return false;
  ctx.save();
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";
  // Correct hierarchical order: rear arm -> torso -> gesturing arm -> head.
  arm(ctx,art,rig,pose,"left");
  draw(ctx,art.torso);
  arm(ctx,art,rig,pose,"right");
  ctx.save();
  rotate(ctx,rig.pivots.neck,pose.head);
  draw(ctx,art.head);
  if(art.browsRaised && pose.brows>.25)draw(ctx,art.browsRaised);
  else draw(ctx,art.browsNeutral);
  const phase=(time+1.2)%4.6;
  const blink=phase<.12;
  if((pose.eyes<.26 || blink) && art.eyesClosed)draw(ctx,art.eyesClosed);
  else if(pose.eyes<.74 && art.eyesHalf)draw(ctx,art.eyesHalf);
  else draw(ctx,art.eyesOpen);
  if(pose.mouth>.22 && art.mouthOpen)draw(ctx,art.mouthOpen);
  else draw(ctx,art.mouthClosed);
  ctx.restore();
  ctx.restore();
  return true;
}
