type Props = { affected: "left" | "right" | null; size?: number };

// Forward-facing person. "left" affected = viewer's right side highlighted (mirror)? 
// We highlight the side as the recipient's own body side: left side of body = our right when looking at them.
export function BodyIcon({ affected, size = 140 }: Props) {
  const accent = "#EA580C";
  const grey = "#D1D5DB";
  // affected = "left" means LEFT side of recipient's body, which appears on the VIEWER's right.
  const leftFill = affected === "left" ? accent : grey;
  const rightFill = affected === "right" ? accent : grey;
  const bodyFill = "#9CA3AF";
  return (
    <svg width={size} height={size} viewBox="0 0 100 120" aria-hidden="true">
      {/* head */}
      <circle cx="50" cy="18" r="12" fill={bodyFill} />
      {/* torso */}
      <rect x="36" y="32" width="28" height="40" rx="6" fill={bodyFill} />
      {/* viewer-left arm (recipient's right) */}
      <rect x="22" y="34" width="10" height="36" rx="5" fill={rightFill} />
      {/* viewer-right arm (recipient's left) */}
      <rect x="68" y="34" width="10" height="36" rx="5" fill={leftFill} />
      {/* viewer-left leg */}
      <rect x="38" y="74" width="10" height="38" rx="5" fill={rightFill} />
      {/* viewer-right leg */}
      <rect x="52" y="74" width="10" height="38" rx="5" fill={leftFill} />
    </svg>
  );
}
