import { useState } from "react";
import {
  DEFAULT_RIG_POSE, JOINTS, JOINT_META, PIVOT_IDS, POSE_PRESETS,
  defaultRigSettings, putRigKeyframe,
  type PivotId, type RigJoint, type RigPose, type RigSettings,
} from "@/lib/characterRig";
import { artStatus, ART_LAYER_LABELS, type CharacterArtLayer } from "@/lib/socialCharacterArt";
import { RIG_REQUIRED_LAYERS } from "@/lib/characterRigRenderer";
import type { CartoonId } from "@/lib/socialStudio";

type Props = {
  character:CartoonId;
  durationSeconds:number;
  rig?:RigSettings;
  onChange:(settings:RigSettings)=>void;
  revision:number;
};
type EditSlot = "base"|"start"|"end";
const rangeStyle="w-full accent-cyan-600";
function Slider({label,value,min,max,step,unit,onChange}:{
  label:string;value:number;min:number;max:number;step:number;unit:string;onChange:(n:number)=>void;
}){
  return <label className="block rounded-xl border border-slate-200 bg-white px-3 py-2">
    <span className="mb-2 flex justify-between gap-2 text-xs font-bold text-slate-700">
      <span>{label}</span><span dir="ltr" className="tabular-nums text-cyan-700">{Number(value.toFixed(2))}{unit}</span>
    </span>
    <input type="range" aria-label={label} className={rangeStyle} min={min} max={max} step={step}
      value={value} onChange={e=>onChange(Number(e.currentTarget.value))} />
  </label>;
}
export function CharacterRigEditor({character,durationSeconds,rig,onChange,revision}:Props){
  const [slot,setSlot]=useState<EditSlot>("base");
  const [activePivot,setActivePivot]=useState<PivotId>("rightShoulder");
  const value=rig ?? defaultRigSettings();
  const endMs=durationSeconds*1000;
  const frameMs=slot==="start"?0:slot==="end"?endMs:null;
  const key=frameMs===null?undefined:value.keyframes.find(f=>f.atMs===frameMs);
  const pose=key?.pose ?? value.pose;
  const status=artStatus(character);
  const movePose=(updated:RigPose)=>{
    if(frameMs===null)onChange({...value,pose:updated});
    else onChange(putRigKeyframe(value,frameMs,updated,endMs));
  };
  const change=(joint:RigJoint,n:number)=>movePose({...pose,[joint]:n});
  const setPivot=(axis:"x"|"y",n:number)=>{
    onChange({...value,pivots:{...value.pivots,[activePivot]:{...value.pivots[activePivot],[axis]:n}}});
  };
  const slots:ReadonlyArray<[EditSlot,string]> = [
    ["base","الوضع الأساسي"],["start","أول المشهد"],["end","آخر المشهد"],
  ];
  const requiredTotal=RIG_REQUIRED_LAYERS.length;
  const acquired=RIG_REQUIRED_LAYERS.filter(part=>status.hasRig || false).length;
  void acquired;void revision;
  return <section aria-label="محرر مفاصل الشخصية" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-black">محرر العظام والمفاصل 2D</h2>
      <span className={"rounded-full px-3 py-1.5 text-xs font-bold "+(status.hasRig?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-900")}>
        {status.hasRig?"طبقات الحركة مكتملة":"تنتظر طبقات الحركة"}
      </span>
    </div>
    <p className="text-sm leading-7 text-slate-600">
      اضبط زاوية كل مفصل ونقطة ارتكازه، ثم احفظ وضعية أول المشهد وآخره لتحريكها بسلاسة.
      {status.hasRig?" ستظهر الحركة في المعاينة والتصدير.":" الحركة المستقلة لا تعمل مع صورة مسطحة؛ ارفع طبقات مفصّلة أولًا."}
    </p>
    {!status.hasRig && <div role="note" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-950">
      المطلوب {requiredTotal} صور لأعضاء الشخصية على خلفية شفافة، كل صورة بالأبعاد نفسها.
      افتح تبويب «الشخصيات» ثم مجموعة «طبقات المفاصل» لرفعها. إعداداتك هنا تُحفظ لحين اكتمال الطبقات.
    </div>}
    <div className="mt-4 grid grid-cols-3 gap-2">
      {slots.map(([id,title])=><button key={id} type="button" aria-pressed={slot===id} onClick={()=>setSlot(id)}
        className={"rounded-xl border px-2 py-3 text-xs font-bold "+(slot===id?"border-cyan-500 bg-cyan-100 text-cyan-950":"border-slate-200 bg-slate-50 text-slate-700")}>{title}</button>)}
    </div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-slate-500">{slot==="base"?"الوضع الأساسي":key?"إطار حركة محفوظ":"أول تعديل سيُنشئ إطار حركة هنا"}</p>
      {slot!=="base" && key && <button type="button" className="text-xs font-bold text-rose-700 underline"
        onClick={()=>onChange({...value,keyframes:value.keyframes.filter(f=>f.atMs!==frameMs)})}>حذف إطار الحركة</button>}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2">
      {POSE_PRESETS.map(p=><button key={p.id} type="button" className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-900 hover:bg-cyan-100"
        onClick={()=>movePose({...p.values})}>{p.name}</button>)}
      <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
        onClick={()=>movePose({...DEFAULT_RIG_POSE})}>إعادة ضبط الزوايا</button>
    </div>
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      {JOINTS.filter(j=>j!=="mouth").map(j=><Slider key={j} label={JOINT_META[j].name} value={pose[j]}
        min={JOINT_META[j].min} max={JOINT_META[j].max} step={JOINT_META[j].step} unit={JOINT_META[j].unit}
        onChange={n=>change(j,n)} />)}
    </div>
    <div className="mt-4 rounded-2xl bg-slate-50 p-3">
      <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <input type="checkbox" checked={value.mouthSource==="audio"}
          onChange={e=>onChange({...value,mouthSource:e.target.checked?"audio":"manual"})}
          className="size-4 accent-cyan-600"/>تحريك الفم مع قوة الصوت
      </label>
      {value.mouthSource==="manual" && <div className="mt-2"><Slider label="فتح الفم يدويًا" value={pose.mouth}
        min={0} max={1} step={.05} unit="" onChange={n=>change("mouth",n)} /></div>}
      <p className="mt-2 text-xs leading-6 text-slate-500">التحريك الصوتي تقريبي وليس تحليل مخارج الحروف. يحتاج رسمًا منفصلًا للفم المفتوح والمغلق.</p>
    </div>
    <details className="mt-4 rounded-2xl border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-black">ضبط نقاط ارتكاز العظام</summary>
      <label className="mt-3 block text-xs font-bold">اختيار المفصل
        <select aria-label="اختيار المفصل" className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3"
          value={activePivot} onChange={e=>setActivePivot(e.target.value as PivotId)}>
          {PIVOT_IDS.map(id=><option key={id} value={id}>{id==="neck"?"الرقبة":JOINT_META[id]?.name??id}</option>)}
        </select>
      </label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Slider label="الإحداثي الأفقي للمفصل" value={value.pivots[activePivot].x} min={0} max={1} step={.01} unit=""
          onChange={n=>setPivot("x",n)}/>
        <Slider label="الإحداثي الرأسي للمفصل" value={value.pivots[activePivot].y} min={0} max={1} step={.01} unit=""
          onChange={n=>setPivot("y",n)}/>
      </div>
      <p className="mt-3 text-xs leading-6 text-slate-500">الإحداثيات نسبية من 0 إلى 1 على مساحة الرسم الكاملة. يمكن معايرة المفاصل على مواضع الكتف والكوع والرسغ التي حددها الرسام.</p>
    </details>
    <p className="mt-4 text-xs text-slate-500">
      عدد إطارات الحركة المحفوظة: {value.keyframes.length}. تحفظ الوضعيات مع ملف مشروع JSON. ملفات صور {ART_LAYER_LABELS.head} وباقي الطبقات تُحفظ محليًا بشكل منفصل.
    </p>
  </section>;
}
