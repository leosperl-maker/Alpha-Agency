import { MeshGradient } from "@paper-design/shaders-react";

/**
 * ShaderBackground — fond animé "aurora" (WebGL) via paper-design/shaders-react.
 * Deux couches MeshGradient superposées pour un rendu fluide et profond.
 * Respecte prefers-reduced-motion (vitesse 0 = image fixe mais toujours belle).
 */
const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ShaderBackground = ({ children, className = "" }) => {
  const s1 = prefersReduced ? 0 : 0.35;
  const s2 = prefersReduced ? 0 : 0.22;

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Filtre "verre" pour les éléments en superposition (badges) */}
      <svg className="absolute inset-0 w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
          </filter>
        </defs>
      </svg>

      {/* Couches de dégradé animé aux couleurs de la marque */}
      <MeshGradient
        className="absolute inset-0 w-full h-full"
        colors={["#05010A", "#CE0202", "#7A1FA2", "#FF3D6E", "#120016"]}
        speed={s1}
        backgroundColor="#05010A"
      />
      <MeshGradient
        className="absolute inset-0 w-full h-full opacity-50"
        colors={["#05010A", "#E0114A", "#3A0CA3", "#05010A"]}
        speed={s2}
        wireframe
        backgroundColor="transparent"
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default ShaderBackground;
