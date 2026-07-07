import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Clock, Eye as EyeIcon, ThumbsUp, CalendarClock, Award, XCircle,
  Search, ChevronDown, Building2, MapPin, ExternalLink, MessageSquare,
  Undo2, Video, Ban, Inbox, ArrowUpDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn, statusColor, statusLabel, timeAgo, getInitials } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { notify } from "@/lib/toast";

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

interface Application {
  id: number; jobId: number; userId: number; status: string; coverLetter?: string | null;
  jobTitle?: string | null; companyName?: string | null; companyLogo?: string | null;
  appliedAt: string; updatedAt: string;
  jobType?: string | null; jobLevel?: string | null; jobLocation?: string | null;
}

const STAGES = ["pending", "reviewing", "interview", "offer"] as const;
const TERMINAL = new Set(["rejected", "withdrawn"]);

function workModeOf(location?: string | null): string {
  const l = (location ?? "").toLowerCase();
  if (l.includes("remote")) return "Remote";
  if (l.includes("hybrid")) return "Hybrid";
  return "On-site";
}

function stageIndex(status: string) {
  const i = STAGES.indexOf(status as typeof STAGES[number]);
  return i === -1 ? 0 : i;
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [withdrawing, setWithdrawing] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const apps = await fetch(`${API}/applications?userId=${user.id}`).then(r => r.json()) as Application[];
        const uniqueJobIds = Array.from(new Set(apps.map(a => a.jobId)));
        const jobDetails = await Promise.all(
          uniqueJobIds.map(id => fetch(`${API}/jobs/${id}`).then(r => r.ok ? r.json() : null).catch(() => null))
        );
        const jobMap = new Map(uniqueJobIds.map((id, i) => [id, jobDetails[i]]));
        const enriched = apps.map(a => {
          const job = jobMap.get(a.jobId) as { type?: string; level?: string; location?: string } | null;
          return { ...a, jobType: job?.type ?? null, jobLevel: job?.level ?? null, jobLocation: job?.location ?? null };
        });
        setApplications(enriched);
      } catch {
        notify.error("Couldn't load applications", "Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const companies = useMemo(() => Array.from(new Set(applications.map(a => a.companyName).filter(Boolean))) as string[], [applications]);
  const jobTypes = useMemo(() => Array.from(new Set(applications.map(a => a.jobType).filter(Boolean))) as string[], [applications]);

  const filtered = useMemo(() => {
    let list = applications.filter(a => {
      const matchesSearch = !search || `${a.jobTitle} ${a.companyName}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      const matchesCompany = companyFilter === "all" || a.companyName === companyFilter;
      const matchesType = typeFilter === "all" || a.jobType === typeFilter;
      const matchesMode = modeFilter === "all" || workModeOf(a.jobLocation) === modeFilter;
      return matchesSearch && matchesStatus && matchesCompany && matchesType && matchesMode;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "oldest": return +new Date(a.appliedAt) - +new Date(b.appliedAt);
        case "company": return (a.companyName ?? "").localeCompare(b.companyName ?? "");
        case "status": return stageIndex(b.status) - stageIndex(a.status);
        default: return +new Date(b.appliedAt) - +new Date(a.appliedAt);
      }
    });
    return list;
  }, [applications, search, statusFilter, companyFilter, typeFilter, modeFilter, sort]);

  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    reviewing: applications.filter(a => a.status === "reviewing").length,
    interview: applications.filter(a => a.status === "interview").length,
    offer: applications.filter(a => a.status === "offer").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  }), [applications]);

  const handleWithdraw = async (id: number) => {
    setWithdrawing(id);
    try {
      const res = await fetch(`${API}/applications/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "withdrawn" }),
      });
      if (!res.ok) throw new Error();
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: "withdrawn" } : a));
      notify.success("Application withdrawn");
    } catch {
      notify.error("Couldn't withdraw application", "Please try again.");
    } finally {
      setWithdrawing(null);
    }
  };

  const cards = [
    { label: "Total Applications", value: stats.total, icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Applied", value: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Under Review", value: stats.reviewing, icon: EyeIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Interviews Scheduled", value: stats.interview, icon: CalendarClock, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Offers Received", value: stats.offer, icon: Award, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  if (!user) {
    return <div className="text-center py-20"><p>Please <Link href="/login"><span className="text-primary underline cursor-pointer">sign in</span></Link> to view your applications.</p></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
        <p className="text-muted-foreground mt-1">Track every application from submission to offer</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {loading ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", c.bg)}>
              <c.icon className={cn("w-4 h-4", c.color)} />
            </div>
            <div className="text-xl font-bold text-foreground">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Search, filters, sort */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by job title or company…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="Status" options={[
            ["all", "All Statuses"], ["pending", "Applied"], ["reviewing", "Under Review"],
            ["interview", "Interview"], ["offer", "Offer"], ["rejected", "Rejected"], ["withdrawn", "Withdrawn"],
          ]} />
          <FilterSelect value={companyFilter} onChange={setCompanyFilter} placeholder="Company" options={[["all", "All Companies"], ...companies.map(c => [c, c] as [string, string])]} />
          <FilterSelect value={typeFilter} onChange={setTypeFilter} placeholder="Job Type" options={[["all", "All Job Types"], ...jobTypes.map(t => [t, t] as [string, string])]} />
          <FilterSelect value={modeFilter} onChange={setModeFilter} placeholder="Work Mode" options={[["all", "All Modes"], ["Remote", "Remote"], ["Hybrid", "Hybrid"], ["On-site", "On-site"]]} />
          <FilterSelect value={sort} onChange={setSort} placeholder="Sort" icon={<ArrowUpDown className="w-3.5 h-3.5" />} options={[
            ["newest", "Newest First"], ["oldest", "Oldest First"], ["company", "Company A–Z"], ["status", "By Status"],
          ]} />
        </div>
      </div>

      {/* Applications list */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyApplications hasAny={applications.length > 0} />
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filtered.map(app => (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-secondary border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {app.companyLogo ? <img src={app.companyLogo} alt="" className="w-full h-full object-contain p-1.5" /> : <span className="text-sm font-bold text-muted-foreground">{getInitials(app.companyName)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-foreground">{app.jobTitle ?? "Unknown position"}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Building2 className="w-3.5 h-3.5" /> {app.companyName ?? "Unknown company"}
                            {app.jobLocation && <><span>·</span><MapPin className="w-3.5 h-3.5" />{app.jobLocation}</>}
                          </p>
                        </div>
                        <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0", statusColor(app.status))}>
                          {statusLabel(app.status)}
                        </span>
                      </div>

                      {/* Progress tracker */}
                      {!TERMINAL.has(app.status) && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                            <span>Application Progress</span>
                            <span>{Math.round(((stageIndex(app.status) + 1) / STAGES.length) * 100)}%</span>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${((stageIndex(app.status) + 1) / STAGES.length) * 100}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="mt-4 flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                        {STAGES.map((stage, i) => {
                          const done = !TERMINAL.has(app.status) && i <= stageIndex(app.status);
                          const isTerminalReached = TERMINAL.has(app.status) && i <= stageIndex("pending"); // pending always reached before terminal
                          return (
                            <div key={stage} className="flex items-center flex-shrink-0">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2",
                                done || (TERMINAL.has(app.status) && i === 0) ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground"
                              )}>
                                {done || (TERMINAL.has(app.status) && i === 0) ? "✓" : i + 1}
                              </div>
                              {i < STAGES.length - 1 && <div className={cn("w-6 sm:w-10 h-0.5", done ? "bg-primary" : "bg-border")} />}
                            </div>
                          );
                        })}
                        {TERMINAL.has(app.status) && (
                          <span className={cn("ml-2 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1", app.status === "rejected" ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground")}>
                            {app.status === "rejected" ? <Ban className="w-3 h-3" /> : <Undo2 className="w-3 h-3" />} {statusLabel(app.status)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
                        <span>Applied</span><span>Reviewed</span><span>Interview</span><span>Offer</span>
                      </div>

                      {/* Interview stage panel */}
                      {app.status === "interview" && (
                        <div className="mt-4 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 flex items-center gap-3">
                          <Video className="w-4 h-4 text-violet-500 flex-shrink-0" />
                          <div className="text-xs text-violet-700 dark:text-violet-300">
                            <span className="font-semibold">You've reached the interview stage.</span> Exact date, time, and format will be shared by the recruiter — check your email or reach out via the company page.
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-3">Applied {timeAgo(app.appliedAt)} · Last updated {timeAgo(app.updatedAt)}</p>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 mt-4">
                        <Link href={`/jobs/${app.jobId}`}>
                          <Button variant="outline" size="sm" className="gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> View Job</Button>
                        </Link>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}>
                          <MessageSquare className="w-3.5 h-3.5" /> Messages {expandedId === app.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </Button>
                        {!TERMINAL.has(app.status) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive ml-auto" disabled={withdrawing === app.id}>
                                <XCircle className="w-3.5 h-3.5" /> Withdraw
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Withdraw this application?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  You're about to withdraw your application for {app.jobTitle} at {app.companyName}. This can't be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleWithdraw(app.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Withdraw
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expandable recruiter messages */}
                <AnimatePresence>
                  {expandedId === app.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border bg-secondary/20 overflow-hidden">
                      <div className="p-5 text-center">
                        <MessageSquare className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No messages yet from the recruiter for this application.</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">You'll see recruiter messages here as soon as they reach out.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options, placeholder, icon }: { value: string; onChange: (v: string) => void; options: [string, string][]; placeholder: string; icon?: React.ReactNode }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] text-xs gap-1.5">
        {icon}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function EmptyApplications({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center">
      <Inbox className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
      <h3 className="font-semibold text-foreground">{hasAny ? "No applications match your filters" : "No applications yet"}</h3>
      <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
        {hasAny ? "Try adjusting your search or filters." : "Once you apply to jobs, they'll show up here with full status tracking."}
      </p>
      {!hasAny && <Link href="/jobs"><Button className="mt-5 gap-1.5"><ThumbsUp className="w-4 h-4" /> Browse Jobs</Button></Link>}
    </div>
  );
}
