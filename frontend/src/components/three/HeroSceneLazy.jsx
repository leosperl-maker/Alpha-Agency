import { Suspense, lazy, useEffect, useState } from "react";

// La scène 3D (Three.js + R3F + drei) est chargée en dynamic import :
// elle sort ainsi du bundle initial et n'est téléchargée que si on l'affiche.
const HeroScene = lazy(() => import("./HeroScene"));

/**
 * HeroSceneLazy — monte la scène 3D uniquement quand c'est pertinent :
 *  - pas si l'utilisateur préfère le mouvement réduit (accessibilité)
 *  - pas sur petit écran / appareil peu puissant (perf mobile, ex. DROM-TOM)
 * Sinon ne rend rien (le reste du hero reste parfaitement lisible).
 */
const HeroSceneLazy = ({ className = "" }) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower =
      window.innerWidth < 1024 ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    if (!reduce && !lowPower) setEnabled(true);
  }, []);

  if (!enabled) return null;

  return (
    <div className={className} aria-hidden="true">
      <Suspense fallback={null}>
        <HeroScene />
      </Suspense>
    </div>
  );
};

export default HeroSceneLazy;
