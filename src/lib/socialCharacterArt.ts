/**
 * Offline, user-owned 2D character illustration pack.
 *
 * Unlike the old procedurally assembled avatars, the base layer is ONE cohesive
 * illustration. A professionally layered art pack can overlay mouth/eye poses
 * without separating head, neck or hands. Images are rendered by the SAME
 * Canvas compositor in preview and video export.
 *
 * Only raster formats are accepted: never render uploaded SVG/HTML documents.
 */
import type { CartoonId, SceneExpression, SceneMotion } from "./socialStudio";
import { SAMI_REFERENCE_WEBP } from "./socialReferenceArt";

export type CharacterArtLayer = "base" | "mouthClosed" | "mouthOpen" | "eyesClosed";
export type CharacterArt = Partial<Record<CharacterArtLayer, ImageBitmap>>;
export const ART_LAYER_LABELS: Record<CharacterArtLayer, string> = {
  base: "الرسم الأساسي المتكامل",
  mouthClosed: "طبقة الفم المغلق",
  mouthOpen: "طبقة الفم المفتوح",
  eyesClosed: "طبقة العينين المغلقتين",
};
const DB = "cam-social-content-v1";
const STORE = "assets";
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 4096 * 4096;
const cache = new Map<CartoonId, CharacterArt>();
const IDS: CartoonId[] = ["sami","layla","omar","nour"];
const layers: CharacterArtLayer[] = ["base","mouthClosed","mouthOpen","eyesClosed"];

