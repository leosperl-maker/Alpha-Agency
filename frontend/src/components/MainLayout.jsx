import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ChatWidget from "./ChatWidget";
import { useSmoothScroll } from "../hooks/useSmoothScroll";

const MainLayout = () => {
  const location = useLocation();
  const outlet = useOutlet();
  const rm = useReducedMotion();
  useSmoothScroll();

  // Transition de page douce entre les routes publiques.
  // useOutlet() fige le contenu de la route courante pour une sortie propre.
  const variants = rm
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };

  return (
    // Public site is a fixed dark design — pin dark tokens locally so it
    // never follows the admin's light/dark/OS preference.
    <div data-theme="dark" className="dark min-h-screen flex flex-col bg-[#0A0507]">
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
};

export default MainLayout;
