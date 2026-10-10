import { describe, expect, test } from "bun:test";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Texture } from "three";
import { applyMpfbSurfaceFixes, isPinnedMpfbModel } from "../src/lib/mpfbSurfaceFixes";

const pinned = "https://raw.githubusercontent.com/privacypuppet/privacypuppet/ff1b635eba22d782423a6d81233e8deca7f6d1bd/public/mpfb_models/kofi-v2.glb";

function fixture() {
  const root = new Group();
  const image = new Texture();
  const face = new MeshStandardMaterial({ name: "makeskin", map: image, color: "#aa7851", roughness: 0.72, metalness: 0.05, transparent: false });
  const lashes = new MeshStandardMaterial({ name: "eyelashes", map: image, transparent: true, roughness: 0.8 });
  const dress = new MeshStandardMaterial({ name: "cotton", color: "green", roughness: 0.96 });
  const low = new Mesh(new BoxGeometry(), face); low.name = "low-poly_face";
  const high = new Mesh(new BoxGeometry(), face); high.name = "high-poly_eyes";
  const hair = new Mesh(new BoxGeometry(), lashes); hair.name = "ponytail";
  const clothing = new Mesh(new BoxGeometry(), dress); clothing.name = "shirt";
  root.add(low, high, hair, clothing);
  return { root, low, high, hair, clothing, face, lashes, dress };
}

describe("MPFB real-surface display correction", () => {
  test("strictly restricts the fix to three pinned original models and same-origin CI fixtures", () => {
    expect(isPinnedMpfbModel(pinned)).toBe(true);
    expect(isPinnedMpfbModel(pinned.replace("kofi-v2", "yuki-v2"))).toBe(true);
    expect(isPinnedMpfbModel(pinned.replace("kofi-v2", "liam-v2"))).toBe(true);
    expect(isPinnedMpfbModel("/__qa__/candidates/curated-mpfb-kofi.glb")).toBe(true);
    expect(isPinnedMpfbModel(pinned.replace("privacypuppet/privacypuppet", "else/repo"))).toBe(false);
    expect(isPinnedMpfbModel(pinned.replace("ff1b635eba22d782423a6d81233e8deca7f6d1bd", "other"))).toBe(false);
    expect(isPinnedMpfbModel("blob:https://example.com/dummy")).toBe(false);
  });
  test("repairs overlay and transparent edges without changing PBR color, maps or roughness", () => {
    const { root, low, high, hair, clothing, face, lashes, dress } = fixture();
    const fixes = applyMpfbSurfaceFixes(root, pinned, true);
    expect(fixes.hiddenLowPolyOverlays).toBe(1);
    expect(fixes.correctedFaceMaterials).toBe(1);
    expect(fixes.correctedHairMaterials).toBe(1);
    expect(fixes.clonedMaterials).toBe(2);
    expect(low.visible).toBe(false);
    const faceAfter = high.material as MeshStandardMaterial;
    const hairAfter = hair.material as MeshStandardMaterial;
    expect(faceAfter).not.toBe(face);
    expect(faceAfter.map).toBe(face.map);
    expect(faceAfter.color.equals(face.color)).toBe(true);
    expect(faceAfter.roughness).toBe(0.72);
    expect(faceAfter.metalness).toBe(0.05);
    expect(faceAfter.polygonOffset).toBe(true);
    expect(faceAfter.alphaTest).toBeGreaterThanOrEqual(0.42);
    expect(hairAfter).not.toBe(lashes);
    expect(hairAfter.alphaTest).toBeGreaterThan(0.2);
    expect(hairAfter.map).toBe(lashes.map);
    expect(clothing.material).toBe(dress);
    expect(face.alphaTest).toBe(0);
    expect(lashes.alphaTest).toBe(0);
  });
  test("does not remove low-poly geometry unless a high-poly companion exists", () => {
    const root = new Group();
    const face = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    face.name = "low-poly_face";
    root.add(face);
    const result = applyMpfbSurfaceFixes(root, pinned, true);
    expect(result.hiddenLowPolyOverlays).toBe(0);
    expect(face.visible).toBe(true);
  });
  test("disabled comparison and unrelated imported assets stay completely unchanged", () => {
    const example = fixture();
    expect(applyMpfbSurfaceFixes(example.root, pinned, false).clonedMaterials).toBe(0);
    expect(applyMpfbSurfaceFixes(example.root, "/user-owned.glb", true).hiddenLowPolyOverlays).toBe(0);
    expect(example.low.visible).toBe(true);
    expect(example.high.material).toBe(example.face);
    expect(example.hair.material).toBe(example.lashes);
  });
  test("does not force PBR changes on basic material or opaque hair", () => {
    const root = new Group();
    const face = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    face.name = "high-poly";
    const hair = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ color: "#21150d", transparent: false }));
    hair.name = "hair";
    root.add(face, hair);
    const report = applyMpfbSurfaceFixes(root, pinned, true);
    expect(report.clonedMaterials).toBe(0);
    expect(hair.material.transparent).toBe(false);
  });
});
