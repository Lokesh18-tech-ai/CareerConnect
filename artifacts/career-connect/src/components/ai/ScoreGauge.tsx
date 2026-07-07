import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: number;
  className?: string;
}

export function ScoreGauge({ score, label, size = 96, className }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const colorClass = clamped >= 80 ? "text-emerald-500" : clamped >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div className={cn("relative flex-shrink-0", className)} style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border" />
        <circle
          cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeDasharray={`${clamped} 100`} strokeLinecap="round"
          className={cn(colorClass, "transition-all duration-700 ease-out")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-foreground leading-none">{clamped}</span>
        {label && <span className="text-[9px] text-muted-foreground mt-0.5 leading-none">{label}</span>}
      </div>
    </div>
  );
}
