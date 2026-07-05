import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Halo de particules audio-réactif autour de l'orbe de Néo (mode vocal).
 * Implémentation originale (aucun code tiers) : sphère de points en
 * BufferGeometry + blending additif, pilotée par la phase (idle / listening /
 * thinking / speaking / error) et par l'analyseur audio du TTS quand Néo parle.
 *
 * Mapping audio : basses (bins 0-7) → expansion du rayon (kick),
 * médiums (bins 8-23) → respiration/turbulence des particules.
 * Chargé en lazy et UNIQUEMENT si la machine le permet (voir NeoParticleOrbLazy).
 */

const COUNT = 1500;

// Cibles visuelles par phase : rayon (relatif), turbulence, vitesse de rotation,
// opacité, taille des points, couleur.
const PHASE_TARGETS = {
  idle: { r: 1.0, spread: 0.05, rot: 0.1, opacity: 0.4, size: 0.02, color: new THREE.Color("#ff4257") },
  listening: { r: 0.88, spread: 0.09, rot: 0.22, opacity: 0.65, size: 0.024, color: new THREE.Color("#ff5a6b") },
  thinking: { r: 0.74, spread: 0.16, rot: 0.9, opacity: 0.9, size: 0.026, color: new THREE.Color("#ff93a2") },
  speaking: { r: 0.92, spread: 0.11, rot: 0.35, opacity: 0.85, size: 0.028, color: new THREE.Color("#ff2e48") },
  error: { r: 1.05, spread: 0.03, rot: 0.05, opacity: 0.25, size: 0.018, color: new THREE.Color("#8a2733") },
};

function ParticleShell({ phaseRef, analyserRef }) {
  const pointsRef = useRef(null);
  const matRef = useRef(null);
  // État courant lissé (lerp vers la cible de la phase → transitions douces)
  const currentRef = useRef({ r: 1, spread: 0.05, rot: 0.1, opacity: 0.4, size: 0.02, color: new THREE.Color("#ff4257") });

  // Directions unitaires + phase temporelle propre à chaque particule (fixes)
  const { dirs, phases, positions, freqBuf } = useMemo(() => {
    const dirs = new Float32Array(COUNT * 3);
    const phases = new Float32Array(COUNT);
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // distribution sphérique uniforme + légère épaisseur de coquille
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const shell = 0.92 + Math.random() * 0.16;
      dirs[i * 3] = s * Math.cos(t) * shell;
      dirs[i * 3 + 1] = u * shell;
      dirs[i * 3 + 2] = s * Math.sin(t) * shell;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { dirs, phases, positions, freqBuf: new Uint8Array(64) };
  }, []);

  useFrame((state, dt) => {
    const pts = pointsRef.current;
    const mat = matRef.current;
    if (!pts || !mat) return;
    const cur = currentRef.current;
    const target = PHASE_TARGETS[phaseRef.current] || PHASE_TARGETS.idle;

    // Audio (dispo seulement quand Néo parle : l'analyseur est branché sur le TTS)
    let bass = 0, mids = 0;
    const analyser = analyserRef?.current;
    if (analyser) {
      try {
        analyser.getByteFrequencyData(freqBuf);
        let b = 0, m = 0;
        for (let i = 0; i < 8; i++) b += freqBuf[i];
        for (let i = 8; i < 24; i++) m += freqBuf[i];
        bass = Math.min(1, b / 8 / 200);
        mids = Math.min(1, m / 16 / 180);
      } catch (e) { /* analyseur fermé : silencieux */ }
    }

    // Lissage vers la cible (indépendant du framerate)
    const k = 1 - Math.exp(-dt * 4);
    cur.r += (target.r - cur.r) * k;
    cur.spread += (target.spread - cur.spread) * k;
    cur.rot += (target.rot - cur.rot) * k;
    cur.opacity += (target.opacity - cur.opacity) * k;
    cur.size += (target.size - cur.size) * k;
    cur.color.lerp(target.color, k);

    const time = state.clock.elapsedTime;
    const radius = cur.r * (1 + bass * 0.32);       // kick des basses → expansion
    const spread = cur.spread * (1 + mids * 1.6);   // médiums → turbulence

    for (let i = 0; i < COUNT; i++) {
      const wob = 1 + Math.sin(time * 1.7 + phases[i]) * spread;
      const rr = radius * wob;
      positions[i * 3] = dirs[i * 3] * rr;
      positions[i * 3 + 1] = dirs[i * 3 + 1] * rr;
      positions[i * 3 + 2] = dirs[i * 3 + 2] * rr;
    }
    pts.geometry.attributes.position.needsUpdate = true;
    pts.rotation.y += dt * cur.rot;
    pts.rotation.x = Math.sin(time * 0.12) * 0.18;

    mat.opacity = Math.min(1, cur.opacity + bass * 0.25);
    mat.size = cur.size * (1 + bass * 0.5);
    mat.color.copy(cur.color);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#ff4257"
      />
    </points>
  );
}

const NeoParticleOrb = ({ phaseRef, analyserRef, size = 420 }) => (
  <div
    style={{ width: size, height: size }}
    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    aria-hidden="true"
  >
    <Canvas
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 2.6], fov: 45 }}
    >
      <ParticleShell phaseRef={phaseRef} analyserRef={analyserRef} />
    </Canvas>
  </div>
);

export default NeoParticleOrb;
