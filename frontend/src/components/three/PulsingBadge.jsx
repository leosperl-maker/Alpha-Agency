import { PulsingBorder } from "@paper-design/shaders-react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * PulsingBadge — pastille animée (shader PulsingBorder) avec texte tournant autour.
 * Accent décoratif "signature" pour le hero. Décoratif → aria-hidden.
 */
const PulsingBadge = ({ label = "ALPHA AGENCY • GUADELOUPE • " }) => {
  const rm = useReducedMotion();
  return (
    <div className="relative w-20 h-20 flex items-center justify-center" aria-hidden="true">
      <PulsingBorder
        colors={["#CE0202", "#FF3D6E", "#7A1FA2", "#E0114A", "#FFFFFF"]}
        colorBack="#00000000"
        speed={rm ? 0 : 1.4}
        roundness={1}
        thickness={0.1}
        softness={0.2}
        intensity={5}
        spotsPerColor={5}
        spotSize={0.1}
        pulse={0.1}
        smoke={0.5}
        smokeSize={4}
        scale={0.65}
        style={{ width: "60px", height: "60px", borderRadius: "50%" }}
      />
      <motion.svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        animate={rm ? {} : { rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ transform: "scale(1.55)" }}
      >
        <defs>
          <path id="badge-circle" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
        </defs>
        <text className="fill-white/80" style={{ fontSize: "8px", letterSpacing: "1px" }}>
          <textPath href="#badge-circle" startOffset="0%">
            {label}
          </textPath>
        </text>
      </motion.svg>
    </div>
  );
};

export default PulsingBadge;
