import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, X, SlidersHorizontal, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { JobCard, JobCardSkeleton } from "@/components/JobCard";
import { LevelDropdown, LEVEL_OPTIONS } from "@/components/LevelDropdown";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

import API from "@/lib/api";


interface Job {
  id: number; title: string; companyName?: string | null; companyLogo?: string | null;
  location: string; type: string; level: string; salary?: string | null;
  featured: boolean; createdAt: string;
  description?: string | null; requirements?: string | null;
}

function parseQuery(loc: string) {
  return new URLSearchParams(loc.includes("?") ? loc.split("?")[1] : "");
}

const INPUT_CLS = [
  "w-full bg-card border border-border text-foreground text-sm rounded-lg px-4 py-2.5",
  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
  "placeholder:text-muted-foreground transition-colors hover:border-primary/40",
].join(" ");

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const ITEMS_PER_PAGE = 9;

export default function JobsPage() {
  const { user, token } = useAuth();
  const [loc, setLocation] = useLocation();
  const params = parseQuery(loc);

  const initialLevel = params.get("level") ?? "all";
  const initialLevelOpt = LEVEL_OPTIONS.find(o => o.value === initialLevel);

  const [search, setSearch]       = useState(params.get("search") ?? "");
  const [locationVal, setLoc]     = useState(params.get("location") ?? "");
  const [type, setType]           = useState(params.get("type") ?? "all");
  const [levelDisplay, setLevelDisplay] = useState(initialLevelOpt ? initialLevel : "all"); // display key
  const [levelDb, setLevelDb]     = useState(initialLevelOpt?.dbValue ?? "all");            // db filter value

  const [jobs, setJobs]           = useState<Job[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [savedIds, setSavedIds]   = useState<Set<number>>(new Set());

  /* ── Fetch ── */
  const fetchJobs = useCallback(async (p = 1) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p), limit: String(ITEMS_PER_PAGE) });
    if (search)          q.set("search", search);
    if (locationVal)     q.set("location", locationVal);
    if (type !== "all")  q.set("type", type);
    if (levelDb !== "all") q.set("level", levelDb);
    try {
      const res  = await fetch(`${API}/jobs?${q}`);
      const data = await res.json() as { jobs: Job[]; total: number };
      let resultJobs = Array.isArray(data.jobs) ? data.jobs : [];
      let resultTotal = data.total ?? 0;

      // The backend only matches the search term against a job's title/description
      // as one literal substring. Real search queries are rarely an exact
      // substring match — e.g. "Frontend Developer - React" (typed with a plain
      // hyphen) should still match a job titled "Frontend Developer — React"
      // (an em dash), and a query should also be able to match a skill or a
      // company name. When the strict backend search comes back empty, fall
      // back to a broader fetch — scoped to the same location/type/level
      // filters — and do a tokenized, scored match client-side instead.
      if (search && resultJobs.length === 0) {
        const fallbackQ = new URLSearchParams({ page: "1", limit: "50" });
        if (locationVal)      fallbackQ.set("location", locationVal);
        if (type !== "all")   fallbackQ.set("type", type);
        if (levelDb !== "all") fallbackQ.set("level", levelDb);
        const fallbackRes = await fetch(`${API}/jobs?${fallbackQ}`);
        const fallbackData = await fallbackRes.json() as { jobs: Job[]; total: number };
        const pool = Array.isArray(fallbackData.jobs) ? fallbackData.jobs : [];

        // Break the query into individual words, ignoring punctuation like
        // hyphens, em dashes, and slashes so word order/formatting doesn't matter.
        const tokens = search.toLowerCase().split(/[^a-z0-9+#.]+/i).filter(t => t.length > 1);

        const scored = pool
          .map(j => {
            const haystack = [j.title, j.companyName, j.requirements, j.description]
              .filter(Boolean).join(" ").toLowerCase();
            const score = tokens.reduce((n, t) => n + (haystack.includes(t) ? 1 : 0), 0);
            return { job: j, score };
          })
          .filter(r => r.score > 0)
          .sort((a, b) => b.score - a.score);

        const matched = scored.map(r => r.job);
        const start = (p - 1) * ITEMS_PER_PAGE;
        resultJobs = matched.slice(start, start + ITEMS_PER_PAGE);
        resultTotal = matched.length;
      }

      setJobs(resultJobs);
      setTotal(resultTotal);
      setPage(p);
    } catch {
      setJobs([]);
      toast.error("Couldn't load jobs", { description: "Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }, [search, locationVal, type, levelDb]);

  useEffect(() => { fetchJobs(1); }, [fetchJobs]);

  /* ── Keep filters in sync with the URL. This covers navigation coming
     from the Home page search, trending tags, or browser back/forward —
     any case where the query string changes without the user typing
     directly into this page's own filter bar. ── */
  useEffect(() => {
    const p = parseQuery(loc);
    const nextSearch = p.get("search") ?? "";
    const nextLocation = p.get("location") ?? "";
    const nextType = p.get("type") ?? "all";
    const nextLevelParam = p.get("level") ?? "all";
    const nextLevelOpt = LEVEL_OPTIONS.find(o => o.value === nextLevelParam);

    setSearch(prev => (prev === nextSearch ? prev : nextSearch));
    setLoc(prev => (prev === nextLocation ? prev : nextLocation));
    setType(prev => (prev === nextType ? prev : nextType));
    setLevelDisplay(prev => {
      const resolved = nextLevelOpt ? nextLevelParam : "all";
      return prev === resolved ? prev : resolved;
    });
    setLevelDb(prev => {
      const resolved = nextLevelOpt?.dbValue ?? "all";
      return prev === resolved ? prev : resolved;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc]);

  /* ── Saved jobs ── */
  useEffect(() => {
    if (!user) return;
    fetch(`${API}/saved-jobs?userId=${user.id}`)
      .then(r => r.json())
      .then((d: Array<{ jobId: number }>) =>
        setSavedIds(new Set(Array.isArray(d) ? d.map(s => s.jobId) : []))
      ).catch(() => {});
  }, [user]);

  const handleSave = async (jobId: number) => {
    if (!user || !token) { toast.info("Sign in to save jobs"); return; }
    try {
      await fetch(`${API}/saved-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ jobId, userId: user.id }),
      });
      setSavedIds(prev => new Set([...prev, jobId]));
      toast.success("Job saved");
    } catch { toast.error("Couldn't save job"); }
  };

  const handleUnsave = async (jobId: number) => {
    if (!user || !token) return;
    try {
      await fetch(`${API}/saved-jobs/${jobId}`, { method: "DELETE", headers: { Authorization: token } });
      setSavedIds(prev => { const n = new Set(prev); n.delete(jobId); return n; });
      toast.info("Removed from saved jobs");
    } catch { toast.error("Couldn't remove job"); }
  };

  const syncUrl = (s: string, l: string, t: string, lvlDisplay: string) => {
    const q = new URLSearchParams();
    if (s) q.set("search", s);
    if (l) q.set("location", l);
    if (t !== "all") q.set("type", t);
    if (lvlDisplay !== "all") q.set("level", lvlDisplay);
    const qs = q.toString();
    setLocation(`/jobs${qs ? `?${qs}` : ""}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs(1);
    syncUrl(search, locationVal, type, levelDisplay);
  };
  const clearAll = () => {
    setSearch(""); setLoc(""); setType("all");
    setLevelDisplay("all"); setLevelDb("all");
    syncUrl("", "", "all", "all");
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const hasFilters = search || locationVal || type !== "all" || levelDb !== "all";

  const selectedLevelLabel = LEVEL_OPTIONS.find(o => o.value === levelDisplay)?.label ?? "All Levels";

  /* ── Pagination pages array ── */
  function pageNums(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (page > 3) pages.push("…");
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Page header ── */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-[3.75rem] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Find Jobs</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {loading ? "Searching…" : `${total.toLocaleString("en-IN")} opportunities`}
                {hasFilters && !loading && (
                  <span className="ml-2 text-primary font-medium">· filtered</span>
                )}
              </p>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex flex-wrap items-center gap-1.5">
                {search && (
                  <Chip label={`"${search}"`} onRemove={() => { setSearch(""); syncUrl("", locationVal, type, levelDisplay); }} />
                )}
                {locationVal && (
                  <Chip label={locationVal} onRemove={() => { setLoc(""); syncUrl(search, "", type, levelDisplay); }} />
                )}
                {type !== "all" && (
                  <Chip label={type.replace("-", " ")} onRemove={() => { setType("all"); syncUrl(search, locationVal, "all", levelDisplay); }} />
                )}
                {levelDb !== "all" && (
                  <Chip label={selectedLevelLabel} onRemove={() => { setLevelDisplay("all"); setLevelDb("all"); syncUrl(search, locationVal, type, "all"); }} />
                )}
                <button
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 ml-1"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              </div>
            )}
          </div>

          {/* ── Filter bar ── */}
          <form onSubmit={handleSubmit} className="mt-3">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="flex-[2] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  placeholder="Job title, skill, keyword..."
                  className={cn(INPUT_CLS, "pl-9")}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  data-testid="input-search-jobs"
                />
              </div>

              {/* Location */}
              <div className="flex-[1.5] relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  placeholder="City or state..."
                  className={cn(INPUT_CLS, "pl-9")}
                  value={locationVal}
                  onChange={e => setLoc(e.target.value)}
                />
              </div>

              {/* Type */}
              <div className="flex-1 min-w-[130px]">
                <select
                  value={type}
                  onChange={e => { const v = e.target.value; setType(v); syncUrl(search, locationVal, v, levelDisplay); }}
                  className={cn(
                    "w-full bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2.5",
                    "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
                    "hover:border-primary/40 transition-colors cursor-pointer appearance-none",
                  )}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "16px", paddingRight: "2rem" }}
                >
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Level — custom dropdown */}
              <div className="flex-1 min-w-[160px]">
                <LevelDropdown
                  value={levelDisplay}
                  onChange={(display, db) => { setLevelDisplay(display); setLevelDb(db); syncUrl(search, locationVal, type, display); }}
                />
              </div>

              {/* Search btn */}
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0 shadow-sm shadow-primary/20 flex items-center gap-2"
                data-testid="button-search-jobs"
              >
                <Search className="w-4 h-4" /> Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(ITEMS_PER_PAGE)].map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : jobs.length > 0 ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${page}-${search}-${type}-${levelDb}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {jobs.map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <JobCard
                      job={job}
                      isSaved={savedIds.has(job.id)}
                      onSave={handleSave}
                      onUnsave={handleUnsave}
                      showSave={!!user && user.role !== "recruiter"}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-10">
                <PaginationBtn
                  onClick={() => fetchJobs(page - 1)}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </PaginationBtn>

                {pageNums().map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm select-none">…</span>
                  ) : (
                    <PaginationBtn
                      key={p}
                      onClick={() => fetchJobs(p as number)}
                      active={page === p}
                      aria-label={`Page ${p}`}
                      aria-current={page === p ? "page" : undefined}
                    >
                      {p}
                    </PaginationBtn>
                  )
                )}

                <PaginationBtn
                  onClick={() => fetchJobs(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </PaginationBtn>
              </div>
            )}
          </>
        ) : (
          /* ── Empty state ── */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-border rounded-2xl"
          >
            <div className="relative w-16 h-16 mb-5">
              <div className="absolute inset-0 bg-primary/10 rounded-2xl rotate-6" />
              <div className="relative w-16 h-16 bg-card border border-border rounded-2xl flex items-center justify-center">
                <SlidersHorizontal className="w-7 h-7 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1.5">No jobs found</h3>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-5">
              {hasFilters
                ? "Try adjusting your filters — broaden the location or remove a keyword."
                : "No jobs are posted yet. Check back soon."}
            </p>
            {hasFilters && (
              <button
                onClick={clearAll}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-primary/20 flex items-center gap-2"
              >
                <Briefcase className="w-4 h-4" /> Clear filters & show all
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── Small helpers ── */
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-primary/60 transition-colors" aria-label={`Remove filter ${label}`}>
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function PaginationBtn({
  children, onClick, disabled, active, ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "aria-label"?: string;
  "aria-current"?: "page" | undefined;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={cn(
        "w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all",
        "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
          : "bg-card text-foreground border-border hover:bg-muted hover:border-primary/30",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none"
      )}
    >
      {children}
    </button>
  );
}
