import { Box3, type Object3D, type SkinnedMesh } from "three";

/** Skinned vertex bounds require current bone matrices before the first render. */
export function measureAvatarBounds(avatar: Object3D): Box3 {
  avatar.updateMatrixWorld(true);
  avatar.traverse(object => {
    const mesh = object as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.skeleton.update();
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  });
  return new Box3().setFromObject(avatar);
}