function assetKey(character: CartoonId, layer: CharacterArtLayer) {
  return "illustrated-character-v1:" + character + ":" + layer;
}
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB === "undefined") return reject(new Error("التخزين المحلي غير متاح"));
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onerror=()=>reject(req.error ?? new Error("تعذر فتح التخزين"));
    req.onblocked=()=>reject(new Error("قاعدة التخزين مشغولة في تبويب آخر"));
    req.onsuccess=()=>resolve(req.result);
  });
}
async function access<T>(mode: IDBTransactionMode, doRequest:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T> {
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    let value:T;
    const tx=db.transaction(STORE,mode);
    const req=doRequest(tx.objectStore(STORE));
    req.onsuccess=()=>{value=req.result;};
    tx.onerror=()=>{db.close();reject(tx.error ?? new Error("تعذر تخزين الصورة"));};
    tx.onabort=()=>{db.close();reject(tx.error ?? new Error("ألغيت عملية التخزين"));};
    tx.oncomplete=()=>{db.close();resolve(value);};
  });
}
function validateFormat(blob:Blob,layer:CharacterArtLayer) {
  const allowed=layer==="base"
    ? ["image/png","image/webp","image/jpeg"]
    : ["image/png","image/webp"];
  if(!allowed.includes(blob.type)) throw new Error("استخدم PNG أو WebP" + (layer==="base" ? " أو JPEG" : " شفاف") + " فقط.");
  if(!blob.size || blob.size>MAX_BYTES) throw new Error("الحد الأقصى 8 ميجابايت لكل طبقة.");
}
async function decode(blob:Blob,layer:CharacterArtLayer):Promise<ImageBitmap> {
  validateFormat(blob,layer);
  if(typeof createImageBitmap!=="function")throw new Error("المتصفح لا يدعم فك الصور؛ استخدم Chrome محدث.");
  const bitmap=await createImageBitmap(blob);
  if(bitmap.width<48 || bitmap.height<48 || bitmap.width*bitmap.height>MAX_PIXELS){
    bitmap.close();throw new Error("أبعاد الصورة يجب أن تكون من 48 بكسل وأقل من 16 ميجابكسل.");
  }
  return bitmap;
}
function updateCache(character:CartoonId, layer:CharacterArtLayer, image?:ImageBitmap) {
  const previous=cache.get(character) ?? {};
  const old=previous[layer];
  if(old && old!==image)old.close();
  const next={...previous};
  if(image)next[layer]=image;
  else delete next[layer];
  if(Object.keys(next).length)cache.set(character,next);
  else cache.delete(character);
}
export function getCharacterArt(character:CartoonId):CharacterArt | null {
  const result=cache.get(character);
  return result?.base ? result : null;
}
export function artStatus(character:CartoonId) {
  const a=cache.get(character);
  return { hasBase:!!a?.base, hasMouth:!!(a?.mouthClosed && a?.mouthOpen), hasBlink:!!a?.eyesClosed };
}
export async function saveCharacterArt(
  character:CartoonId,layer:CharacterArtLayer,blob:Blob|null
):Promise<void> {
  if(!IDS.includes(character) || !layers.includes(layer))throw new Error("معرّف الرسم غير معروف.");
  const bitmap=blob?await decode(blob,layer):undefined;
  const oldBase=cache.get(character)?.base;
  if(bitmap && layer!=="base"){
    if(!oldBase){bitmap.close();throw new Error("ارفع الرسم الأساسي أولًا.");}
    if(bitmap.width!==oldBase.width || bitmap.height!==oldBase.height){
      bitmap.close();throw new Error("كل الطبقات يجب أن تكون بنفس أبعاد الرسم الأساسي بالضبط.");
    }
  }
  try {
    // Replacing the base invalidates all previous mouth / eye anchors.
    const db=await openDb();
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");const store=tx.objectStore(STORE);
      if(layer==="base")for(const name of layers.slice(1))store.delete(assetKey(character,name));
      if(blob)store.put(blob,assetKey(character,layer));
      else store.delete(assetKey(character,layer));
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onerror=()=>{db.close();reject(tx.error ?? new Error("لم يتم حفظ الرسم"));};
      tx.onabort=()=>{db.close();reject(tx.error ?? new Error("أُلغي الحفظ"));};
    });
  } catch(error) {bitmap?.close();throw error;}
  if(layer==="base")for(const name of layers.slice(1))updateCache(character,name);
  updateCache(character,layer,bitmap);
}
export async function hydrateCharacterArt():Promise<void> {
  // Load raster artwork saved in the user's browser, never from a remote server.
  for(const character of IDS){
    const images: Partial<Record<CharacterArtLayer,ImageBitmap>>={};
    for(const layer of layers){
      const blob=await access<Blob|undefined>("readonly",s=>s.get(assetKey(character,layer)));
      if(!blob)continue;
      try {
        const img=await decode(blob,layer);
        if(layer!=="base" && images.base && (img.width!==images.base.width || img.height!==images.base.height)){
          img.close();continue;
        }
        images[layer]=img;
      } catch{ /* keep the rest of a local project usable if an image was corrupted */ }
    }
    if(images.base){
      for(const layer of layers)updateCache(character,layer,images[layer]);
    }
  }
  // One built-in owner-provided illustrated reference; all other actors keep the
  // existing vector fallback until the artist supplies their respective art.
  if(!getCharacterArt("sami"))await restoreSamiReferenceArt();
}
export async function restoreSamiReferenceArt():Promise<void> {
  if(getCharacterArt("sami"))return;
  const blob=await fetch(SAMI_REFERENCE_WEBP).then(res=>res.blob());
  await restoreBuiltinCharacterArt("sami",blob);
}
export async function restoreBuiltinCharacterArt(character: CartoonId, blob: Blob) {
  if(getCharacterArt(character))return;
  const image=await decode(blob,"base");
  if(getCharacterArt(character)){image.close();return;}
  updateCache(character,"base",image);
}
export function hasStoredCharacterArt(character:CartoonId):Promise<boolean> {
  return access<Blob|undefined>("readonly",s=>s.get(assetKey(character,"base")))
    .then(Boolean);
}
/**
 * Draw a complete full-size portrait inside a stable view box, with subtle whole-
 * body breathing. Mouth / eyes are only animated when artist-supplied aligned
 * transparent layers exist. We NEVER fake lip sync on a single still image.
 *
 * The base always defines the full frame dimensions; overlay images must match.
 */
export function paintIllustratedCharacter(
  ctx:CanvasRenderingContext2D,
  character:CartoonId,time:number,voiceAmplitude:number,
  motion:SceneMotion,expression:SceneExpression,
):boolean {
  const art=getCharacterArt(character);
  if(!art?.base)return false;
  const w=488,h=644;
  const x=360-w/2,y=249+4*Math.sin(time*2.3);
  ctx.save();ctx.translate(360,644);
  ctx.rotate((motion==="explain" ? .008 : .004)*Math.sin(time*1.8));
  ctx.translate(-360,-644);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(art.base,x,y,w,h);
  // Overlay artworks contain transparency everywhere except their intended facial patch.
  // No mouth/eye overlay is drawn if source art only has a single illustration.
  if(art.mouthClosed && art.mouthOpen){
    const active=voiceAmplitude>.20 && motion!=="idle" ? art.mouthOpen : art.mouthClosed;
    ctx.drawImage(active,x,y,w,h);
  }
  const blink=(time+1.2)%4.6<.14;
  if(art.eyesClosed && (blink || (expression==="serious" && (time%8)<.16))){
    ctx.drawImage(art.eyesClosed,x,y,w,h);
  }
  ctx.restore();
  return true;
}
