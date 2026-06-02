import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * RotatingWord — un mot qui change à intervalle régulier (fondu + léger glissement).
 * Pas de masque (donc jamais coupé ni chevauchant la ligne voisine), et hauteur
 * réservée pour éviter tout saut de mise en page. Respecte prefers-reduced-motion.
 */
const RotatingWord = ({ words, interval = 2400, className = "", style }) => {
  const [index, setIndex] = useState(0);
  const rm = useReducedMotion();

  useEffect(() => {
    if (rm) return undefined;
    const id = setInterval(() => setIndex((p) => (p + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval, rm]);

  return (
    <span className="block leading-[1.15]" style={{ minHeight: "1.15em" }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          className={`block leading-[1.15] ${className}`}
          style={style}
          initial={{ opacity: 0, y: rm ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: rm ? 0 : -12 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default RotatingWord;
