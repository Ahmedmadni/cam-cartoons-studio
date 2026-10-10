import { FrontSide } from "three";
import type { Material, Mesh, MeshStandardMaterial, Object3D } from "three";

/**
 * Apply only to the verified, commit-pinned PrivacyPuppet / MakeHuman assets
 * and their CI fixtures. Never rewrite arbitrary user-uploaded characters.
 */
export function isPinnedMpfbModel(sourceUrl?: string | null): boolean {
  if (!sourceUrl) return false;
  return /^https:\/\/raw\.githubusercontent\.com\/privacypuppet\/privacypuppet\/ff1b635eba22d782423a6d81233e8deca7f6d1bd\/public\/mpfb_models\/(?:kofi-v2|yuki-v2|liam-v2)\.glb$/.test(sourceUrl) ||
    /^\/__qa__\/candidates\/curated-mpfb-(?:kofi|yuki|liam)\.glb$/.test(sourceUrl);
}

export type MpfbSurfaceFixReport = {
  /** A low-poly eye/face overlay was hidden only when a matching high-poly layer exists. */
  hiddenLowPolyOverlays: number;
  /** Localized polygon offsets for overlapping MakeHuman face/body material. */
  correctedFaceMaterials: number;
  /** Conservative alpha cutoffs on originally transparent brows/hair/lashes. */
  correctedHairMaterials: number;
  /** Number of new material instances to avoid mutating cached GLB assets. */
  clonedMaterials: number;
};

export const EMPTY_MPFB_SURFACE_FIX_REPORT: MpfbSurfaceFixReport = {
  hiddenLowPolyOverlays: 0,
  correctedFaceMaterials: 0,
  correctedHairMaterials: 0,
  clonedMaterials: 0,
};

const compact = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const isLowPoly = (name: string) => compact(name).includes("lowpoly");
const isHighPoly = (name: string) => compact(name).includes("highpoly");
const isTransparentHair = (name: string) => /hair|ponytail|eyebrow|eyelash|\blash|short0|fringe|bang/i.test(name);

/**
 * Preserve real texture maps, texture colors, roughness and normal strengths:
 * this repairs existing depth/alpha presentation rather than inventing PBR.
 *
 * Root must be a SkeletonUtils clone, because mesh.visibility changes are
 * instance-specific. Changed materials are cloned before touching PBR fields.
 */
export function applyMpfbSurfaceFixes(root: Object3D, sourceUrl: string, enabled: boolean): MpfbSurfaceFixReport {
  const report = { ...EMPTY_MPFB_SURFACE_FIX_REPORT };
  if (!enabled || !isPinnedMpfbModel(sourceUrl)) return report;

  const meshes: Mesh[] = [];
  root.traverse((part) => {
    if ((part as Mesh).isMesh) meshes.push(part as Mesh);
  });

  // The upstream MPFB implementation identifies a second low-poly overlay
  // which z-fights with the higher-quality eye/face overlay. Do not remove
  // anything unless BOTH surfaces are actually present.
  const hasHighPolyOverlay = meshes.some((mesh) => isHighPoly(mesh.name));
  const seenFixes = new WeakMap<Material, Material>();

  for (const mesh of meshes) {
    if (isLowPoly(mesh.name) && hasHighPolyOverlay) {
      if (mesh.visible) {
        mesh.visible = false;
        report.hiddenLowPolyOverlays++;
      }
      continue;
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const refined = materials.map((original) => {
      if (!original || !(original as MeshStandardMaterial).isMeshStandardMaterial) return original;
      const pbr = original as MeshStandardMaterial;
      const tag = mesh.name + " " + pbr.name;
      const faceOverlay = isHighPoly(mesh.name) && Boolean(pbr.map);
      const transparentHair = isTransparentHair(tag) && pbr.transparent && Boolean(pbr.map);
      if (!faceOverlay && !transparentHair) return original;

      // No mutation of source useGLTF cache; preserve shared-instance semantics
      // when one source material is reused by multiple surfaces.
      let updated = seenFixes.get(original) as MeshStandardMaterial | undefined;
      if (!updated) {
        updated = pbr.clone();
        seenFixes.set(original, updated);
        report.clonedMaterials++;
      }
      if (faceOverlay) {
        updated.transparent = true;
        updated.alphaTest = Math.max(updated.alphaTest, 0.42);
        updated.depthWrite = true;
        updated.side = FrontSide;
        updated.polygonOffset = true;
        updated.polygonOffsetFactor = -1;
        updated.polygonOffsetUnits = -1;
        report.correctedFaceMaterials++;
      } else if (transparentHair) {
        const threshold = /brow|lash/i.test(tag) ? 0.22 : 0.12;
        updated.alphaTest = Math.max(updated.alphaTest, threshold);
        updated.depthWrite = true;
        report.correctedHairMaterials++;
      }
      updated.needsUpdate = true;
      return updated;
    });
    if (refined.some((item, index) => item !== materials[index])) {
      mesh.material = Array.isArray(mesh.material) ? refined : refined[0]!;
    }
  }
  return report;
}
