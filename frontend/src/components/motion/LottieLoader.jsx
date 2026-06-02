import Lottie from "lottie-react";
import animationData from "../../assets/lottie/loader.json";

/**
 * LottieLoader — animation vectorielle de marque (anneau rotatif rouge), via lottie-web.
 * Réutilisable comme loader (fallback de chargement) ou accent animé.
 * Léger : un seul calque vectoriel, boucle en continu.
 *
 * Props :
 *  - size  : taille en px (défaut 48)
 *  - loop  : boucle (défaut true)
 */
const LottieLoader = ({ size = 48, loop = true, className = "", decorative = true }) => (
  <div
    className={className}
    style={{ width: size, height: size }}
    aria-hidden={decorative ? "true" : undefined}
    role={decorative ? undefined : "status"}
    aria-label={decorative ? undefined : "Chargement"}
  >
    <Lottie animationData={animationData} loop={loop} autoplay />
  </div>
);

export default LottieLoader;
