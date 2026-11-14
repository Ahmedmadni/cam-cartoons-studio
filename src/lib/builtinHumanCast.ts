/** Original illustrated wardrobe and hair for Layla and Omar.
 * All layered parts inherit the stable coordinates of Sami's upper-body rig.
 * This gives working pivots while each actor gets distinctive styling.
 */
import { loadSamiVectorSource, type VectorCharacterPack } from "./builtinSamiRig";

type Human = "layla" | "omar";
type Pack = VectorCharacterPack;
function transform(source:Pack, replacements:ReadonlyArray<readonly [string,string]>):Pack {
  let defs=source.defs;
  const layers={...source.layers};
  for(const [from,to] of replacements){
    defs=defs.split(from).join(to);
    for(const k of Object.keys(layers))layers[k]=(layers[k]??"").split(from).join(to);
  }
  return {...source,defs,layers};
}
const laylaColors:ReadonlyArray<readonly [string,string]> = [
  ["#ffe2be","#ffe4ca"],["#fbc09b","#f0c2ac"],["#ed9a82","#df9c89"],
  ["#cc736b","#b87c72"],["#ffe0b7","#ffe8d2"],["#ffc9a8","#f9d0bb"],
  ["#f6aa91","#e9a899"],["#df897b","#ce8a80"],["#b9756b","#be837e"],
  ["#f3a22e","#9374c3"],["#ffc447","#ba9cdb"],["#ffde73","#e4cef2"],
  ["#c9792b","#6b4c9c"],["#f2b43a","#aa8bcf"],["#c88726","#7355a4"],
  ["#a96b28","#7355a4"],["#a7652a","#75559e"],["#e8a439","#ab8dce"],
  ["#ffe48a","#f6dcff"],["#9c572d","#705592"],["#f0a732","#aa88ce"],
  ["#fff0a0","#f8e7ff"],["#f5b749","#cfb0e7"],["#ffec94","#f4e5ff"],
  ["#ffe16f","#e4c6f2"],["#b77730","#896aa8"],["#ba7b2e","#775896"],
];
const omarColors:ReadonlyArray<readonly [string,string]> = [
  ["#ffe2be","#f1cba9"],["#fbc09b","#dbaa88"],["#ed9a82","#bd896e"],
  ["#cc736b","#a36c56"],["#ffe0b7","#f3cfaa"],["#ffc9a8","#e1b08c"],
  ["#f6aa91","#cf9d7c"],["#df897b","#b6836b"],["#b9756b","#9d6856"],
  ["#f3a22e","#338e83"],["#ffc447","#6ac7b3"],["#ffde73","#a8dfd2"],
  ["#c9792b","#226e61"],["#f2b43a","#449f91"],["#c88726","#2d7b70"],
  ["#a96b28","#28776d"],["#a7652a","#2b786e"],["#e8a439","#58b5a4"],
  ["#ffe48a","#b4e6d8"],["#9c572d","#287366"],["#f0a732","#51aa99"],
  ["#fff0a0","#c5ebdf"],["#f5b749","#88cabc"],["#ffec94","#e8fcf4"],
  ["#ffe16f","#abdccb"],["#b77730","#327f73"],["#ba7b2e","#347b70"],
];
function faceSection(source:string):string {
  const start=source.indexOf("<!-- ears organically");
  const end=source.indexOf("<!-- detailed dimensional");
  if(start<0||end<=start)throw new Error("تعذر استخراج معالم الوجه.");
  return source.slice(start,end);
}
const LAYLA_DEFS=`
<linearGradient id="scarf" x1="0" y1="0" x2=".95" y2="1">
 <stop stop-color="#fcf0fc"/><stop offset=".35" stop-color="#d5bee8"/>
 <stop offset=".7" stop-color="#ad8ccc"/><stop offset="1" stop-color="#74558e"/>
</linearGradient>
<linearGradient id="scarfShade" x1="0" y1="0" x2="1" y2="1">
 <stop stop-color="#ba9ad6"/><stop offset=".52" stop-color="#9c7bb9"/>
 <stop offset="1" stop-color="#665082"/>
</linearGradient>`;
const LAYLA_BACK=`
<path d="M177 174 C152 170 153 129 168 98 C188 58 237 49 265 56
 C309 56 338 93 345 142 C348 190 336 241 358 310
 C370 346 379 374 370 416 Q332 446 298 410
 C307 374 298 337 285 317 L205 314 C184 359 190 401 162 424
 Q123 420 124 375 C140 319 145 248 153 204 Q159 183 177 174Z"
 fill="url(#scarf)" stroke="#74558e" stroke-width="4" stroke-linejoin="round"/>
<path d="M171 124 C194 73 263 56 312 92 C273 69 217 76 188 115Z"
 fill="#faf0ff" opacity=".62"/>`;
const LAYLA_FRONT=`
<path d="M173 138 Q181 105 209 91 C241 65 295 70 317 113
 Q327 145 313 180 C307 142 293 116 263 111
 C236 128 204 147 183 181 Q171 159 173 138Z"
 fill="url(#scarf)" stroke="#73588a" stroke-width="3.2"/>
<path d="M164 163 C151 219 162 290 191 331 C197 355 188 391 168 420
 Q141 407 151 337 C151 299 145 232 164 163Z"
 fill="url(#scarfShade)" stroke="#6e5288" stroke-width="3"/>
<path d="M315 162 C338 212 327 279 307 329 C320 368 343 397 366 411
 Q336 421 307 398 C285 378 279 350 294 321 C317 259 326 192 315 162Z"
 fill="url(#scarfShade)" stroke="#71548b" stroke-width="3"/>
<path d="M176 125 C205 85 267 78 301 104 M162 220 Q157 283 179 340
 M320 230 C323 283 314 320 301 346"
 fill="none" stroke="#f7eafa" stroke-width="5" opacity=".64" stroke-linecap="round"/>`;
