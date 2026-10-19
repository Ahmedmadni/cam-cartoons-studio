import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BACKGROUNDS } from "@/lib/story";
import { useCharacterLibrary } from "@/lib/characterLibrary";
import { createStoryProject, type StoryProject, type StoryScene } from "@/lib/storyProject";
import { addScene, updateScene, removeScene, moveScene, getTimeline } from "@/lib/storyProjectOperations";
import { saveStoryProject, listStoryProjects, deleteStoryProject } from "@/lib/storyProjectStorage";
import { deserializeStoryProject, duplicateImportedStoryProject, serializeStoryProject, MAX_STORY_BACKUP_BYTES } from "@/lib/storyProjectBackup";
import { addCue } from "@/lib/storyCueOperations";

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
      await saveStoryProject(next);
      setProject(next);
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
  async function destroy(id: string) {
    if (!window.confirm("حذف المشروع نهائيًا من هذا المتصفح؟")) return;
    setBusy(true);
    try {
      await deleteStoryProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (project?.id === id) { setProject(null); setSelected(null); }
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }
  function changeScene(scene: StoryScene) {
    if (!project) return;
    try { setProject(updateScene(project, scene)); setMessage("تغييرات غير محفوظة"); }
    catch (e) { setError(String(e)); }
  }
  function add() {
    if (!project) return;
    const scene: StoryScene = {
      id: uid(), title: "مشهد " + (project.scenes.length + 1), durationMs: 5000,
      backgroundId: BACKGROUNDS[0]?.id ?? "park", actors: [], cues: [], camera: { framing: "wide" },
    };
    try { setProject(addScene(project, scene)); setSelected(scene.id); setMessage("تغييرات غير محفوظة"); }
    catch (e) { setError(String(e)); }
  }
  const scene = project?.scenes.find(s => s.id === selected);
  const backdrop = BACKGROUNDS.find(b => b.id === scene?.backgroundId);
  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-3xl font-black">استوديو مشاريعي</h1><p className="text-muted-foreground">بناء المشاهد وحفظها محليًا — لا يتم رفع القصص للسحابة.</p></div>
          <div className="flex gap-2"><Link to="/" className="rounded-xl border px-4 py-2">مكتبة الشخصيات</Link><label className="cursor-pointer rounded-xl border px-4 py-2">استيراد JSON<input aria-label="استيراد نسخة احتياطية" type="file" accept=".json,application/json" className="sr-only" onChange={e => { void importBackup(e.target.files?.[0]); e.target.value = ""; }} /></label><button disabled={busy} onClick={create} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground">+ مشروع جديد</button></div>
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
                  <label className="min-w-[220px] flex-1 space-y-1"><span className="text-sm font-bold">عنوان القصة</span><input className={control} value={project.title} onChange={e => { setProject({...project, title:e.target.value, updatedAt: new Date().toISOString()}); setMessage("تغييرات غير محفوظة"); }} /></label>
                  <button disabled={busy} className="rounded-xl border px-4 py-2" onClick={() => exportBackup(project)}>تنزيل نسخة JSON</button><button disabled={busy || !project.title.trim()} className="rounded-xl bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50" onClick={() => save(project)}>حفظ المشروع</button>
                </div>
                <div className="rounded-2xl border p-4">
                  <div className="mb-3 flex justify-between"><h2 className="font-bold">لوحة المشاهد — {project.scenes.length}</h2><button onClick={add} className="rounded-lg bg-secondary px-3 py-1">+ مشهد</button></div>
                  <div className="flex flex-wrap gap-2">{project.scenes.map((s, i) =>
                    <div key={s.id} className={"rounded-xl border p-2 " + (selected===s.id ? "border-primary" : "")}>
                      <button className="block min-w-28 text-right font-bold" onClick={() => setSelected(s.id)}>{i+1}. {s.title}</button>
                      <small>{Math.round(s.durationMs/1000)} ثانية</small>
                      <div className="flex gap-1"><button aria-label="للأمام" disabled={i===0} onClick={()=>{setProject(moveScene(project,i,i-1));setMessage("تغييرات غير محفوظة");}}>→</button><button aria-label="للخلف" disabled={i===project.scenes.length-1} onClick={()=>{setProject(moveScene(project,i,i+1));setMessage("تغييرات غير محفوظة");}}>←</button><button aria-label="حذف المشهد" onClick={()=>{setProject(removeScene(project,s.id));if(selected===s.id)setSelected(null);setMessage("تغييرات غير محفوظة");}}>×</button></div>
                    </div>)}</div>
                  <p className="mt-3 text-sm text-muted-foreground">إجمالي المدة: {(getTimeline(project).at(-1)?.endMs ?? 0)/1000} ثانية</p>
                </div>
                {scene && <div className="grid gap-4 rounded-2xl border p-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="block space-y-1"><span>اسم المشهد</span><input className={control} value={scene.title} onChange={e=>changeScene({...scene,title:e.target.value})}/></label>
                    <label className="block space-y-1"><span>المدة (ثوان)</span><input className={control} type="number" min="1" max="600" value={scene.durationMs/1000} onChange={e=>{const ms=Math.round(Number(e.target.value)*1000);if(ms>0 && Number.isFinite(ms))changeScene({...scene,durationMs:ms});}}/></label>
                    <label className="block space-y-1"><span>الخلفية</span><select className={control} value={scene.backgroundId} onChange={e=>changeScene({...scene,backgroundId:e.target.value})}>{BACKGROUNDS.map(b=><option value={b.id} key={b.id}>{b.label}</option>)}</select></label>
                    <label className="block space-y-1"><span>الكاميرا</span><select className={control} value={scene.camera.framing} onChange={e=>changeScene({...scene,camera:{framing:e.target.value as "wide"|"medium"|"close"}})}><option value="wide">لقطة واسعة</option><option value="medium">لقطة متوسطة</option><option value="close">لقطة قريبة</option></select></label>
                    <label className="block space-y-1"><span>إضافة شخصية</span><select className={control} value="" onChange={e=>{if(!e.target.value)return;changeScene({...scene,actors:[...scene.actors,{id:uid(),characterId:e.target.value,x:0,scale:1}]});}}><option value="">اختر شخصية…</option>{characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                    {scene.actors.map(a=><div key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2"><span className="flex-1">{characters.find(c=>c.id===a.characterId)?.name ?? a.characterId}</span><button onClick={()=>changeScene({...scene,actors:scene.actors.filter(x=>x.id!==a.id),cues:scene.cues.filter(c=>c.actorId!==a.id)})}>حذف</button></div>)}
                  </div>
                  <div className="space-y-3">
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-muted" style={backdrop?{backgroundImage:`url("${backdrop.src}")`,backgroundSize:"cover",backgroundPosition:"center"}:{}}><span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-white">{scene.title} · {scene.actors.length} شخصيات</span></div>
                    <p className="text-sm text-muted-foreground">هذه معاينة للخلفية فقط؛ عرض الشخصيات وتحريكها عبر المحرر الزمني يأتي في المرحلة التالية.</p>
                    <h3 className="font-bold">الحوار والحركات</h3>
                    {scene.cues.map(c=><div key={c.id} className="space-y-2 rounded-lg border p-2 text-sm"><div className="flex justify-between"><span>{c.kind === "speech" ? "حوار" : "حركة"}</span><button aria-label="حذف الإشارة" onClick={()=>changeScene({...scene,cues:scene.cues.filter(x=>x.id!==c.id)})}>×</button></div><input aria-label="نص الحوار أو الحركة" className={control} value={c.value} onChange={e=>changeScene({...scene,cues:scene.cues.map(x=>x.id===c.id?{...x,value:e.target.value}:x)})}/><div className="grid grid-cols-2 gap-2"><label>البداية (ثانية)<input aria-label="بداية الإشارة" className={control} type="number" min="0" step="0.1" value={c.atMs/1000} onChange={e=>{const atMs=Math.round(Number(e.target.value)*1000);if(Number.isFinite(atMs) && atMs>=0)changeScene({...scene,cues:scene.cues.map(x=>x.id===c.id?{...x,atMs}:x)})}}/></label><label>المدة (ثانية)<input aria-label="مدة الإشارة" className={control} type="number" min="0.1" step="0.1" value={c.durationMs/1000} onChange={e=>{const durationMs=Math.round(Number(e.target.value)*1000);if(Number.isFinite(durationMs) && durationMs>0)changeScene({...scene,cues:scene.cues.map(x=>x.id===c.id?{...x,durationMs}:x)})}}/></label></div></div>)}
                    {scene.actors.length>0 && <button className="rounded-lg bg-secondary px-3 py-2" onClick={()=>{const id=scene.actors[0]!.id;if(project) { try { const next = addCue(project,scene.id,{id:uid(),actorId:id,atMs:0,durationMs:Math.min(1000,scene.durationMs),kind:"speech",value:"مرحبًا بكم في قصتنا"}); setProject(next); setMessage("تغييرات غير محفوظة"); } catch (e) { setError(String(e)); } }}}>+ أضف حوارًا نموذجيًا</button>}
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
