const KEY = "cc_recently_viewed_jobs";
const MAX_ITEMS = 10;

export interface RecentlyViewedJob {
  id: number;
  title: string;
  companyName?: string | null;
  location?: string | null;
  viewedAt: string;
}

/** Reads the recently-viewed jobs list, most recent first. Safe to call
 *  anywhere — returns an empty array if nothing has been tracked yet or
 *  localStorage is unavailable (SSR-safe guard included). */
export function getRecentlyViewedJobs(): RecentlyViewedJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentlyViewedJob[]) : [];
  } catch {
    return [];
  }
}

/** Records a job view. Not currently called anywhere in the app — wiring
 *  this into the job detail page is a small follow-up for a future phase
 *  (that page is out of scope for this pass). Exported now so the Dashboard
 *  widget lights up automatically as soon as that hook-up happens. */
export function trackJobView(job: Omit<RecentlyViewedJob, "viewedAt">) {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentlyViewedJobs().filter((j) => j.id !== job.id);
    const next = [{ ...job, viewedAt: new Date().toISOString() }, ...existing].slice(0, MAX_ITEMS);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota/serialization errors */
  }
}
