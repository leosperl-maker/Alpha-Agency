import { Suspense, lazy, useEffect, useState } from "react";

// La scène WebGL est chargée en dynamic import (chunk séparé, hors bundle initial).
const FluidHero = lazy(() => import("./FluidHero"));

/**
 * FluidHeroLazy — monte le fond WebGL interactif seulement si c'est sûr :
 *  - pas en prefers-reduced-motion (accessibilité),
 *  - seulement si le navigateur supporte WebGL.
 * Sinon ne rend rien (un fond CSS bordeaux reste affiché en dessous).
 */
const FluidHeroLazy = ({ className = "" }) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) {
      webgl = false;
    }
    if (!reduce && webgl) setEnabled(true);
  }, []);

  if (!enabled) return null;

  return (
    <div className={className} aria-hidden="true">
      <Suspense fallback={null}>
        <FluidHero />
      </Suspense>
    </div>
  );
};

export default FluidHeroLazy;