const OMAR_HAIR=`
<path d="M169 189 C148 166 156 126 172 102 C190 68 218 67 248 72
 C270 56 312 76 328 103 C342 130 332 165 316 187
 L309 176 C318 136 305 118 303 118 C288 138 275 130 248 132
 C226 134 211 114 198 126 C180 144 181 171 178 187Z"
 fill="url(#hair)" stroke="#302932" stroke-width="4"/>
<path d="M180 135 Q199 90 246 82 C274 88 289 103 302 111
 C270 100 246 105 225 99 C207 110 196 128 180 135Z"
 fill="#8c6a57" opacity=".5"/>
<path d="M189 102 Q214 74 252 86 M292 95 Q310 109 315 134"
 stroke="#aa8364" fill="none" opacity=".55" stroke-width="5" stroke-linecap="round"/>
<path d="M173 175 Q173 200 188 211 L186 232 Q167 219 167 196Z
 M318 176 Q319 199 306 213 L307 230 Q330 218 326 196Z"
 fill="#44363f" opacity=".85"/>`;
const OMAR_BEARD=`
<path d="M185 269 Q203 305 228 318 Q245 328 259 320
 C280 314 297 289 308 263 Q304 287 290 311
 Q273 333 245 337 Q218 330 202 317 C191 304 186 283 185 269Z"
 fill="#4a3c40" opacity=".34"/>
<path d="M224 270 Q235 263 241 270 M254 270 Q267 263 277 270"
 stroke="#5d4b49" stroke-width="3" opacity=".7" fill="none" stroke-linecap="round"/>`;
const OMAR_GLASSES=`
<path d="M181 202 Q207 190 234 201 L238 227 Q232 247 209 246
 Q183 246 181 229Z
 M261 201 Q288 191 315 204 L314 228 Q307 247 285 247
 Q264 245 261 228Z
 M237 208 Q247 201 263 208 M181 210 L169 204 M315 209 L327 205"
 stroke="#324452" stroke-width="5.4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M191 207 L204 203 M271 206 L281 202"
 stroke="#fff" stroke-width="2.5" opacity=".73" fill="none" stroke-linecap="round"/>`;
function mouthVariations(layers:Record<string,string>,color:string){
  layers.mouthSmall=`
<path d="M231 280 Q245 274 263 280 Q274 286 263 294 Q243 299 231 290Z"
 fill="MOUTHCOLOR" stroke="#773c4b" stroke-width="2.3"/>
<path d="M235 282 Q248 281 261 282 Q252 288 237 286Z" fill="#fff7ed"/>`.replace("MOUTHCOLOR",color);
  layers.mouthRound=`
<path d="M240 272 C247 270 261 269 268 278 C274 290 268 305 254 306
 C240 308 234 298 235 285 Q235 276 240 272Z"
 fill="MOUTHCOLOR" stroke="#793949" stroke-width="2.4"/>
<ellipse cx="253" cy="298" rx="9" ry="4" fill="#e98d9b"/>`.replace("MOUTHCOLOR",color);
  layers.mouthWide=`
<path d="M224 280 C239 270 269 271 284 279 Q294 299 276 314
 Q253 330 230 313 Q217 297 224 280Z"
 fill="MOUTHCOLOR" stroke="#793844" stroke-width="2.6"/>
<path d="M228 281 Q256 285 280 280 L278 291 Q252 300 231 289Z" fill="#fff9ef"/>
<path d="M236 308 Q252 302 272 308 Q253 320 236 308Z" fill="#e98b9b"/>`.replace("MOUTHCOLOR",color);
}
export async function createHumanVectorPack(character:Human):Promise<Pack>{
  const base=await loadSamiVectorSource();
  const pack=transform(base,character==="layla"?laylaColors:omarColors);
  const face=faceSection(pack.layers.head??"");
  if(character==="layla"){
    pack.defs+=LAYLA_DEFS;
    pack.layers.head=LAYLA_BACK+face+LAYLA_FRONT;
    pack.layers.eyesOpen+=(`<path d="M188 215 L185 206 M194 211 L190 201
 M305 215 L311 206 M299 211 L305 202"
 stroke="#67465b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
    pack.layers.torso+=(`
<path d="M181 385 Q206 414 220 429 M310 381 Q293 419 272 437"
 fill="none" stroke="#f4dffa" stroke-width="6" opacity=".72" stroke-linecap="round"/>
<path d="M124 627 Q244 608 374 629" fill="none" stroke="#e5d0ee" stroke-width="4" opacity=".5"/>`);
    mouthVariations(pack.layers,"#95465b");
  } else {
    pack.layers.head=OMAR_HAIR+face+OMAR_BEARD;
    for(const state of ["eyesOpen","eyesHalf","eyesClosed"])
      pack.layers[state]=(pack.layers[state]??"")+OMAR_GLASSES;
    pack.layers.torso+=(`
<path d="M241 385 L253 385 L264 402 L248 430 L233 401Z"
 fill="#264c68" stroke="#365770" stroke-width="2"/>
<path d="M248 430 L267 405 L273 518 L251 543 L226 512Z"
 fill="#365f82" stroke="#264d6d" stroke-width="2.4"/>
<path d="M254 438 L259 512" stroke="#a0bdd4" stroke-width="2.5" opacity=".56"/>`);
    mouthVariations(pack.layers,"#814149");
  }
  return pack;
}
