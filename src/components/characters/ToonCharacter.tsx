import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";

import { getAvatarProfile } from "@/lib/avatarCatalog";
import { faceState } from "@/lib/faceState";
import type { AvatarDiagnostics } from "@/lib/modelPresentation";
import type { AnimationType } from "@/lib/store";

export type ToonPalette = {
  body: string;
  limbs: string;
  head: string;
  accent: string;
  /** "round" chunky kid, "tall" slim figure, "blob" bean shape. */
  shape: "round" | "tall" | "blob";
};

export const TOON_HEIGHT = 1.9;

/** Faceless stylized cartoon figure — no eyes or mouth; expression is told through pose. */
export default function ToonCharacter({
  id,
  palette,
  animation,
  spin,
  onDiagnostics,
}: {
  id: string;
  palette: ToonPalette;
  animation: AnimationType;
  spin: boolean;
  onDiagnostics?: ((details: AvatarDiagnostics) => void) | undefined;
}) {
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const torso = useRef<Group>(null);

  useEffect(() => {
    onDiagnostics?.({
      status: "ready",
      modelUrl: "toon:" + id,
      dimensions: { width: 1.1, height: TOON_HEIGHT, depth: 0.7 },
      normalizedScale: 1,
      headHeightRatio: 0.82,
    });
  }, [id, onDiagnostics]);

  const s = palette.shape;
  const bodyW = s === "round" ? 0.42 : s === "blob" ? 0.5 : 0.3;
  const bodyH = s === "tall" ? 0.62 : s === "blob" ? 0.5 : 0.42;
  const headR = s === "round" ? 0.36 : s === "blob" ? 0.0 : 0.27;
  const legH = s === "tall" ? 0.55 : 0.42;
  const hip = legH + 0.08;
  const shoulder = hip + bodyH + bodyW * 0.6;

  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime();
    const r = root.current, h = head.current, l = armL.current, rr = armR.current, b = torso.current;
    if (!r || !h || !l || !rr || !b) return;
    let y = Math.sin(t * 2) * 0.015, rotY = 0, lean = 0;
    let aL = 0.18, aR = -0.18, aLx = 0, aRx = 0, hx = 0, hz = 0;
    switch (animation) {
      case "jump": y = Math.abs(Math.sin(t * 5)) * 0.45; aL = 2.6; aR = -2.6; break;
      case "wave": case "bye": aR = -2.6 + Math.sin(t * 9) * 0.45; hz = 0.12; break;
      case "spin": rotY = t * 4; aL = 1.2; aR = -1.2; break;
      case "clap": aLx = -1.3; aRx = -1.3; aL = -0.35 + Math.sin(t * 12) * 0.25; aR = 0.35 - Math.sin(t * 12) * 0.25; break;
      case "sad": hx = 0.55; lean = 0.18; aL = 0.05; aR = -0.05; y = -0.04; break;
      case "happy": y = Math.abs(Math.sin(t * 6)) * 0.15; aL = 2.2 + Math.sin(t * 6) * 0.3; aR = -2.2 - Math.sin(t * 6) * 0.3; hx = -0.2; break;
      case "nod": hx = Math.sin(t * 7) * 0.35; break;
      case "dance": rotY = Math.sin(t * 3) * 0.6; y = Math.abs(Math.sin(t * 6)) * 0.12; aL = 1.4 + Math.sin(t * 6) * 0.8; aR = -1.4 + Math.sin(t * 6) * 0.8; hz = Math.sin(t * 6) * 0.2; break;
      case "think": aRx = -2.2; aR = 0.5; hz = 0.25; hx = 0.1; break;
      default: if (spin) rotY = Math.sin(t * 0.5) * 0.35;
    }
    // Faceless "talking": gentle head bob driven by speech energy.
    const talk = faceState.mouthOpen > 0.06 ? faceState.mouthOpen : 0;
    hx += -talk * 0.12; y += talk * 0.02;
    const k = 10;
    const damp = (a: number, target: number) => a + (target - a) * Math.min(1, dt * k);
    r.position.y = damp(r.position.y, y);
    r.rotation.y = animation === "spin" ? rotY : damp(r.rotation.y, rotY);
    b.rotation.x = damp(b.rotation.x, lean);
    h.rotation.x = damp(h.rotation.x, hx);
    h.rotation.z = damp(h.rotation.z, hz);
    l.rotation.z = damp(l.rotation.z, aL);
    rr.rotation.z = damp(rr.rotation.z, aR);
    l.rotation.x = damp(l.rotation.x, aLx);
    rr.rotation.x = damp(rr.rotation.x, aRx);
  });

  const mat = (color: string, rough = 0.45) => (
    <meshPhysicalMaterial color={color} roughness={rough} clearcoat={0.6} clearcoatRoughness={0.25} />
  );
  const armLen = s === "tall" ? 0.62 : 0.5;
  const groundOffset = getAvatarProfile(id).rpmYOffset;

  return (
    <group position={[0, groundOffset, 0]}>
      <group ref={root}>
      {/* legs */}
      {[-1, 1].map((side) => (
        <mesh key={side} castShadow position={[side * bodyW * 0.45, legH / 2 + 0.06, 0]}>
          <capsuleGeometry args={[0.1, legH - 0.1, 8, 16]} />
          {mat(palette.limbs)}
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={"f" + side} castShadow position={[side * bodyW * 0.45, 0.06, 0.06]} scale={[1, 0.6, 1.4]}>
          <sphereGeometry args={[0.12, 20, 16]} />
          {mat(palette.accent, 0.35)}
        </mesh>
      ))}
      <group ref={torso} position={[0, hip, 0]}>
        <mesh castShadow position={[0, bodyH / 2 + bodyW * 0.3, 0]}>
          <capsuleGeometry args={[bodyW, bodyH, 12, 24]} />
          {mat(palette.body)}
        </mesh>
        {/* belt/accent stripe */}
        <mesh position={[0, bodyW * 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[bodyW * 1.0, 0.035, 10, 40]} />
          {mat(palette.accent, 0.3)}
        </mesh>
        {/* arms */}
        {([[-1, armL], [1, armR]] as const).map(([side, ref]) => (
          <group key={side} ref={ref} position={[side * (bodyW + 0.06), shoulder - hip - 0.05, 0]}>
            <mesh castShadow position={[0, -armLen / 2, 0]}>
              <capsuleGeometry args={[0.085, armLen - 0.1, 8, 16]} />
              {mat(palette.limbs)}
            </mesh>
            <mesh castShadow position={[0, -armLen + 0.02, 0]}>
              <sphereGeometry args={[0.1, 20, 16]} />
              {mat(palette.head)}
            </mesh>
          </group>
        ))}
        {/* head — smooth and featureless */}
        <group ref={head} position={[0, shoulder - hip + 0.06, 0]}>
          {headR > 0 ? (
            <mesh castShadow position={[0, headR, 0]} scale={[1, 1.06, 0.96]}>
              <sphereGeometry args={[headR, 48, 32]} />
              {mat(palette.head, 0.35)}
            </mesh>
          ) : (
            <mesh castShadow position={[0, 0.02, 0]}>
              <sphereGeometry args={[0.16, 32, 24]} />
              {mat(palette.accent, 0.35)}
            </mesh>
          )}
        </group>
      </group>
    </group>
    </group>
  );
}
