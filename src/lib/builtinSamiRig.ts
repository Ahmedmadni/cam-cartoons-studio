/**
 * First-party art direction master for Sami: hand-contoured illustrated 2D
 * face, hair, yellow overshirt, complete limbs and expressive facial overlays.
 * Each layer is editable SVG source packed here (gzip), rasterized with alpha
 * through Canvas at 2x on supported browsers. No network/API cost.
 *
 * Source: original studio-commission style vector illustration; not a traced
 * copy of the low-resolution sample image. Built-in only, never replaces user
 * supplied artwork in IndexedDB.
 */
import type { CharacterArt, CharacterArtLayer } from "./socialCharacterArt";

/* gzip(JSON({defs,layers,width,height})) -- source vectors with Bezier anatomy */
const PACK = "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";

/** First-party source archive is trusted; user uploads never go through SVG. */
type Pack = {defs:string;layers:Record<string,string>;width:number;height:number};
const expected = ["torso","head","leftUpperArm","leftForearm","leftHand",
  "rightUpperArm","rightForearm","rightHand","mouthClosed","mouthOpen",
  "eyesOpen","eyesHalf","eyesClosed","browsNeutral","browsRaised"] as const;
async function decodeSource():Promise<Pack> {
  if(typeof DecompressionStream==="undefined") throw new Error("المتصفح لا يدعم فك الرسم المضغوط.");
  const bytes=Uint8Array.from(atob(PACK),x=>x.charCodeAt(0));
  const stream=new Blob([bytes.buffer as ArrayBuffer]).stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const data=JSON.parse(await new Response(stream).text()) as Pack;
  if(data.width!==488||data.height!==644||
    expected.some(id=>typeof data.layers?.[id]!=="string"))throw new Error("أرشيف الرسومات المدمجة غير صالح.");
  return data;
}
async function rasterize(svg:string,width=976,height=1288):Promise<ImageBitmap> {
  const blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const image=new Image();
  try {
    image.src=url;
    await image.decode();
    const canvas=document.createElement("canvas");
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d");
    if(!ctx)throw new Error("تعذر إعداد طبقة الشخصية.");
    ctx.drawImage(image,0,0,width,height);
    return await createImageBitmap(canvas);
  } finally {URL.revokeObjectURL(url);}
}
/** A real, aligned, 15-layer illustrated art pack, not a cutup screenshot. */
export async function createBuiltinSamiArt():Promise<CharacterArt> {
  const data=await decodeSource();
  const result:CharacterArt={};
  try {
    for(const id of expected) {
      const svg='<svg xmlns="http://www.w3.org/2000/svg" width="488" height="644" viewBox="0 0 488 644"><defs>'
        +data.defs+'</defs>'+data.layers[id]+'</svg>';
      result[id as CharacterArtLayer]=await rasterize(svg);
    }
    const canvas=document.createElement("canvas");
    canvas.width=976;canvas.height=1288;
    const c=canvas.getContext("2d");
    if(!c)throw new Error("تعذر تجميع الشخصية.");
    // Draw the same rest pose layering as the actual animation renderer.
    const order=["torso","leftUpperArm","leftForearm","leftHand",
      "rightUpperArm","rightForearm","rightHand","head","browsNeutral","eyesOpen","mouthClosed"] as const;
    for(const key of order)if(result[key])c.drawImage(result[key],0,0,976,1288);
    result.base=await createImageBitmap(canvas);
    return result;
  } catch(error){
    for(const image of Object.values(result))image?.close();
    throw error;
  }
}
