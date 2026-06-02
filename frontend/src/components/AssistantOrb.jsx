/**
 * Visual identity of the Alpha CRM assistant — a glossy brand orb.
 * Replaces the generic "sparkle" icon. Pure CSS, respects reduced-motion.
 */
const AssistantOrb = ({ size = 24, pulse = false, className = "" }) => (
  <span
    className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    {pulse && (
      <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping motion-reduce:hidden" />
    )}
    <span
      className="relative block rounded-full"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(120% 120% at 30% 25%, #FF7A8A 0%, #E11D2E 40%, #7A0F2B 78%, #2C0610 100%)",
        boxShadow:
          "inset 0 1.5px 2px rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05)",
      }}
    />
  </span>
);

export default AssistantOrb;
