import { useState, useRef, useEffect } from "react";
import {
  ChevronDown, Check,
  GraduationCap, Sprout, User, UserCheck,
  Star, Award, Crown, Gem, Building2, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface LevelOption {
  value: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  dbValue: string; // maps to actual DB level
}

export const LEVEL_OPTIONS: LevelOption[] = [
  { value: "all",        label: "All Levels",   sublabel: "Show every experience level", icon: Users,       color: "text-muted-foreground", dbValue: "all" },
  { value: "intern",     label: "Intern",        sublabel: "0–6 months · Stipend-based",  icon: GraduationCap, color: "text-pink-600 dark:text-pink-400",    dbValue: "entry" },
  { value: "entry",      label: "Entry Level",   sublabel: "0–2 years · ₹4–8 LPA",       icon: Sprout,      color: "text-emerald-600 dark:text-emerald-400", dbValue: "entry" },
  { value: "associate",  label: "Associate",     sublabel: "1–3 years · ₹6–12 LPA",      icon: User,        color: "text-teal-600 dark:text-teal-400",    dbValue: "entry" },
  { value: "mid",        label: "Mid Level",     sublabel: "3–5 years · ₹10–18 LPA",     icon: UserCheck,   color: "text-blue-600 dark:text-blue-400",    dbValue: "mid" },
  { value: "senior",     label: "Senior Level",  sublabel: "5–8 years · ₹18–30 LPA",     icon: Star,        color: "text-violet-600 dark:text-violet-400", dbValue: "senior" },
  { value: "lead",       label: "Lead",          sublabel: "7–10 years · ₹25–40 LPA",    icon: Award,       color: "text-rose-600 dark:text-rose-400",    dbValue: "lead" },
  { value: "principal",  label: "Principal",     sublabel: "10+ years · ₹35–60 LPA",     icon: Crown,       color: "text-amber-600 dark:text-amber-400",  dbValue: "lead" },
  { value: "architect",  label: "Architect",     sublabel: "10+ years · ₹40–70 LPA",     icon: Building2,   color: "text-orange-600 dark:text-orange-400", dbValue: "lead" },
  { value: "manager",    label: "Manager",       sublabel: "8+ years · ₹30–55 LPA",      icon: Gem,         color: "text-indigo-600 dark:text-indigo-400", dbValue: "lead" },
];

interface LevelDropdownProps {
  value: string;
  onChange: (displayValue: string, dbValue: string) => void;
}

export function LevelDropdown({ value, onChange }: LevelDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = LEVEL_OPTIONS.find(o => o.value === value) ?? LEVEL_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "ArrowDown" && !open) setOpen(true);
  };

  const SelIcon = selected.icon;

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 w-full rounded-lg border text-sm transition-all outline-none",
          "bg-card text-foreground",
          "hover:border-primary/50 hover:bg-muted/60",
          "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary",
          open
            ? "border-primary/60 bg-muted/60 shadow-md shadow-primary/10"
            : "border-border"
        )}
      >
        <SelIcon className={cn("w-3.5 h-3.5 flex-shrink-0", selected.color)} />
        <span className="flex-1 text-left truncate font-medium">{selected.label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute z-50 mt-1.5 w-72 rounded-xl border border-border bg-card shadow-xl shadow-black/15 dark:shadow-black/40",
            "ring-1 ring-black/5 dark:ring-white/5",
            "overflow-hidden",
            // Position: prefer below, but could be above if near bottom
            "top-full left-0"
          )}
          style={{ animation: "dropdownIn 0.15s ease" }}
        >
          <style>{`@keyframes dropdownIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {/* Header */}
          <div className="px-3 py-2 border-b border-border bg-muted/40">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Experience Level</p>
          </div>

          <div className="p-1.5 space-y-0.5 max-h-72 overflow-y-auto scrollbar-thin">
            {LEVEL_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => { onChange(opt.value, opt.dbValue); setOpen(false); }}
                  className={cn(
                    "flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-all group",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/70 text-foreground"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                    isSelected ? "bg-primary/15" : "bg-muted group-hover:bg-muted/80"
                  )}>
                    <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-primary" : opt.color)} />
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium leading-none mb-0.5", isSelected ? "text-primary" : "text-foreground")}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{opt.sublabel}</p>
                  </div>

                  {/* Check */}
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
