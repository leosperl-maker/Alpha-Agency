import { useEffect } from "react";
import Lenis from "lenis";

/**
 * useSmoothScroll — défilement fluide à inertie (façon Awwwards / motionsites.ai).
 * Désactivé si l'utilisateur préfère le mouvement réduit (accessibilité).
 * Nettoie l'instance et la boucle rAF au démontage.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
}

export default useSmoothScroll;
