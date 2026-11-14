/** Nour's original illustrated robot: articulated enamel shell, cohesive helmet,
 * back-lit eyes, independent arm/hand parts and multiple mouth glyphs.
 */
import type { VectorCharacterPack } from "./builtinSamiRig";
export function createNourVectorPack():VectorCharacterPack {
const defs=`
<linearGradient id="metal" x1="0" y1="0" x2=".9" y2="1">
 <stop stop-color="#cefbff"/><stop offset=".28" stop-color="#a1e3f5"/>
 <stop offset=".67" stop-color="#559fd5"/><stop offset="1" stop-color="#2d69a4"/>
</linearGradient>
<linearGradient id="head" x1="0" y1="0" x2=".9" y2="1">
 <stop stop-color="#f7ffff"/><stop offset=".4" stop-color="#c0efff"/>
 <stop offset="1" stop-color="#72b4dd"/>
</linearGradient>
<linearGradient id="visor" x1="0" y1="0" x2="1" y2="1">
 <stop stop-color="#315d86"/><stop offset=".55" stop-color="#213d65"/>
 <stop offset="1" stop-color="#152b4a"/>
</linearGradient>
<radialGradient id="glow">
 <stop stop-color="#edfffc"/><stop offset=".45" stop-color="#a4ffe9"/>
 <stop offset="1" stop-color="#4ed7cf"/>
</radialGradient>`;
const layers:Record<string,string>={};
layers.torso=`
<!-- Neck is rooted behind the head and firmly connected to torso. -->
<path d="M214 296 Q242 285 274 296 L280 368 Q245 388 204 362Z"
 fill="url(#metal)" stroke="#326e9c" stroke-width="4"/>
<path d="M152 345 Q245 323 336 349 C372 375 389 469 387 644
 L100 644 C105 479 108 388 152 345Z"
 fill="url(#metal)" stroke="#296498" stroke-width="5"/>
<path d="M156 373 Q243 352 332 377 L347 615 Q248 640 139 615Z"
 fill="#d7f8ff" stroke="#4b8db8" stroke-width="4"/>
<path d="M182 394 Q245 409 310 394 L314 461 Q247 470 177 460Z"
 fill="#347db1" stroke="#2c639b" stroke-width="3"/>
<rect x="201" y="410" width="88" height="25" rx="12" fill="#bffff0"/>
<path d="M182 513 Q250 532 312 513 M174 550 H314" fill="none" stroke="#73b3c9" stroke-width="4.5"/>
<path d="M142 614 Q242 600 346 618" fill="none" stroke="#fff" stroke-width="5" opacity=".6"/>
<circle cx="223" cy="424" r="8" fill="#43c3d2"/><circle cx="262" cy="424" r="8" fill="#ffdb83"/>`;
layers.leftUpperArm=`
<path d="M145 352 C118 348 107 371 97 405 L81 481 Q101 498 127 490
 L161 410 C170 381 168 360 145 352Z"
 fill="url(#metal)" stroke="#2a608d" stroke-width="4"/>
<path d="M121 371 Q104 399 106 432" fill="none" stroke="#e9ffff" stroke-width="7" opacity=".65"/>
<path d="M82 464 Q105 488 130 474" fill="none" stroke="#6bc4da" stroke-width="7"/>`;
layers.leftForearm=`
<path d="M84 478 Q105 494 129 483 L121 548 Q112 573 85 562 L77 501Z"
 fill="url(#metal)" stroke="#2a618e" stroke-width="4"/>
<path d="M84 497 Q102 503 117 497" stroke="#e5fdff" stroke-width="5" fill="none" opacity=".7"/>`;
layers.leftHand=`
<path d="M80 546 Q103 534 121 549 L128 566 Q145 571 141 586
 L135 603 Q118 615 94 609 Q75 602 69 583 L68 563Z"
 fill="url(#head)" stroke="#3d7caa" stroke-width="4"/>
<path d="M84 571 V595 M99 569 V606 M114 570 V604"
 stroke="#5996bc" stroke-width="3" fill="none"/>`;
layers.rightUpperArm=`
<path d="M343 352 C370 348 381 371 391 405 L407 481 Q387 498 361 490
 L327 410 C318 381 320 360 343 352Z"
 fill="url(#metal)" stroke="#2a608d" stroke-width="4"/>
<path d="M367 371 Q385 399 382 432" fill="none" stroke="#e9ffff" stroke-width="7" opacity=".65"/>
<path d="M406 464 Q383 488 358 474" fill="none" stroke="#6bc4da" stroke-width="7"/>`;
layers.rightForearm=`
<path d="M404 478 Q383 494 359 483 L367 548 Q377 573 403 562 L411 501Z"
 fill="url(#metal)" stroke="#2a618e" stroke-width="4"/>
<path d="M404 497 Q387 503 370 497" stroke="#e5fdff" stroke-width="5" fill="none" opacity=".7"/>`;
layers.rightHand=`
<path d="M408 546 Q385 534 367 549 L359 566 Q343 571 347 586
 L353 603 Q370 615 394 609 Q414 602 419 583 L420 563Z"
 fill="url(#head)" stroke="#3d7caa" stroke-width="4"/>
<path d="M404 571 V595 M389 569 V606 M374 570 V604"
 stroke="#5996bc" stroke-width="3" fill="none"/>`;
layers.head=`
<!-- A single, complete coherent helmet rather than a floating head circle. -->
<path d="M244 115 V76" stroke="#3b79a8" stroke-width="9" stroke-linecap="round"/>
<ellipse cx="244" cy="67" rx="15" ry="14" fill="#ffe4a1" stroke="#dcad59" stroke-width="3"/>
<path d="M176 125 C207 98 278 91 313 128 C340 154 336 228 328 284
 C318 320 278 339 245 339 C208 336 174 321 161 283
 C150 226 151 155 176 125Z" fill="url(#head)" stroke="#2c649a" stroke-width="5"/>
<path d="M181 153 Q245 121 307 151 C327 185 323 268 303 289
 C281 310 211 311 189 289 C164 263 163 187 181 153Z"
 fill="url(#visor)" stroke="#4976a5" stroke-width="4"/>
<path d="M185 147 Q242 124 297 145" stroke="#ffffff" stroke-width="7" opacity=".64" fill="none"/>
<path d="M173 257 Q182 304 222 316" stroke="#bdeeff" stroke-width="4.5" fill="none" opacity=".62"/>
<path d="M312 186 Q327 239 306 289" stroke="#7ce1f3" stroke-width="5" fill="none" opacity=".35"/>
<circle cx="158" cy="233" r="18" fill="#66b7dc" stroke="#2b6698" stroke-width="4"/>
<circle cx="330" cy="233" r="18" fill="#66b7dc" stroke="#2b6698" stroke-width="4"/>
<circle cx="158" cy="233" r="7" fill="#bffff3"/><circle cx="330" cy="233" r="7" fill="#bffff3"/>`;
layers.eyesOpen=`
<path d="M187 211 Q209 190 230 212 Q236 239 212 243 Q188 238 187 211Z
 M258 211 Q280 190 301 212 Q307 239 283 243 Q259 238 258 211Z"
 fill="url(#glow)" stroke="#84ffe4" stroke-width="3"/>
<ellipse cx="211" cy="220" rx="8" ry="13" fill="#245e75"/>
<ellipse cx="283" cy="220" rx="8" ry="13" fill="#245e75"/>
<circle cx="207" cy="213" r="4.5" fill="white"/><circle cx="279" cy="213" r="4.5" fill="white"/>`;
layers.eyesHalf=`
<path d="M191 218 Q210 211 230 220 Q226 232 211 233 Q195 230 191 218Z
 M261 219 Q281 211 301 220 Q296 232 281 233 Q265 230 261 219Z"
 fill="#a3ffe9" stroke="#4bc8c5" stroke-width="3"/>`;
layers.eyesClosed=`
<path d="M191 224 Q211 235 232 223 M260 223 Q280 236 301 224"
 stroke="#92ffdc" stroke-width="6" stroke-linecap="round" fill="none"/>`;
layers.browsNeutral=`
<path d="M193 191 Q210 183 228 191 M264 190 Q284 183 302 191"
 stroke="#7de1e8" stroke-width="4" fill="none" stroke-linecap="round"/>`;
layers.browsRaised=`
<path d="M192 184 Q210 173 229 183 M263 184 Q283 171 303 182"
 stroke="#a8fff3" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
layers.mouthClosed=`
<path d="M217 276 Q245 292 277 275"
 stroke="#a2ffe7" stroke-width="6" stroke-linecap="round" fill="none"/>`;
layers.mouthSmall=`
<path d="M230 274 Q247 271 264 276 Q271 289 244 294 Q225 289 230 274Z"
 fill="#64ecd5" stroke="#b6fff1" stroke-width="2.5"/>`;
layers.mouthRound=`
<ellipse cx="245" cy="284" rx="13" ry="17" fill="#62ffe1" stroke="#b4fff1" stroke-width="3"/>
<ellipse cx="245" cy="285" rx="6.5" ry="9" fill="#235777"/>`;
layers.mouthOpen=`
<path d="M220 271 Q243 269 274 273 Q280 304 246 311 Q216 305 220 271Z"
 fill="#5becd9" stroke="#b7fff0" stroke-width="3"/>
<path d="M226 284 Q244 292 269 283" stroke="#246079" stroke-width="4.5" fill="none"/>`;
layers.mouthWide=`
<path d="M213 271 Q245 264 279 271 Q283 317 246 319 Q210 313 213 271Z"
 fill="#5af1dc" stroke="#c7fff2" stroke-width="3"/>
<path d="M222 285 Q244 294 273 285" stroke="#225977" stroke-width="5" fill="none"/>`;
return {width:488,height:644,defs,layers};
}
