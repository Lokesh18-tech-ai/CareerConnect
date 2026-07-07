import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "Recently";
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "Recently";
  const diff = Date.now() - then;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function getInitials(name?: string | null): string {
  if (!name) return "U";
  return (
    name
      .split(" ")
      .filter(n => n.length > 0)
      .map(n => n[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}

/** Deterministic per-company avatar palette — consistent across renders */
const PALETTE = [
  { bg: "bg-blue-500/15 dark:bg-blue-500/20",   text: "text-blue-700 dark:text-blue-400",   border: "border-blue-500/20" },
  { bg: "bg-violet-500/15 dark:bg-violet-500/20", text: "text-violet-700 dark:text-violet-400", border: "border-violet-500/20" },
  { bg: "bg-emerald-500/15 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/20" },
  { bg: "bg-orange-500/15 dark:bg-orange-500/20", text: "text-orange-700 dark:text-orange-400", border: "border-orange-500/20" },
  { bg: "bg-pink-500/15 dark:bg-pink-500/20",   text: "text-pink-700 dark:text-pink-400",   border: "border-pink-500/20" },
  { bg: "bg-cyan-500/15 dark:bg-cyan-500/20",   text: "text-cyan-700 dark:text-cyan-400",   border: "border-cyan-500/20" },
  { bg: "bg-indigo-500/15 dark:bg-indigo-500/20", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-500/20" },
  { bg: "bg-rose-500/15 dark:bg-rose-500/20",   text: "text-rose-700 dark:text-rose-400",   border: "border-rose-500/20" },
  { bg: "bg-amber-500/15 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/20" },
  { bg: "bg-teal-500/15 dark:bg-teal-500/20",   text: "text-teal-700 dark:text-teal-400",   border: "border-teal-500/20" },
  { bg: "bg-lime-500/15 dark:bg-lime-500/20",   text: "text-lime-700 dark:text-lime-400",   border: "border-lime-500/20" },
  { bg: "bg-sky-500/15 dark:bg-sky-500/20",     text: "text-sky-700 dark:text-sky-400",     border: "border-sky-500/20" },
];

export function avatarColor(name?: string | null) {
  if (!name) return PALETTE[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function statusColor(status: string): string {
  switch (status) {
    case "pending":   return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    case "reviewing": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "interview": return "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20";
    case "offer":     return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    case "rejected":  return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
    case "withdrawn": return "bg-muted text-muted-foreground border-border";
    default:          return "bg-muted text-muted-foreground border-border";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "pending":   return "Applied";
    case "reviewing": return "Under Review";
    case "interview": return "Interview";
    case "offer":     return "Offer";
    case "rejected":  return "Not Selected";
    case "withdrawn": return "Withdrawn";
    default:          return status;
  }
}

export function typeColor(type: string): string {
  switch (type) {
    case "full-time":  return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "part-time":  return "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20";
    case "contract":   return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
    case "internship": return "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20";
    default:           return "bg-muted text-muted-foreground border-border";
  }
}

export function levelColor(level: string): string {
  switch (level) {
    case "entry":   return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    case "mid":     return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "senior":  return "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20";
    case "lead":    return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
    default:        return "bg-muted text-muted-foreground border-border";
  }
}

/** Strips any demo/illustrative/sample-data labeling from a salary string so
 *  seeded data renders exactly like a real listing (e.g. "₹15–22 LPA
 *  (illustrative demo)" → "₹15–22 LPA"). Safe to call on any string. */
export function cleanSalary(salary?: string | null): string {
  if (!salary) return "";
  return salary
    .replace(/\s*[\(\[][^)\]]*(?:illustrative|demo|sample data|placeholder)[^)\]]*[\)\]]\s*/gi, "")
    .trim();
}
export const LEVEL_MAP: Record<string, string> = {
  all: "all",
  intern: "entry",
  entry: "entry",
  associate: "entry",
  mid: "mid",
  senior: "senior",
  lead: "lead",
  principal: "lead",
  architect: "lead",
  manager: "lead",
};

export interface ProfileCompletionInput {
  name?: string | null;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  resumeUrl?: string | null;
  skills?: string | null;
  headline?: string;
  phone?: string;
  hasEducation?: boolean;
  hasExperience?: boolean;
}

export function computeProfileCompletion(input: ProfileCompletionInput): { percent: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [!!input.name, "Full name"],
    [!!input.avatar, "Profile picture"],
    [!!input.headline, "Professional title"],
    [!!input.bio, "About Me"],
    [!!input.location, "Location"],
    [!!input.phone, "Phone number"],
    [!!input.skills, "Skills"],
    [!!input.hasEducation, "Education"],
    [!!input.hasExperience, "Experience"],
    [!!input.resumeUrl, "Resume"],
  ];
  const done = checks.filter(([ok]) => ok).length;
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
  return { percent: Math.round((done / checks.length) * 100), missing };
}
