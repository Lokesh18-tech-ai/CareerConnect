import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Search, Building2, MapPin, Briefcase, Clock, Sparkles, AlertTriangle,
  ExternalLink, Send, Trash2, Bookmark, ArrowUpDown, DollarSign, Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, timeAgo, getInitials, typeColor, cleanSalary } from "@/lib/utils";
import { useAuth, getToken } from "@/lib/auth";
import { notify } from "@/lib/toast";

import API from "@/lib/api";

const ESTIMATED_WINDOW_DAYS = 30;

interface SavedJob {
  id: number; jobId: number; jobTitle?: string | null; companyName?: string | null;
  companyLogo?: string | null; location?: string | null; type?: string | null;
  level?: string | null; salary?: string | null; savedAt: string; postedAt?: string | null;
}

interface JobListing {
  id: number; title: string; companyName?: string | null; companyLogo?: string | null;
  location: string; type: string; level: string; salary?: string | null; createdAt: string;
}

function parseSalary(s?: string | null): number {
  if (!s) return 0;
  const nums = s.replace(/,/g, "").match(/\d+(\.\d+)?/g);
  if (!nums) return 0;
  return Math.max(...nums.map(Number));
}

function workModeOf(location?: string | null): string {
  const l = (location ?? "").toLowerCase();
  if (l.includes("remote")) return "Remote";
  if (l.includes("hybrid")) return "Hybrid";
  return "On-site";
}

function estimatedDeadline(postedAt?: string | null): Date | null {
  if (!postedAt) return null;
  const posted = new Date(postedAt);
  if (isNaN(posted.getTime())) return null;
  return new Date(posted.getTime() + ESTIMATED_WINDOW_DAYS * 86400000);
}

