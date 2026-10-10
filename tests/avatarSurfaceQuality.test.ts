import { describe, expect, test } from "bun:test";
import {
  BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  NearestFilter, Texture,
} from "three";
import { enhanceSurfaceSampling, inspectSurfaceQuality, describeSurfaceLimitations } from "../src/lib/avatarSurfaceQuality";

function fixture() {
  const root = new Group();
  const texture = new Texture({ width: 256, height: 256 } as HTMLImageElement);
  texture.needsUpdate = true;
  const material = new MeshStandardMaterial({
    color: "#9b6249", roughness: 0.72, metalness: 0.08,
    map: texture, normalMap: texture,
  });
  root.add(new Mesh(new BoxGeometry(1, 1, 1), material));
  return { root, material, texture };
}

describe("PBR character surface clarity", () => {
  test("inspects actual maps, texture resolution, triangles, PBR and normal detail", () => {
    const { root } = fixture();
    const report = inspectSurfaceQuality(root);
    expect(report.textureCount).toBe(1); // shared albedo/normal image, not duplicated
    expect(report.triangleCount).toBe(12);
    expect(report.knownResolutionCount).toBe(1);
    expect(report.lowResolutionCount).toBe(1);
    expect(report.pbrMaterialCount).toBe(1);
    expect(report.normalMappedMaterialCount).toBe(1);
    expect(describeSurfaceLimitations(report)).toContain(
      "توجد 1 خريطة نسيج يقل أحد أبعادها عن 512 بكسل؛ افحص وضوحها عن قرب.");
  });
  test("respects GPU max and preserves authored appearance and source materials", () => {
    const { root, texture, material } = fixture();
    expect(enhanceSurfaceSampling(root, 16)).toBe(1);
    expect(texture.anisotropy).toBe(8);
    expect(enhanceSurfaceSampling(root, 16)).toBe(0);
    expect(material.roughness).toBe(0.72);
    expect(material.metalness).toBe(0.08);
    expect(material.color.getHexString()).toBe("9b6249");
    expect(enhanceSurfaceSampling(root, 1)).toBe(0);
  });
  test("preserves deliberately nearest-neighbor sampled textures", () => {
    const { root, texture } = fixture();
    texture.magFilter = NearestFilter;
    expect(enhanceSurfaceSampling(root, 8)).toBe(0);
    expect(texture.anisotropy).toBe(1);
  });
  test("reports unknown sizes and non-PBR materials without claiming visual failure", () => {
    const root = new Group();
    root.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial()));
    const report = inspectSurfaceQuality(root);
    expect(report.textureCount).toBe(0);
    expect(report.pbrMaterialCount).toBe(0);
    expect(describeSurfaceLimitations(report).some(x => x.includes("PBR"))).toBe(true);
    expect(enhanceSurfaceSampling(root, Number.NaN)).toBe(0);
  });
});
