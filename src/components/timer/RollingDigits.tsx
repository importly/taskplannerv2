import { useEffect, useRef, useState, memo } from "react";

/**
 * Individual character cell that rolls vertically when its value changes.
 * Non-digit chars (: - space) render static.
 */
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
        dir: dirRef.current ? dirRef.current : (char < s.current ? -1 : 1),
      }));
      timerRef.current = window.setTimeout(() => {
        setState(s => ({ ...s, prev: null }));
      }, 320);
    }
    return () => clearTimeout(timerRef.current);
  }, [char]);

  // Static characters — no animation
  if (char === ":" || char === "-" || char === " ") {
    return <span style={{ display: "inline-block" }}>{char}</span>;
  }

  const { current, prev, dir } = state;
  const isAnimating = prev !== null;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        width: "0.62em",
        height: "1.15em",
        textAlign: "center",
        verticalAlign: "top",
      }}
    >
      {/* Current digit — slides in */}
      <span
        key={`c-${current}-${dir}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          animation: isAnimating
            ? `roll-in-${dir < 0 ? "down" : "up"} 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards`
            : undefined,
        }}
      >
        {current}
      </span>

      {/* Previous digit — slides out */}
      {isAnimating && (
        <span
          key={`p-${prev}-${dir}`}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: `roll-out-${dir < 0 ? "down" : "up"} 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
          }}
        >
          {prev}
        </span>
      )}
    </span>
  );
});

RollingChar.displayName = "RollingChar";

/**
 * Renders a string where each character independently rolls when changed.
 * Used for the countdown timer display.
 */
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
  const chars = value.split("");

  return (
    <span className={className} style={{ ...style, display: "inline-flex", alignItems: "baseline" }}>
      {chars.map((char, i) => (
        <RollingChar key={i} char={char} direction={direction} />
      ))}
    </span>
  );
}
