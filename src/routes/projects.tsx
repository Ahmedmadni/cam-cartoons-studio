import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BACKGROUNDS } from "@/lib/story";
import { useCharacterLibrary } from "@/lib/characterLibrary";
import { createStoryProject, type StoryProject, type StoryScene } from "@/lib/storyProject";
import { addScene, updateScene, removeScene, moveScene, getTimeline, duplicateScene } from "@/lib/storyProjectOperations";
import { saveStoryProject, listStoryProjects, deleteStoryProject } from "@/lib/storyProjectStorage";
import { deserializeStoryProject, duplicateImportedStoryProject, serializeStoryProject, MAX_STORY_BACKUP_BYTES } from "@/lib/storyProjectBackup";
import { addCue } from "@/lib/storyCueOperations";
import StorySequencePreview from "@/components/story/StorySequencePreview";
import StoryVoiceClipControl from "@/components/story/StoryVoiceClipControl";
import { deleteProjectVoiceClips, deleteSceneVoiceClips, deleteStoryVoiceClip } from "@/lib/storyVoiceClips";
import { StoryAutosave } from "@/lib/storyAutosave";
import { exportStorySrt } from "@/lib/storySubtitles";
import { appendDialogueScript } from "@/lib/storyScriptBuilder";
import { ANIMATION_LABELS } from "@/lib/store";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "مشاريعي — استوديو القصص" }] }),
  component: ProjectsPage,
});
const uid = () => crypto.randomUUID();
const control = "w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground";
function ProjectsPage() {
  const [projects, setProjects] = useState<StoryProject[]>([]);
  const [project, setProject] = useState<StoryProject | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const latestProjectRef = useRef<StoryProject | null>(null);
  latestProjectRef.current = project;
  const [autosave] = useState(() => new StoryAutosave(
    saveStoryProject,
    (saved) => {
      setProjects(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
      if (latestProjectRef.current === saved) setMessage("تم الحفظ التلقائي على هذا الجهاز");
    },
    (_saved, failure) => setError("فشل الحفظ التلقائي: " + String(failure) + " — نزّل نسخة JSON لحماية العمل."),
  ));

  function markDirty(next: StoryProject) {
    setProject(next);
    setMessage("تغييرات قيد الحفظ التلقائي");
    setError("");
    autosave.schedule(next);
  }

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!autosave.hasUnwrittenChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      autosave.dispose();
    };
  }, [autosave]);
  const characters = useCharacterLibrary((state) => state.characters);
  useEffect(() => {
    let live = true;
    listStoryProjects().then((all) => { if (live) setProjects(all); })
      .catch((e: unknown) => { if (live) setError(String(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  async function save(next: StoryProject) {
    setBusy(true); setError(""); setMessage("");
    try {
      await autosave.saveNow(next);
      setProject(current => current?.id === next.id ? current : next);
      setProjects((prev) => [next, ...prev.filter((p) => p.id !== next.id)]);
      setMessage("تم حفظ التغييرات على هذا الجهاز");
    } catch (e) { setError("تعذر الحفظ: " + String(e)); }
    finally { setBusy(false); }
  }
  async function create() {
    const next = createStoryProject(uid(), "قصة جديدة");
    await save(next);
    setSelected(null);
  }
  async function importBackup(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_STORY_BACKUP_BYTES) { setError("حجم النسخة الاحتياطية كبير جدًا"); return; }
    setBusy(true); setError("");
    try {
      const imported = duplicateImportedStoryProject(deserializeStoryProject(await file.text()), uid());
      await saveStoryProject(imported);
      setProjects(prev => [imported, ...prev]); setProject(imported);
      setSelected(imported.scenes[0]?.id ?? null); setMessage("تم استيراد نسخة مستقلة من المشروع");
    } catch (e) { setError("تعذر استيراد المشروع: " + String(e)); }
    finally { setBusy(false); }
  }
  function exportBackup(p: StoryProject) {
    try {
      const blob = new Blob([serializeStoryProject(p)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "cartoon-story-" + p.id + ".json";
      a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(String(e)); }
  }
  function downloadSubtitles(project: StoryProject) {
    try {
      const subtitles = exportStorySrt(project);
      if (!subtitles) { setError("أضف حوارًا واحدًا على الأقل لتصدير الترجمة."); return; }
      const blob = new Blob(["\uFEFF", subtitles], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "cartoon-story-" + project.id + ".srt";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { setError("تعذر تصدير الترجمة: " + String(failure)); }
  }
  async function destroy(id: string) {
    if (!window.confirm("حذف المشروع نهائيًا من هذا المتصفح؟")) return;
    setBusy(true);
    try {
      autosave.cancel(id);
      await autosave.flushAll();
      await deleteStoryProject(id);
      await deleteProjectVoiceClips(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (project?.id === id) { setProject(null); setSelected(null); }
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }
  function changeScene(scene: StoryScene) {
    if (!project) return;
    try { markDirty(updateScene(project, scene)); }
    catch (e) { setError(String(e)); }
  }
  function add() {
    if (!project) return;
    const scene: StoryScene = {
      id: uid(), title: "مشهد " + (project.scenes.length + 1), durationMs: 5000,
      backgroundId: BACKGROUNDS[0]?.id ?? "park", actors: [], cues: [], camera: { framing: "wide" },
    };
    try { markDirty(addScene(project, scene)); setSelected(scene.id); }
    catch (e) { setError(String(e)); }
  }
  const scene = project?.scenes.find(s => s.id === selected);
  const backdrop = BACKGROUNDS.find(b => b.id === scene?.backgroundId);
  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-3xl font-black">استوديو مشاريعي</h1><p className="text-muted-foreground">بناء المشاهد وحفظها محليًا — لا يتم رفع القصص للسحابة.</p></div>
          <div className="flex gap-2"><Link to="/" className="rounded-xl border px-4 py-2">مكتبة الشخصيات</Link><label className="cursor-pointer rounded-xl border px-4 py-2">استيراد JSON<input aria-label="استيراد نسخة احتياطية" type="file" accept=".json,application/json" disabled={busy || loading} className="sr-only" onChange={e => { void importBackup(e.target.files?.[0]); e.target.value = ""; }} /></label><button disabled={busy || loading} onClick={create} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">+ مشروع جديد</button></div>
        </header>
        {error && <div role="alert" className="rounded-xl border border-destructive p-3 text-destructive">{error}</div>}
        {message && <div role="status" className="rounded-xl border p-3">{message}</div>}
        {loading ? <p>جاري تحميل المشاريع…</p> : (
          <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
            <aside className="space-y-2 rounded-2xl border p-3">
              <h2 className="font-bold">المشاريع المحفوظة ({projects.length})</h2>
              {projects.length === 0 && <p className="text-sm text-muted-foreground">ابدأ بإنشاء مشروعك الأول.</p>}
              {projects.map(p => <div key={p.id} className="flex gap-1">
                <button onClick={() => { setProject(p); setSelected(p.scenes[0]?.id ?? null); setMessage(""); }} className={"min-w-0 flex-1 truncate rounded-lg p-2 text-right " + (project?.id === p.id ? "bg-secondary" : "hover:bg-muted")}>{p.title}</button>
                <button disabled={busy} aria-label={"حذف " + p.title} onClick={() => destroy(p.id)} className="rounded-lg border px-2">×</button>
              </div>)}
            </aside>
            <section className="min-w-0 space-y-4">
              {!project ? <div className="rounded-2xl border p-10 text-center text-muted-foreground">اختر مشروعًا من القائمة أو أنشئ مشروعًا جديدًا.</div> : <>
                <div className="flex flex-wrap items-end gap-3 rounded-2xl border p-4">
                  <label className="min-w-[220px] flex-1 space-y-1"><span className="text-sm font-bold">عنوان القصة</span><input className={control} value={project.title} onChange={e => { markDirty({...project, title:e.target.value, updatedAt: new Date().toISOString()}); }} /></label>
                  <button disabled={busy} className="rounded-xl border px-4 py-2" onClick={() => downloadSubtitles(project)}>تصدير ترجمة SRT</button><button disabled={busy} className="rounded-xl border px-4 py-2" onClick={() => exportBackup(project)}>تنزيل نسخة JSON</button><button disabled={busy || !project.title.trim()} className="rounded-xl bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50" onClick={() => save(project)}>حفظ المشروع</button>
                </div>
                <div className="rounded-2xl border p-4">
                  <div className="mb-3 flex justify-between"><h2 className="font-bold">لوحة المشاهد — {project.scenes.length}</h2><button onClick={add} className="rounded-lg bg-secondary px-3 py-1">+ مشهد</button></div>
                  <div className="flex flex-wrap gap-2">{project.scenes.map((s, i) =>
                    <div key={s.id} className={"rounded-xl border p-2 " + (selected===s.id ? "border-primary" : "")}>
                      <button className="block min-w-28 text-right font-bold" onClick={() => setSelected(s.id)}>{i+1}. {s.title}</button>
                      <small>{Math.round(s.durationMs/1000)} ثانية</small>
                      <div className="flex gap-1"><button aria-label="للأمام" disabled={i===0} onClick={()=>{markDirty(moveScene(project,i,i-1));}}>→</button><button aria-label="للخلف" disabled={i===project.scenes.length-1} onClick={()=>{markDirty(moveScene(project,i,i+1));}}>←</button><button type="button" aria-label="تكرار المشهد" className="rounded px-2 hover:bg-muted" onClick={()=>{
                        try {
                          const copy=duplicateScene(project,s.id,uid);
                          markDirty(copy); setSelected(copy.scenes[i+1]!.id);
                        } catch(e){setError("تعذر نسخ المشهد: "+String(e));}
                      }}>نسخ</button><button aria-label="حذف المشهد" onClick={()=>{markDirty(removeScene(project,s.id));if(selected===s.id)setSelected(null);void deleteSceneVoiceClips(project.id,s.id).catch(failure=>setError(String(failure)));}}>×</button></div>
                    </div>)}</div>
                  <p className="mt-3 text-sm text-muted-foreground">إجمالي المدة: {(getTimeline(project).at(-1)?.endMs ?? 0)/1000} ثانية</p>
                </div>
                <StorySequencePreview project={project} characters={characters}/>
                <p className="text-xs text-muted-foreground">ملفات الصوت محفوظة في هذا المتصفح فقط، ولا تُضمّن في نسخ JSON الاحتياطية؛ احتفظ بأصل الملفات الصوتية على جهازك.</p>
                {scene && <div className="grid gap-4 rounded-2xl border p-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="block space-y-1"><span>اسم المشهد</span><input className={control} value={scene.title} onChange={e=>changeScene({...scene,title:e.target.value})}/></label>
                    <label className="block space-y-1"><span>المدة (ثوان)</span><input className={control} type="number" min="1" max="600" value={scene.durationMs/1000} onChange={e=>{const ms=Math.round(Number(e.target.value)*1000);if(ms>0 && Number.isFinite(ms))changeScene({...scene,durationMs:ms});}}/></label>
                    <label className="block space-y-1"><span>الخلفية</span><select className={control} value={scene.backgroundId} onChange={e=>changeScene({...scene,backgroundId:e.target.value})}>{BACKGROUNDS.map(b=><option value={b.id} key={b.id}>{b.label}</option>)}</select></label>
                    <label className="block space-y-1"><span>الكاميرا</span><select className={control} value={scene.camera.framing} onChange={e=>changeScene({...scene,camera:{framing:e.target.value as "wide"|"medium"|"close"}})}><option value="wide">لقطة واسعة</option><option value="medium">لقطة متوسطة</option><option value="close">لقطة قريبة</option></select></label>
                    <label className="block space-y-1"><span>إضافة شخصية</span><select className={control} value="" onChange={e=>{if(!e.target.value)return;changeScene({...scene,actors:[...scene.actors,{id:uid(),characterId:e.target.value,x:0,scale:1}]});}}><option value="">اختر شخصية…</option>{characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                    {scene.actors.map(a=><div key={a.id} className="space-y-2 rounded-lg border p-2">
                      <div className="flex items-center gap-2"><strong className="flex-1 text-sm">{characters.find(c=>c.id===a.characterId)?.name ?? a.characterId}</strong><button type="button" aria-label="حذف الشخصية" onClick={()=>changeScene({...scene,actors:scene.actors.filter(x=>x.id!==a.id),cues:scene.cues.filter(c=>c.actorId!==a.id)})}>حذف</button></div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs">الموقع الأفقي<input aria-label="موقع الشخصية" className={control} type="number" step="0.1" min="-1" max="1" value={a.x} onChange={e=>{const x=Number(e.target.value);if(Number.isFinite(x) && x>=-1 && x<=1)changeScene({...scene,actors:scene.actors.map(v=>v.id===a.id?{...v,x}:v)});}}/></label>
                        <label className="text-xs">الحجم<input aria-label="حجم الشخصية" className={control} type="number" step="0.1" min="0.1" max="10" value={a.scale} onChange={e=>{const scale=Number(e.target.value);if(Number.isFinite(scale) && scale>0 && scale<=10)changeScene({...scene,actors:scene.actors.map(v=>v.id===a.id?{...v,scale}:v)});}}/></label>
                      </div>
                    </div>)}
                  </div>
                  <div className="space-y-3">
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-muted" style={backdrop?{backgroundImage:`url("${backdrop.src}")`,backgroundSize:"cover",backgroundPosition:"center"}:{}}><span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-white">{scene.title} · {scene.actors.length} شخصيات</span></div>
                    <p className="text-sm text-muted-foreground">صورة مرجعية للخلفية؛ المعاينة المتحركة متعددة الشخصيات في لوحة التشغيل أعلاه.</p>
                    <h3 className="font-bold">الحوار والحركات</h3>
                    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                      <label className="block space-y-1 text-sm font-bold">نص حوارات متعدد الشخصيات
                        <textarea className={control} rows={4} maxLength={10000}
                          aria-label="نص الحوارات"
                          placeholder={"حكيم: مرحبًا بكم!\\nفلفل: لنبدأ مغامرتنا!"}
                          value={scripts[scene.id] ?? ""}
                          onChange={e=>setScripts(current=>({...current,[scene.id]:e.target.value}))}/>
                      </label>
                      <p className="text-xs text-muted-foreground">ضع كل جملة بسطر مستقل. ابدأ السطر باسم شخصية موجودة في المشهد ثم نقطتين، أو اكتب الحوار مباشرة للشخصية الأولى. الأوقات تقديرية وقابلة للتعديل.</p>
                      <button type="button" className="rounded-xl bg-secondary px-4 py-2 text-sm font-bold disabled:opacity-50"
                        disabled={!scene.actors.length || !(scripts[scene.id] ?? "").trim()}
                        onClick={()=>{
                          if(!project) return;
                          try {
                            const namedActors = scene.actors.map(actor=>({
                              actorId:actor.id,
                              displayName:characters.find(ch=>ch.id===actor.characterId)?.name ?? actor.characterId,
                            }));
                            const next=appendDialogueScript(project,scene.id,scripts[scene.id] ?? "",namedActors,uid);
                            markDirty(next);
                            setScripts(current=>({...current,[scene.id]:""}));
                            setMessage("تم توزيع الحوارات على الشريط الزمني؛ جارٍ الحفظ تلقائيًا");
                          } catch(failure) { setError("تعذر توزيع الحوار: "+String(failure)); }
                        }}>توزيع الحوارات تلقائيًا على المشهد</button>
                    </div>
                    {scene.cues.map(c=><div key={c.id} className="space-y-2 rounded-lg border p-2 text-sm"><div className="flex justify-between"><span>{c.kind === "speech" ? "حوار" : "حركة"}</span><button aria-label="حذف الإشارة" onClick={()=>{ changeScene({...scene,cues:scene.cues.filter(x=>x.id!==c.id)}); void deleteStoryVoiceClip(project.id,scene.id,c.id).catch(failure=>setError(String(failure))); }}>×</button></div><div className="grid grid-cols-2 gap-2">
                      <label className="text-xs">النوع<select aria-label="نوع الإشارة" className={control} value={c.kind} onChange={e=>changeScene({...scene,cues:scene.cues.map(x=>x.id===c.id?{...x,kind:e.target.value as "speech" | "animation",value:e.target.value==="animation"?"wave":"مرحبًا"}:x)})}><option value="speech">حوار</option><option value="animation">حركة</option></select></label>
                      <label className="text-xs">الشخصية<select aria-label="الشخصية المتحدثة" className={control} value={c.actorId} onChange={e=>changeScene({...scene,cues:scene.cues.map(x=>x.id===c.id?{...x,actorId:e.target.value}:x)})}>{scene.actors.map(a=><option key={a.id} value={a.id}>{characters.find(ch=>ch.id===a.characterId)?.name ?? a.characterId}</option>)}</select></label>
                    </div>
                    {c.kind === "animation" ? <select aria-label="الحركة" className={control} value={c.value} onChange={e=>changeScene({...scene,cues:scene.cues.map(x=>x.id===c.id?{...x,value:e.target.value}:x)})}>{Object.entries(ANIMATION_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select> :
                    <input aria-label="نص الحوار أو الحركة" className={control} value={c.value} onChange={e=>changeScene({...scene,cues:scene.cues.map(x=>x.id===c.id?{...x,value:e.target.value}:x)})}/> }
                    {c.kind === "speech" && <StoryVoiceClipControl projectId={project.id} sceneId={scene.id} cueId={c.id}/>}
                    <div className="grid grid-cols-2 gap-2"><label>البداية (ثانية)<input aria-label="بداية الإشارة" className={control} type="number" min="0" step="0.1" value={c.atMs/1000} onChange={e=>{const atMs=Math.round(Number(e.target.value)*1000);if(Number.isFinite(atMs) && atMs>=0)changeScene({...scene,cues:scene.cues.map(x=>x.id===c.id?{...x,atMs}:x)})}}/></label><label>المدة (ثانية)<input aria-label="مدة الإشارة" className={control} type="number" min="0.1" step="0.1" value={c.durationMs/1000} onChange={e=>{const durationMs=Math.round(Number(e.target.value)*1000);if(Number.isFinite(durationMs) && durationMs>0)changeScene({...scene,cues:scene.cues.map(x=>x.id===c.id?{...x,durationMs}:x)})}}/></label></div></div>)}
                    {scene.actors.length>0 && <button className="rounded-lg bg-secondary px-3 py-2" onClick={()=>{const id=scene.actors[0]!.id;if(project) { try { const next = addCue(project,scene.id,{id:uid(),actorId:id,atMs:0,durationMs:Math.min(1000,scene.durationMs),kind:"speech",value:"مرحبًا بكم في قصتنا"}); markDirty(next); } catch (e) { setError(String(e)); } }}}>+ أضف حوارًا نموذجيًا</button>}
                    {scene.actors.length>0 && <button type="button" className="ms-2 rounded-lg border px-3 py-2" onClick={()=>{
                      if (!project) return;
                      const actorId=scene.actors[0]!.id;
                      try {const next=addCue(project,scene.id,{id:uid(),actorId,atMs:0,durationMs:Math.min(1000,scene.durationMs),kind:"animation",value:"wave"});markDirty(next);}
                      catch(e){setError(String(e));}
                    }}>+ إضافة حركة</button>}
                  </div>
                </div>}
              </>}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
