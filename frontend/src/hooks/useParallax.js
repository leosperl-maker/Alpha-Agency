import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * useParallax — déplace un élément verticalement au scroll (effet de profondeur).
 * Branché en scrub sur la traversée d'un conteneur déclencheur.
 * Respecte prefers-reduced-motion et nettoie le ScrollTrigger au démontage.
 *
 * @param {React.RefObject} ref       élément à animer
 * @param {Object}  options
 * @param {number}  options.distance  déplacement total en px (négatif = vers le haut)
 * @param {React.RefObject} options.trigger conteneur déclencheur (défaut : l'élément lui-même)
 */
export function useParallax(ref, { distance = -80, trigger } = {}) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        y: distance,
        ease: "none",
        scrollTrigger: {
          trigger: trigger?.current || el,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    return () => ctx.revert();
  }, [ref, distance, trigger]);
}

export default useParallax;
