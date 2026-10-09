import { describe, expect, test } from "bun:test";
import { MAX_GLB_BYTES, validateGlbHeader } from "../src/lib/localGlbStorage";
import { useCharacterLibrary } from "../src/lib/characterLibrary";

function makeHeader(length: number, version = 2, magic = 0x46546c67) {
  const bytes = new Uint8Array(12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, magic, true);
  view.setUint32(4, version, true);
  view.setUint32(8, length, true);
  return bytes;
}

describe("Local premium GLB imports", () => {
  test("accepts a valid glTF 2.0 GLB header and matching byte length", () => {
    expect(validateGlbHeader(makeHeader(128), 128)).toBeNull();
  });
  test("rejects bad magic, wrong versions, length mismatch and short files", () => {
    expect(validateGlbHeader(makeHeader(128, 2, 0), 128)).toContain("glTF");
    expect(validateGlbHeader(makeHeader(128, 1), 128)).toContain("2.0");
    expect(validateGlbHeader(makeHeader(128), 120)).toContain("طول");
    expect(validateGlbHeader(makeHeader(10), 10)).not.toBeNull();
  });
  test("enforces a bounded binary size", () => {
    expect(MAX_GLB_BYTES).toBe(60 * 1024 * 1024);
  });
  test("accepts an IndexedDB GLB reference without requiring an external URL", () => {
    const id = useCharacterLibrary.getState().addCharacter({
      name: "محلية", category: "women", provider: "imported-glb",
      assetId: "glb-a24fdc4f-889a-4b27-b186-f0bc4feeb157", tags: [],
    });
    expect(useCharacterLibrary.getState().characters.find((character) => character.id === id)?.assetId)
      .toBe("glb-a24fdc4f-889a-4b27-b186-f0bc4feeb157");
    useCharacterLibrary.getState().deleteCharacter(id);
  });
  test("rejects invalid local file identifiers", () => {
    expect(() => useCharacterLibrary.getState().addCharacter({
      name: "خطأ", category: "other", provider: "imported-glb",
      assetId: "javascript:bad", tags: [],
    })).toThrow();
  });
});
