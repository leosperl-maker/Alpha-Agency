import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

/**
 * HeroOrbs — halos lumineux bordeaux qui flottent ET réagissent au curseur (parallax).
 * Interactif mais 100% fiable : uniquement des transforms CSS (pas de WebGL).
 * - Le conteneur se décale doucement selon la position de la souris (parallax global).
 * - Chaque halo flotte indépendamment (boucle).
 * Désactivé en prefers-reduced-motion et sur écran tactile.
 */
const HeroOrbs = () => {
  const rm = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 45, damping: 20, mass: 0.6 });
  const y = useSpring(my, { stiffness: 45, damping: 20, mass: 0.6 });

  useEffect(() => {
    if (rm || !window.matchMedia("(pointer: fine)").matches) return undefined;
    const onMove = (e) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 48);
      my.set((e.clientY / window.innerHeight - 0.5) * 48);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [rm, mx, my]);

  const float = (dx, dy, d) =>
    rm ? {} : { x: [0, dx, 0], y: [0, dy, 0], transition: { duration: d, repeat: Infinity, ease: "easeInOut" } };

  return (
    <motion.div className="absolute inset-0 pointer-events-none" style={{ x, y }} aria-hidden="true">
      <motion.div
        className="absolute rounded-full blur-[130px]"
        style={{ width: "46rem", height: "46rem", top: "-14%", left: "-6%", background: "#5C0A1E", opacity: 0.6 }}
        animate={float(70, 50, 26)}
      />
      <motion.div
        className="absolute rounded-full blur-[130px]"
        style={{ width: "40rem", height: "40rem", bottom: "-18%", right: "-8%", background: "#7A0F22", opacity: 0.5 }}
        animate={float(-60, -40, 30)}
      />
      <motion.div
        className="absolute rounded-full blur-[100px]"
        style={{ width: "24rem", height: "24rem", top: "28%", left: "58%", background: "#3A0712", opacity: 0.6 }}
        animate={float(-40, 32, 22)}
      />
    </motion.div>
  );
};

export default HeroOrbs;
