/** Local, no-account illustrated actor art loader. Built-in fallback does not alter saved custom artwork. */
import { rasterizeVectorCharacter } from "./builtinSamiRig";
import { createHumanVectorPack } from "./builtinHumanCast";
import { createNourVectorPack } from "./builtinNourArt";
import type { CharacterArt } from "./socialCharacterArt";
export type AdditionalActor = "layla" | "omar" | "nour";
export async function createBuiltinCastArt(character:AdditionalActor):Promise<CharacterArt> {
  const source=character==="nour" ? createNourVectorPack() : await createHumanVectorPack(character);
  // Native 488x644px bitmaps keep memory reasonable on phones. The editable source
  // itself remains vector; HD render source upgrades are a separate optimization.
  return rasterizeVectorCharacter(source,1);
}
