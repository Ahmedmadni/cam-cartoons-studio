import { expect, test } from "bun:test";
import { Bone, BoxGeometry, Float32BufferAttribute, Group, MeshBasicMaterial, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3 } from "three";
import { measureAvatarBounds } from "../src/lib/avatarBounds";

test("skin bounds use updated bone matrices before the first rendered frame", () => {
  const geometry = new BoxGeometry(1, 2, 1);
  const count = geometry.attributes.position.count;
  geometry.setAttribute("skinIndex", new Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  const weights = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute("skinWeight", new Float32BufferAttribute(weights, 4));
  const mesh = new SkinnedMesh(geometry, new MeshBasicMaterial());
  const bone = new Bone(); mesh.add(bone); mesh.bind(new Skeleton([bone]));
  const root = new Group(); root.add(mesh);
  root.scale.setScalar(0.01);
  bone.position.y = 1;
  const bounds = measureAvatarBounds(root);
  expect(bounds.getSize(new Vector3()).y).toBeCloseTo(0.02, 5);
  expect(bounds.getCenter(new Vector3()).y).toBeCloseTo(0.01, 5);
});