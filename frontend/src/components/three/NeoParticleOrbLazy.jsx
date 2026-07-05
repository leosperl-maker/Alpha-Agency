import { lazy, Suspense, useMemo } from "react";

/**
 * Chargement paresseux + garde-fous perf du halo de particules de Néo :
 * - respect de prefers-reduced-motion (accessibilité)
 * - machines faibles (< 4 cœurs) → pas de three.js du tout
 * - le bundle three ne part que si on rend vraiment le composant
 * En cas d'exclusion, l'orbe CSS existante reste seule (fallback intact).
 */
const NeoParticleOrb = lazy(() => import("./NeoParticleOrb"));

const canRunParticles = () => {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  } catch (e) { /* matchMedia indisponible : on tente */ }
  const cores = navigator.hardwareConcurrency || 0;
  return cores >= 4;
};

const NeoParticleOrbLazy = (props) => {
  const enabled = useMemo(canRunParticles, []);
  if (!enabled) return null;
  return (
    <Suspense fallback={null}>
      <NeoParticleOrb {...props} />
    </Suspense>
  );
};

export default NeoParticleOrbLazy;
