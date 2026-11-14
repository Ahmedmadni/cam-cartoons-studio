import { describe,expect,test } from "bun:test";
import {
  JOINT_META, PIVOT_IDS, DEFAULT_RIG_POSE,
  defaultRigSettings, readRigSettings, evaluateRigPose, putRigKeyframe,
  automaticSceneRigPose,
} from "../src/lib/characterRig";
import {parseSocialProject, STARTER} from "../src/lib/socialStudio";
import { mouthPoseAt } from "../src/lib/characterRigRenderer";

describe("versioned cut-out joint rig",()=>{
  test("previous projects keep the exact scene count and do not require a rig",()=>{
    const project=parseSocialProject(STARTER);
    expect(project.scenes.length).toBe(3);
    expect(project.scenes[0]?.rig).toBeUndefined();
  });
  test("reads only known, finite joint and pivot values",()=>{
    const bad={
      pose:{head:100000,leftElbow:-999,eyes:NaN,unknown:"hacked"},
      pivots:{neck:{x:Infinity,y:-20},rightShoulder:{x:.73,y:.49},unexpected:{x:0,y:0}},
      keyframes:[{atMs:200,pose:{head:12}}, {atMs:200,pose:{head:5}}, {atMs:999999,pose:{head:1}}],
      mouthSource:"manual",
    };
    const rig=readRigSettings(bad,5000);
    expect(rig.pose.head).toBe(JOINT_META.head.max);
    expect(rig.pose.leftElbow).toBe(JOINT_META.leftElbow.min);
    expect(rig.pose.eyes).toBe(1);
    expect("unknown" in rig.pose).toBe(false);
    expect(rig.pivots.neck.x).toBe(.5);
    expect(rig.pivots.neck.y).toBe(0);
    expect(rig.pivots.rightShoulder).toEqual({x:.73,y:.49});
    expect(Object.keys(rig.pivots).sort()).toEqual([...PIVOT_IDS].sort());
    expect(rig.keyframes).toHaveLength(1);
    expect(rig.mouthSource).toBe("manual");
  });
  test("interpolates every joint exactly between scene keyframes",()=>{
    let rig=defaultRigSettings();
    rig=putRigKeyframe(rig,0,{...DEFAULT_RIG_POSE,head:0,rightElbow:0},5000);
    rig=putRigKeyframe(rig,5000,{...DEFAULT_RIG_POSE,head:20,rightElbow:-80},5000);
    expect(evaluateRigPose(rig,2500,0).head).toBeCloseTo(10);
    expect(evaluateRigPose(rig,2500,0).rightElbow).toBeCloseTo(-40);
    expect(evaluateRigPose(rig,0,0).head).toBe(0);
    expect(evaluateRigPose(rig,9000,0).head).toBe(20);
  });
  test("mouth uses PCM envelope unless manual override selected",()=>{
    const rig=defaultRigSettings();
    expect(evaluateRigPose(rig,0,.3).mouth).toBeCloseTo(.75);
    rig.mouthSource="manual";rig.pose.mouth=.45;
    expect(evaluateRigPose(rig,0,1).mouth).toBeCloseTo(.45);
  });
  test("round-trip JSON preserves normalized animatable joints and clamps malicious input",()=>{
    const scene=STARTER.scenes[0]!;
    const rig=putRigKeyframe(defaultRigSettings(),scene.duration*1000,
      {...DEFAULT_RIG_POSE,head:15,leftWrist:52},scene.duration*1000);
    const raw={...STARTER,scenes:[{...scene,rig}]};
    const parsed=parseSocialProject(JSON.parse(JSON.stringify(raw)) as unknown);
    expect(parsed.scenes[0]?.rig?.keyframes[0]?.pose.leftWrist).toBe(52);
    expect(parsed.scenes[0]?.rig?.keyframes[0]?.atMs).toBe(5000);
    const invalid=parseSocialProject({...raw,scenes:[{...scene,rig:{
      pose:{...rig.pose,leftShoulder:1e9},keyframes:[{atMs:-200,pose:rig.pose}],
      pivots:{rightElbow:{x:2,y:-2}},mouthSource:"audio"}}]});
    expect(invalid.scenes[0]?.rig?.pose.leftShoulder).toBe(JOINT_META.leftShoulder.max);
    expect(invalid.scenes[0]?.rig?.keyframes).toHaveLength(0);
    expect(invalid.scenes[0]?.rig?.pivots.rightElbow).toEqual({x:1,y:0});
  });
});

describe("Five-pose mouth illustration selection",()=>{
  test("selects 5 discrete poses from voice energy, without claiming phoneme accuracy",()=>{
    expect(mouthPoseAt(0)).toBe("mouthClosed");
    expect(mouthPoseAt(.23)).toBe("mouthSmall");
    expect(mouthPoseAt(.44)).toBe("mouthRound");
    expect(mouthPoseAt(.7)).toBe("mouthOpen");
    expect(mouthPoseAt(.95)).toBe("mouthWide");
  });
  test("respects exact threshold boundaries",()=>{
    expect(mouthPoseAt(.14)).toBe("mouthSmall");
    expect(mouthPoseAt(.34)).toBe("mouthRound");
    expect(mouthPoseAt(.57)).toBe("mouthOpen");
    expect(mouthPoseAt(.84)).toBe("mouthWide");
  });
});

describe("automatic built-in character scene motions",()=>{
  test("wave gestures articulate shoulder, elbow and wrist, not only the mouth",()=>{
    const start=automaticSceneRigPose("wave","happy",0,.3);
    const middle=automaticSceneRigPose("wave","happy",1800,.3);
    const next=automaticSceneRigPose("wave","happy",2200,.3);
    expect(start.rightWrist).toBe(0);
    expect(middle.rightShoulder).toBeLessThan(-30);
    expect(middle.rightElbow).toBeLessThan(-60);
    expect(middle.rightWrist).not.toBeCloseTo(next.rightWrist);
    expect(middle.mouth).toBeCloseTo(.75);
  });
  test("explaining animates both arms, idle leaves lip closed",()=>{
    const explain=automaticSceneRigPose("explain","curious",1500,.2);
    expect(explain.rightElbow).toBeLessThan(-45);
    expect(explain.leftElbow).toBeLessThan(-10);
    expect(explain.brows).toBeGreaterThan(0);
    const idle=automaticSceneRigPose("idle","neutral",1500,1);
    expect(idle.mouth).toBe(0);
    expect(Math.abs(idle.rightElbow)).toBe(0);
  });
  test("motion remains bounded and stable with unexpected time/energy",()=>{
    const v=automaticSceneRigPose("talk","surprised",Number.NaN,100);
    expect(v.mouth).toBe(1);
    expect(v.rightShoulder).toBeCloseTo(0);
    expect(v.brows).toBeLessThanOrEqual(1);
  });
});
