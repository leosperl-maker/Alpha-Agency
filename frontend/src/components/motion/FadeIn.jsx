import { motion, useReducedMotion } from "framer-motion";

/**
 * FadeIn — apparition douce (fade + translate) au scroll, réutilisable, basée sur framer-motion.
 * Respecte automatiquement prefers-reduced-motion (pas de translation si réduit).
 *
 * Props :
 *  - as       : composant motion à rendre (défaut motion.div)
 *  - y        : décalage initial en px (défaut 28)
 *  - delay    : délai en s (défaut 0)
 *  - duration : durée en s (défaut 0.6)
 *  - once     : ne jouer qu'une fois (défaut true)
 */
const FadeIn = ({
  children,
  as: Component = motion.div,
  y = 28,
  delay = 0,
  duration = 0.6,
  once = true,
  className = "",
  ...rest
}) => {
  const rm = useReducedMotion();
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: rm ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default FadeIn;
