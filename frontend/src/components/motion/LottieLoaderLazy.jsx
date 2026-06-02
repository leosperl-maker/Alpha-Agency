import { Suspense, lazy } from "react";

// lottie-web étant lourd (~80 Ko), on le sort du bundle initial :
// le composant Lottie n'est téléchargé qu'à l'affichage (chunk séparé).
const LottieLoader = lazy(() => import("./LottieLoader"));

const LottieLoaderLazy = ({ size = 48, loop = true, className = "" }) => (
  <Suspense fallback={<div style={{ width: size, height: size }} className={className} aria-hidden="true" />}>
    <LottieLoader size={size} loop={loop} className={className} />
  </Suspense>
);

export default LottieLoaderLazy;
