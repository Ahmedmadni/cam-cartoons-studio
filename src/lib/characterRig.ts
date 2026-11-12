/**
 * Versioned, deterministic upper-body cut-out rig.
 *
 * The current illustrated master portrait is FLATTENED; it cannot be articulated.
 * This model becomes visible only after a genuine multi-layer art pack is uploaded.
 * All values are scene-local, bounded, JSON-safe, and interpolated in export too.
 */
export const JOINTS = [
  "head", "leftShoulder", "leftElbow", "leftWrist",
  "rightShoulder", "rightElbow", "rightWrist",
  "eyes", "brows", "mouth",
] as const;
export type RigJoint = (typeof JOINTS)[number];
export type RigPose = Record<RigJoint, number>;
export const JOINT_META: Record<RigJoint, { name: string; min: number; max: number; step: number; unit: string }> = {
  head: {name:"الرأس والرقبة", min:-28,max:28,step:1,unit:"°"},
  leftShoulder:{name:"الكتف الأيسر",min:-100,max:100,step:1,unit:"°"},
  leftElbow:{name:"الكوع الأيسر",min:-145,max:145,step:1,unit:"°"},
  leftWrist:{name:"الرسغ الأيسر",min:-85,max:85,step:1,unit:"°"},
  rightShoulder:{name:"الكتف الأيمن",min:-100,max:100,step:1,unit:"°"},
  rightElbow:{name:"الكوع الأيمن",min:-145,max:145,step:1,unit:"°"},
  rightWrist:{name:"الرسغ الأيمن",min:-85,max:85,step:1,unit:"°"},
  eyes:{name:"فتح العينين",min:0,max:1,step:.05,unit:""},
  brows:{name:"رفع الحاجبين",min:-1,max:1,step:.05,unit:""},
  mouth:{name:"فتح الفم",min:0,max:1,step:.05,unit:""},
};
export const PIVOT_IDS = [
  "neck","leftShoulder","leftElbow","leftWrist",
  "rightShoulder","rightElbow","rightWrist",
] as const;
export type PivotId = (typeof PIVOT_IDS)[number];
export type RigPoint = {x:number;y:number};
/** Normalized to a *full-frame* transparent 2D art layer: (0,0) top-left. */
export const DEFAULT_PIVOTS: Record<PivotId,RigPoint> = {
  neck:{x:.50,y:.50},
  leftShoulder:{x:.31,y:.57},leftElbow:{x:.24,y:.75},leftWrist:{x:.20,y:.88},
  rightShoulder:{x:.69,y:.57},rightElbow:{x:.76,y:.75},rightWrist:{x:.80,y:.88},
};
export const DEFAULT_RIG_POSE: RigPose = {
  head:0,leftShoulder:0,leftElbow:0,leftWrist:0,
  rightShoulder:0,rightElbow:0,rightWrist:0,
  eyes:1,brows:0,mouth:0,
};
export const POSE_PRESETS: ReadonlyArray<{id:string;name:string;values:RigPose}> = [
  {id:"idle",name:"وضع طبيعي",values:{...DEFAULT_RIG_POSE}},
  {id:"greet",name:"ترحيب باليد",values:{...DEFAULT_RIG_POSE,head:6,rightShoulder:-42,rightElbow:-84,rightWrist:12}},
  {id:"explain",name:"شرح وإشارة",values:{...DEFAULT_RIG_POSE,head:-4,rightShoulder:-35,rightElbow:-72,leftShoulder:16,leftElbow:-22,brows:.35}},
  {id:"think",name:"تفكير",values:{...DEFAULT_RIG_POSE,head:11,rightShoulder:-28,rightElbow:-118,brows:-.20,mouth:.10}},
  {id:"surprise",name:"دهشة",values:{...DEFAULT_RIG_POSE,head:-9,leftShoulder:28,rightShoulder:-28,brows:1,eyes:1,mouth:.78}},
];
export type RigKeyframe = {atMs:number;pose:RigPose};
export type RigSettings = {
  pose:RigPose;
  pivots:Record<PivotId,RigPoint>;
  keyframes:RigKeyframe[];
  mouthSource:"audio"|"manual";
};
export function defaultRigSettings():RigSettings {
  return {
    pose:{...DEFAULT_RIG_POSE},
    pivots:Object.fromEntries(PIVOT_IDS.map(id=>[id,{...DEFAULT_PIVOTS[id]}])) as Record<PivotId,RigPoint>,
    keyframes:[],
    mouthSource:"audio",
  };
}
const record=(v:unknown):v is Record<string,unknown>=>typeof v==="object"&&v!==null&&!Array.isArray(v);
const bounded=(v:unknown,def:number,min:number,max:number)=>typeof v==="number"&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):def;
export function readRigPose(input:unknown):RigPose {
  const r=record(input)?input:{};
  const result={...DEFAULT_RIG_POSE};
  for(const joint of JOINTS){
    const m=JOINT_META[joint];
    result[joint]=bounded(r[joint],DEFAULT_RIG_POSE[joint],m.min,m.max);
  }
  return result;
}
export function readRigSettings(input:unknown, durationMs:number):RigSettings {
  const result=defaultRigSettings();
  if(!record(input))return result;
  result.pose=readRigPose(input.pose);
  result.mouthSource=input.mouthSource==="manual"?"manual":"audio";
  if(record(input.pivots)){
    for(const id of PIVOT_IDS){
      const p=input.pivots[id];
      if(record(p))result.pivots[id]={
        x:bounded(p.x,DEFAULT_PIVOTS[id].x,0,1),
        y:bounded(p.y,DEFAULT_PIVOTS[id].y,0,1),
      };
    }
  }
  if(Array.isArray(input.keyframes)){
    const max=Math.max(0,Math.floor(durationMs));
    const seen=new Set<number>();
    for(const item of input.keyframes.slice(0,20)){
      if(!record(item)||typeof item.atMs!=="number"||!Number.isInteger(item.atMs)||
        item.atMs<0||item.atMs>max||seen.has(item.atMs))continue;
      seen.add(item.atMs);
      result.keyframes.push({atMs:item.atMs,pose:readRigPose(item.pose)});
    }
    result.keyframes.sort((a,b)=>a.atMs-b.atMs);
  }
  return result;
}
export function evaluateRigPose(rig:RigSettings,timeMs:number,voiceEnergy:number):RigPose {
  const frames=rig.keyframes;
  let pose=rig.pose;
  if(frames.length){
    const t=Number.isFinite(timeMs)?timeMs:0;
    const before=frames.filter(k=>k.atMs<=t).at(-1);
    const after=frames.find(k=>k.atMs>=t);
    if(!before)pose=frames[0]!.pose;
    else if(!after)pose=frames[frames.length-1]!.pose;
    else if(before.atMs===after.atMs)pose=before.pose;
    else{
      const f=(t-before.atMs)/(after.atMs-before.atMs);
      pose={...DEFAULT_RIG_POSE};
      for(const joint of JOINTS)pose[joint]=before.pose[joint]+(after.pose[joint]-before.pose[joint])*f;
    }
  }
  const out={...pose};
  if(rig.mouthSource==="audio")out.mouth=bounded(voiceEnergy*2.5,0,0,1);
  return out;
}
export function putRigKeyframe(rig:RigSettings,atMs:number,pose:RigPose,durationMs:number):RigSettings {
  const time=Math.round(bounded(atMs,0,0,durationMs));
  const frames=rig.keyframes.filter(f=>f.atMs!==time);
  if(frames.length>=12)return rig;
  frames.push({atMs:time,pose:readRigPose(pose)});
  frames.sort((a,b)=>a.atMs-b.atMs);
  return {...rig,keyframes:frames};
}
