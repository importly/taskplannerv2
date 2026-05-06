import { useEffect, useRef, useState, memo } from "react";

// ── Swap this one line to change the roll feel ──────────────────────────────
// "spring"    300ms cubic-bezier(0.22, 1, 0.36, 1)      — current, smooth decel
// "snappy"    180ms cubic-bezier(0.4, 0, 0.2, 1)        — fast material snap
// "bounce"    380ms cubic-bezier(0.34, 1.45, 0.64, 1)   — slight overshoot
// "mechanical" 140ms cubic-bezier(0.65, 0, 0.35, 1)     — crisp slot-machine click
// "floaty"    500ms cubic-bezier(0.16, 1, 0.3, 1)        — slow dramatic entry
const ROLL_EASING = "380ms cubic-bezier(0.34, 1.45, 0.64, 1)";
// ────────────────────────────────────────────────────────────────────────────

const RollingChar = memo(({ char, direction }: { char: string; direction?: number }) => {
  const [state, setState] = useState({ current: char, prev: null as string | null, dir: 0 });
  const timerRef = useRef<number | undefined>(undefined);
  const dirRef = useRef<number | undefined>(direction);
  dirRef.current = direction;

  useEffect(() => {
    if (char !== state.current) {
      clearTimeout(timerRef.current);
      setState(s => ({
        current: char,
        prev: s.current,
        dir: dirRef.current ?? (char < s.current ? -1 : 1),
      }));
      timerRef.current = window.setTimeout(() => {
        setState(s => ({ ...s, prev: null }));
      }, 320);
    }
    return () => clearTimeout(timerRef.current);
  }, [char]);

  // Static chars render as fixed-height cells matching digit cells
  if (char === ":" || char === "-" || char === " ") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          height: "1em",
          lineHeight: "1",
          verticalAlign: "middle",
        }}
      >
        {char}
      </span>
    );
  }

  const { current, prev, dir } = state;
  const isAnimating = prev !== null;

  return (
    // Container is exactly 1em tall with lineHeight:1 so overflow:hidden clips
    // animation travel without touching the resting glyph.
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: "0.62em",
        height: "1em",
        lineHeight: "1",
        overflow: "hidden",
        textAlign: "center",
        verticalAlign: "middle",
      }}
    >
      <span
        key={`c-${current}-${dir}`}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: isAnimating
            ? `roll-in-${dir < 0 ? "down" : "up"} ${ROLL_EASING} forwards`
            : undefined,
        }}
      >
        {current}
      </span>

      {isAnimating && (
        <span
          key={`p-${prev}-${dir}`}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: `roll-out-${dir < 0 ? "down" : "up"} ${ROLL_EASING} forwards`,
          }}
        >
          {prev}
        </span>
      )}
    </span>
  );
});

RollingChar.displayName = "RollingChar";

export function RollingDigits({
  value,
  className,
  style,
  direction,
}: {
  value: string;
  className?: string;
  style?: React.CSSProperties;
  direction?: number;
}) {
  return (
    // lineHeight:1 prevents parent lineHeight from leaking into em-based sizing
    <span className={className} style={{ ...style, display: "inline-flex", alignItems: "center", lineHeight: "1" }}>
      {value.split("").map((char, i) => (
        <RollingChar key={i} char={char} direction={direction} />
      ))}
    </span>
  );
}
