import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface AnimatedCounterProps {
  /** Final numeric value to count up to */
  value: number;
  /** Text shown after the number, e.g. "+" or "%" */
  suffix?: string;
  /** Text shown before the number, e.g. "$" */
  prefix?: string;
  duration?: number;
  className?: string;
}

/** Counts up from 0 to `value` once it scrolls into view. Pure CSS/RAF —
 *  no extra dependency beyond framer-motion's useInView, which the project
 *  already ships. */
export function AnimatedCounter({ value, suffix = "", prefix = "", duration = 1400, className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic for a natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
