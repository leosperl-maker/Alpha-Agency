import { useEffect, useRef, useState } from "react";

/**
 * CustomCursor — anneau qui suit le curseur et grossit au survol des éléments
 * interactifs (façon Awwwards / motionsites.ai). En mix-blend-difference pour
 * rester visible sur fond clair comme sombre.
 * Affiché uniquement sur appareil à pointeur fin (desktop) et hors reduced-motion.
 * Ne masque le curseur natif que lorsqu'il est actif (no-JS = curseur normal).
 */
const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduce) return;
    setEnabled(true);
    document.body.classList.add("custom-cursor-active");

    const ring = ringRef.current;
    const dot = dotRef.current;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let rafId;

    const onMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (dot) dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    };

    const isInteractive = (el) =>
      el && el.closest("a, button, [role=button], input, textarea, select, [data-cursor]");
    const onOver = (e) => ring && ring.classList.toggle("cursor-ring--hover", !!isInteractive(e.target));

    const loop = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      if (ring) ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(rafId);
      document.body.classList.remove("custom-cursor-active");
    };
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="cursor-layer">
      <div ref={ringRef} className="cursor-ring" />
      <div ref={dotRef} className="cursor-dot" />
    </div>
  );
};

export default CustomCursor;
