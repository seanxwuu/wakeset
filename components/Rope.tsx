// The WakeSet rope: a pair of battle ropes. Still, it is two gentle curves.
// With `thinking`, waves run down both ropes from the hands toward the anchor,
// one rope half a beat behind the other, to show that something is being worked on.
const W = 120;
const H = 44;
const STEPS = 30;
const FRAMES = 12;

/** One rope at one moment: a wave that is tall at the hands (left) and dies out at the anchor (right). */
function rope(phase: number, mid: number): string {
  let d = "";
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const x = 6 + t * (W - 12);
    // Height of the wave here: it builds over the first stretch from the hands, then fades toward the anchor.
    const tall = 11 * Math.pow(1 - t, 0.9) * Math.min(1, t * 5);
    const y = mid + tall * Math.sin(t * Math.PI * 2.6 - phase) + (H / 2 - mid) * t;
    d += `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}
/** The same rope through one full cycle, as the list of shapes the animation moves between. */
const cycle = (offset: number, mid: number) => Array.from({ length: FRAMES + 1 }, (_, f) => rope((f / FRAMES) * Math.PI * 2 + offset, mid)).join(";");

const ROPES = [
  { still: rope(0.6, H / 2 - 9), moving: cycle(0, H / 2 - 9) },
  { still: rope(0.6 + Math.PI, H / 2 + 9), moving: cycle(Math.PI, H / 2 + 9) },
];

export default function Rope({ thinking = false, className = "", title }: { thinking?: boolean; className?: string; title?: string }) {
  return (
    <svg className={`rope ${thinking ? "thinking" : ""} ${className}`} viewBox={`0 0 ${W} ${H}`} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {ROPES.map((r, i) => (
        <g key={i}>
          {/* The rope, then its twist: short darker strands laid along the same line. */}
          {["strand", "twist"].map((part) => (
            <path key={part} className={part} d={r.still}>
              {thinking && <animate attributeName="d" dur="1.15s" repeatCount="indefinite" values={r.moving} />}
            </path>
          ))}
        </g>
      ))}
      <circle className="anchor" cx={W - 6} cy={H / 2} r="3.4" />
    </svg>
  );
}

/** A line of text with the moving ropes, for anything that is loading or being thought about. */
export function Thinking({ children = "Working…" }: { children?: React.ReactNode }) {
  return <span className="thinking-line" role="status"><Rope thinking />{children}</span>;
}