export default function SavedJobsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedJob[]>([]);
  const [allJobs, setAllJobs] = useState<JobListing[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [expFilter, setExpFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [applying, setApplying] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const [savedRaw, jobsRes, apps] = await Promise.all([
          fetch(`${API}/saved-jobs?userId=${user.id}`).then(r => r.json()) as Promise<SavedJob[]>,
          fetch(`${API}/jobs?limit=50`).then(r => r.json()) as Promise<{ jobs: JobListing[] }>,
          fetch(`${API}/applications?userId=${user.id}`).then(r => r.json()) as Promise<{ jobId: number }[]>,
        ]);
        const jobDetails = await Promise.all(
          savedRaw.map(s => fetch(`${API}/jobs/${s.jobId}`).then(r => r.ok ? r.json() : null).catch(() => null))
        );
        const enriched = savedRaw.map((s, i) => ({ ...s, postedAt: (jobDetails[i] as JobListing | null)?.createdAt ?? null }));
        setSaved(enriched);
        setAllJobs(Array.isArray(jobsRes.jobs) ? jobsRes.jobs : []);
        setAppliedJobIds(new Set(apps.map(a => a.jobId)));
      } catch {
        notify.error("Couldn't load saved jobs", "Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const companies = useMemo(() => Array.from(new Set(saved.map(s => s.companyName).filter(Boolean))) as string[], [saved]);
  const locations = useMemo(() => Array.from(new Set(saved.map(s => s.location).filter(Boolean))) as string[], [saved]);
  const levels = useMemo(() => Array.from(new Set(saved.map(s => s.level).filter(Boolean))) as string[], [saved]);
  const types = useMemo(() => Array.from(new Set(saved.map(s => s.type).filter(Boolean))) as string[], [saved]);

  const filtered = useMemo(() => {
    let list = saved.filter(s => {
      const matchesSearch = !search || `${s.jobTitle} ${s.companyName}`.toLowerCase().includes(search.toLowerCase());
      const matchesCompany = companyFilter === "all" || s.companyName === companyFilter;
      const matchesLocation = locationFilter === "all" || s.location === locationFilter;
      const matchesExp = expFilter === "all" || s.level === expFilter;
      const matchesType = typeFilter === "all" || s.type === typeFilter;
      return matchesSearch && matchesCompany && matchesLocation && matchesExp && matchesType;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "salary": return parseSalary(b.salary) - parseSalary(a.salary);
        case "updated": return +new Date(b.savedAt) - +new Date(a.savedAt);
        case "company": return (a.companyName ?? "").localeCompare(b.companyName ?? "");
        default: return +new Date(b.savedAt) - +new Date(a.savedAt);
      }
    });
    return list;
  }, [saved, search, companyFilter, locationFilter, expFilter, typeFilter, sort]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: saved.length,
      recent: saved.filter(s => now - new Date(s.savedAt).getTime() < 7 * 86400000).length,
      remote: saved.filter(s => workModeOf(s.location) === "Remote").length,
      expiringSoon: saved.filter(s => {
        const dl = estimatedDeadline(s.postedAt);
        return dl && dl.getTime() - now > 0 && dl.getTime() - now < 48 * 3600000;
      }).length,
    };
  }, [saved]);

  const expiringSoon = useMemo(() => saved.filter(s => {
    const dl = estimatedDeadline(s.postedAt);
    return dl && dl.getTime() - Date.now() > 0 && dl.getTime() - Date.now() < 48 * 3600000;
  }), [saved]);

  const recommended = useMemo(() => {
    if (saved.length === 0 || allJobs.length === 0) return [];
    const savedJobIds = new Set(saved.map(s => s.jobId));
    const savedCompanies = new Set(saved.map(s => s.companyName));
    const savedTypes = new Set(saved.map(s => s.type));
    const savedLevels = new Set(saved.map(s => s.level));
    return allJobs
      .filter(j => !savedJobIds.has(j.id) && !appliedJobIds.has(j.id))
      .map(j => ({ job: j, score: (savedCompanies.has(j.companyName) ? 2 : 0) + (savedTypes.has(j.type) ? 1 : 0) + (savedLevels.has(j.level) ? 1 : 0) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(r => r.job);
  }, [saved, allJobs, appliedJobIds]);

  const handleApply = async (jobId: number) => {
    if (!user) return;
    setApplying(jobId);
    try {
      const res = await fetch(`${API}/applications`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, userId: user.id }),
      });
      if (!res.ok) throw new Error();
      setAppliedJobIds(prev => new Set(prev).add(jobId));
      notify.success("Application submitted successfully");
    } catch {
      notify.error("Couldn't submit application", "Please try again.");
    } finally {
      setApplying(null);
    }
  };

  const handleRemove = async (jobId: number) => {
    setRemoving(jobId);
    try {
      const token = getToken();
      const res = await fetch(`${API}/saved-jobs/${jobId}`, { method: "DELETE", headers: token ? { Authorization: token } : {} });
      if (!res.ok && res.status !== 204) throw new Error();
      setSaved(prev => prev.filter(s => s.jobId !== jobId));
      notify.success("Removed from saved jobs");
    } catch {
      notify.error("Couldn't remove job", "Please try again.");
    } finally {
      setRemoving(null);
    }
  };

  const cards = [
    { label: "Total Saved Jobs", value: stats.total, icon: Bookmark, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Recently Saved", value: stats.recent, icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Remote Jobs", value: stats.remote, icon: Globe2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Expiring Soon", value: stats.expiringSoon, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  if (!user) {
    return <div className="text-center py-20"><p>Please <Link href="/login"><span className="text-primary underline cursor-pointer">sign in</span></Link> to view your saved jobs.</p></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Heart className="w-6 h-6 text-purple-500" /> Saved Jobs</h1>
        <p className="text-muted-foreground mt-1">Your personal job wishlist</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {loading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", c.bg)}><c.icon className={cn("w-4 h-4", c.color)} /></div>
            <div className="text-xl font-bold text-foreground">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Expiring soon */}
      {!loading && expiringSoon.length > 0 && (
        <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" /> Expiring Soon
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Estimated application windows closing within 48 hours (based on posting date — exact deadlines aren't tracked yet).</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {expiringSoon.map(s => (
              <Link key={s.id} href={`/jobs/${s.jobId}`}>
                <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-amber-500/40 transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground">{getInitials(s.companyName)}</div>
                  <div className="min-w-0"><p className="text-sm font-medium text-foreground truncate">{s.jobTitle}</p><p className="text-xs text-muted-foreground truncate">{s.companyName}</p></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search, filters, sort */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by job title or company…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterSelect value={companyFilter} onChange={setCompanyFilter} placeholder="Company" options={[["all", "All Companies"], ...companies.map(c => [c, c] as [string, string])]} />
          <FilterSelect value={locationFilter} onChange={setLocationFilter} placeholder="Location" options={[["all", "All Locations"], ...locations.map(l => [l, l] as [string, string])]} />
          <FilterSelect value={expFilter} onChange={setExpFilter} placeholder="Experience" options={[["all", "All Levels"], ...levels.map(l => [l, l] as [string, string])]} />
          <FilterSelect value={typeFilter} onChange={setTypeFilter} placeholder="Job Type" options={[["all", "All Types"], ...types.map(t => [t, t] as [string, string])]} />
          <FilterSelect value={sort} onChange={setSort} icon={<ArrowUpDown className="w-3.5 h-3.5" />} placeholder="Sort" options={[
            ["newest", "Newest First"], ["salary", "Highest Salary"], ["updated", "Recently Saved"], ["company", "Company A–Z"],
          ]} />
        </div>
      </div>

      {/* Saved job cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptySaved hasAny={saved.length > 0} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <AnimatePresence>
            {filtered.map(s => {
              const deadline = estimatedDeadline(s.postedAt);
              const applied = appliedJobIds.has(s.jobId);
              return (
                <motion.div key={s.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-secondary border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {s.companyLogo ? <img src={s.companyLogo} alt="" className="w-full h-full object-contain p-1.5" /> : <span className="text-sm font-bold text-muted-foreground">{getInitials(s.companyName)}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{s.jobTitle}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 truncate"><Building2 className="w-3.5 h-3.5" /> {s.companyName}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {s.type && <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-medium", typeColor(s.type))}>{s.type}</span>}
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{workModeOf(s.location)}</span>
                    {s.level && <span className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{s.level}</span>}
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                    <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {s.location}</p>
                    {s.salary && <p className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> {cleanSalary(s.salary)}</p>}
                    <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Saved {timeAgo(s.savedAt)}</p>
                    {deadline && <p className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Est. deadline {deadline.toLocaleDateString()}</p>}
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border">
                    <Button size="sm" className="gap-1.5 flex-1" disabled={applied || applying === s.jobId} onClick={() => handleApply(s.jobId)}>
                      <Send className="w-3.5 h-3.5" /> {applied ? "Applied" : applying === s.jobId ? "Applying…" : "Apply Now"}
                    </Button>
                    <Link href={`/jobs/${s.jobId}`}><Button size="sm" variant="outline"><ExternalLink className="w-3.5 h-3.5" /></Button></Link>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={removing === s.jobId} onClick={() => handleRemove(s.jobId)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Recommended for you */}
      {!loading && recommended.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-1"><Sparkles className="w-4.5 h-4.5 text-primary" /> Recommended for You</h2>
          <p className="text-xs text-muted-foreground mb-4">Based on the companies, job types, and levels you've been saving</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recommended.map(job => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full flex flex-col">
                  <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center mb-3 text-xs font-bold text-muted-foreground">{getInitials(job.companyName)}</div>
                  <h4 className="font-medium text-foreground text-sm truncate">{job.title}</h4>
                  <p className="text-xs text-muted-foreground truncate mb-1">{job.companyName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-auto"><MapPin className="w-3 h-3" /> {job.location}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options, placeholder, icon }: { value: string; onChange: (v: string) => void; options: [string, string][]; placeholder: string; icon?: React.ReactNode }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] text-xs gap-1.5">{icon}<SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function EmptySaved({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center mb-10">
      <Heart className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
      <h3 className="font-semibold text-foreground">{hasAny ? "No saved jobs match your filters" : "No saved jobs yet"}</h3>
      <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
        {hasAny ? "Try adjusting your search or filters." : "Save jobs you're interested in to build your wishlist and get personalized recommendations."}
      </p>
      {!hasAny && <Link href="/jobs"><Button className="mt-5 gap-1.5"><Briefcase className="w-4 h-4" /> Browse Jobs</Button></Link>}
    </div>
  );
}
