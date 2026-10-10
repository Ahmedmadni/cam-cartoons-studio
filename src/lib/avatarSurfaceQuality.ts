import { NearestFilter, NearestMipmapLinearFilter, NearestMipmapNearestFilter } from "three";
import type { Material, Object3D, Texture, Mesh } from "three";

/**
 * Analyze actual glTF surface resources; this is NOT an artistic realism score.
 * Observe authored PBR properties without turning all fabrics, hair and skin
 * into the same fake shiny material.
 */
export const SURFACE_TEXTURE_FIELDS = [
  "map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap",
  "alphaMap", "bumpMap", "displacementMap", "lightMap", "clearcoatMap",
  "clearcoatNormalMap", "clearcoatRoughnessMap", "sheenColorMap",
  "sheenRoughnessMap", "iridescenceMap", "transmissionMap", "thicknessMap",
  "specularColorMap", "specularIntensityMap", "anisotropyMap",
] as const;

export type SurfaceQualityReport = {
  triangleCount: number;
  textureCount: number;
  knownResolutionCount: number;
  lowResolutionCount: number;
  pbrMaterialCount: number;
  normalMappedMaterialCount: number;
  enhancedTextureCount: number;
};

function getTextures(material: Material): Texture[] {
  const fields = material as unknown as Record<string, unknown>;
  return SURFACE_TEXTURE_FIELDS.flatMap((key) => {
    const value = fields[key] as Texture | null | undefined;
    return value?.isTexture ? [value] : [];
  });
}

function collectSurface(root: Object3D) {
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  let triangleCount = 0;
  root.traverse((item) => {
    const mesh = item as Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    // Draw mode is triangular for the built-in GLBs. Count is informative,
    // not a claim of unique polygons or an objective quality ranking.
    if (geometry) {
      const vertices = geometry.index?.count ?? geometry.attributes["position"]?.count ?? 0;
      if (Number.isFinite(vertices) && vertices > 0) triangleCount += Math.floor(vertices / 3);
    }
    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of meshMaterials) {
      if (!material || materials.has(material)) continue;
      materials.add(material);
      for (const texture of getTextures(material)) textures.add(texture);
    }
  });
  return { materials, textures, triangleCount };
}

/** Preserve each authored roughness, metallic, normal strength and color. */
export function enhanceSurfaceSampling(root: Object3D, gpuMaximumAnisotropy: number) {
  const { textures } = collectSurface(root);
  const cap = Number.isFinite(gpuMaximumAnisotropy)
    ? Math.max(1, Math.min(8, Math.floor(gpuMaximumAnisotropy))) : 1;
  let enhanced = 0;
  for (const texture of textures) {
    // Pixel-art/exact-nearest assets must not be silently changed.
    if (texture.magFilter === NearestFilter ||
        texture.minFilter === NearestFilter ||
        texture.minFilter === NearestMipmapNearestFilter ||
        texture.minFilter === NearestMipmapLinearFilter) continue;
    if (texture.anisotropy < cap) {
      texture.anisotropy = cap;
      texture.needsUpdate = true;
      enhanced++;
    }
  }
  return enhanced;
}

export function inspectSurfaceQuality(root: Object3D): SurfaceQualityReport {
  const { materials, textures, triangleCount } = collectSurface(root);
  let knownResolutionCount = 0;
  let lowResolutionCount = 0;
  for (const texture of textures) {
    const image = texture.image as { width?: number; height?: number } | undefined;
    if (!image || !Number.isFinite(image.width) || !Number.isFinite(image.height)) continue;
    const width = image.width ?? 0, height = image.height ?? 0;
    if (width <= 0 || height <= 0) continue;
    knownResolutionCount++;
    if (Math.min(width, height) < 512) lowResolutionCount++;
  }
  let pbrMaterialCount = 0;
  let normalMappedMaterialCount = 0;
  for (const material of materials) {
    const typed = material as unknown as {
      isMeshStandardMaterial?: boolean; isMeshPhysicalMaterial?: boolean;
      normalMap?: Texture | null;
    };
    if (typed.isMeshStandardMaterial || typed.isMeshPhysicalMaterial) pbrMaterialCount++;
    if (typed.normalMap?.isTexture) normalMappedMaterialCount++;
  }
  return {
    triangleCount, textureCount: textures.size,
    knownResolutionCount, lowResolutionCount, pbrMaterialCount,
    normalMappedMaterialCount, enhancedTextureCount: 0,
  };
}

/** Report caveats without conflating an untextured stylized model with a broken one. */
export function describeSurfaceLimitations(report: SurfaceQualityReport): string[] {
  const notes: string[] = [];
  if (report.textureCount === 0) notes.push("لا توجد خرائط خامات مكتشفة؛ تحقق من الشعر والجلد والملابس بصريًا.");
  if (report.textureCount > 0 && report.knownResolutionCount === 0)
    notes.push("تعذر تحديد دقة ملفات النسيج، فلا يمكن اعتماد مستوى التفاصيل من البيانات وحدها.");
  if (report.lowResolutionCount > 0)
    notes.push(`توجد ${report.lowResolutionCount} خريطة نسيج يقل أحد أبعادها عن 512 بكسل؛ افحص وضوحها عن قرب.`);
  if (report.pbrMaterialCount === 0)
    notes.push("لم تُكتشف خامات PBR قياسية؛ قد يختلف انعكاس الضوء عن الإضاءة السينمائية.");
  return notes;
}
