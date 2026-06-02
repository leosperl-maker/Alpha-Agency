import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Reveal — apparition au scroll réutilisable (fade + translate) via GSAP ScrollTrigger.
 * Respecte prefers-reduced-motion et nettoie ScrollTrigger au démontage (pas de fuite mémoire).
 *
 * Props :
 *  - as        : balise/élément de rendu (défaut "div")
 *  - y         : décalage vertical initial en px (défaut 40)
 *  - duration  : durée en s (défaut 0.8)
 *  - delay     : délai en s (défaut 0)
 *  - start     : position de déclenchement ScrollTrigger (défaut "top 85%")
 *  - once      : ne jouer qu'une fois (défaut true)
 */
const Reveal = ({
  children,
  as: Tag = "div",
  y = 40,
  duration = 0.8,
  delay = 0,
  start = "top 85%",
  once = true,
  className = "",
  ...rest
}) => {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Accessibilité : pas d'animation si l'utilisateur préfère le mouvement réduit
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start,
            toggleActions: once ? "play none none none" : "play none none reverse",
          },
        }
      );
    }, el);

    return () => ctx.revert(); // nettoie l'animation + le ScrollTrigger associé
  }, [y, duration, delay, start, once]);

  return (
    <Tag ref={ref} className={className} style={{ opacity: 0 }} {...rest}>
      {children}
    </Tag>
  );
};

export default Reveal;
