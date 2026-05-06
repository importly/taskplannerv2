import { useEffect, useRef, useState } from "react";

/**
 * Animates an entire value string as one unit — the whole string 
 * slides out and the new one slides in. No per-character clipping.
 * Works cleanly at any font size.
 */
export function RollingDigits({
  value,
  className,
  style,
}: {
  value: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [state, setState] = useState({
    current: value,
    prev: null as string | null,
    dir: 0,
  });
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (value !== state.current) {
      clearTimeout(timerRef.current);
      setState(s => ({
        current: value,
        prev: s.current,
        dir: value < s.current ? -1 : 1,
      }));
      timerRef.current = window.setTimeout(() => {
        setState(s => ({ ...s, prev: null }));
      }, 350);
    }
    return () => clearTimeout(timerRef.current);
  }, [value]);

  const { current, prev, dir } = state;
  const isAnimating = prev !== null;

  return (
    <span
      className={className}
      style={{
        ...style,
        position: "relative",
        display: "inline-block",
        overflow: "hidden",
        /* Generous padding so glyphs aren't clipped at rest */
        paddingTop: "0.08em",
        paddingBottom: "0.08em",
      }}
    >
      {/* Current value — slides in */}
      <span
        style={{
          display: "block",
          whiteSpace: "nowrap",
          animation: isAnimating
            ? `roll-in-${dir < 0 ? "down" : "up"} 320ms cubic-bezier(0.22, 1, 0.36, 1) both`
            : undefined,
        }}
      >
        {current}
      </span>

      {/* Previous value — slides out */}
      {isAnimating && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "0.08em",
            width: "100%",
            whiteSpace: "nowrap",
            animation: `roll-out-${dir < 0 ? "down" : "up"} 320ms cubic-bezier(0.22, 1, 0.36, 1) both`,
          }}
        >
          {prev}
        </span>
      )}
    </span>
  );
}
