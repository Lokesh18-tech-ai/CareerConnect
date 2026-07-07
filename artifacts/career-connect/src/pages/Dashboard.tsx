import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  Briefcase, Bookmark, TrendingUp, ChevronRight, Building2,
  UserCircle2, FileText, Eye, CalendarClock, Bell, Sparkles,
  CheckCircle2, MessageSquareText, BadgeCheck, XCircle, PartyPopper,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn, statusColor, statusLabel, timeAgo, getInitials } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { getRecentlyViewedJobs, type RecentlyViewedJob } from "@/lib/recentlyViewed";

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

interface Application {
  id: number; jobId: number; userId: number; status: string; coverLetter?: string | null;
  jobTitle?: string | null; companyName?: string | null; companyLogo?: string | null;
  appliedAt: string; updatedAt: string;
}

interface SavedJob {
  id: number; jobId: number; jobTitle?: string | null; companyName?: string | null;
  companyLogo?: string | null; location?: string | null; type?: string | null;
  salary?: string | null; savedAt: string;
}

interface Notification {
  id: string;
  icon: typeof Bell;
  tone: "success" | "info" | "warning" | "neutral";
  title: string;
  detail: string;
  at: string;
}

const STATUS_CHART_COLORS: Record<string, string> = {
  pending: "hsl(var(--chart-3))",
  reviewing: "hsl(var(--chart-4))",
  interview: "hsl(var(--chart-1))",
  offer: "hsl(var(--chart-2))",
  rejected: "hsl(var(--destructive))",
};

function monthKey(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short" });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ applicationCount: 0, savedJobCount: 0, pendingCount: 0, interviewCount: 0 });
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    setRecentlyViewed(getRecentlyViewedJobs());
    Promise.all([
      fetch(`${API}/dashboard?userId=${user.id}`).then(r => r.json()),
      fetch(`${API}/applications?userId=${user.id}`).then(r => r.json()),
      fetch(`${API}/saved-jobs?userId=${user.id}`).then(r => r.json()),
    ]).then(([dash, apps, saved]) => {
      const d = dash as { applicationCount?: number; savedJobCount?: number; pendingCount?: number; interviewCount?: number };
      setStats({
        applicationCount: d.applicationCount ?? 0,
        savedJobCount: d.savedJobCount ?? 0,
        pendingCount: d.pendingCount ?? 0,
        interviewCount: d.interviewCount ?? 0,
      });
      setApplications(Array.isArray(apps) ? (apps as Application[]) : []);
      setSavedJobs(Array.isArray(saved) ? (saved as SavedJob[]) : []);
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  }, [user]);

  // ── Derived data (all computed client-side from data we already fetch —
  //    no backend changes required) ──────────────────────────────────────

  const profileCompletion = useMemo(() => {
    if (!user) return { percent: 0, missing: [] as string[] };
    const checks: [boolean, string][] = [
      [!!user.name, "Name"],
      [!!user.avatar, "Profile photo"],
      [!!user.bio, "Bio"],
      [!!user.location, "Location"],
      [!!user.resumeUrl, "Resume"],
      [!!user.skills, "Skills"],
    ];
    const done = checks.filter(([ok]) => ok).length;
    const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
    return { percent: Math.round((done / checks.length) * 100), missing };
  }, [user]);

  const applicationsPerMonth = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthKey(d), count: 0 });
    }
    applications.forEach(app => {
      const d = new Date(app.appliedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.find(b => b.key === key);
      if (bucket) bucket.count += 1;
    });
    return buckets;
  }, [applications]);

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach(app => { counts[app.status] = (counts[app.status] ?? 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [applications]);

  const successRate = useMemo(() => {
    if (applications.length === 0) return 0;
    const successful = applications.filter(a => a.status === "interview" || a.status === "offer").length;
    return Math.round((successful / applications.length) * 100);
  }, [applications]);

  const upcomingInterviews = useMemo(
    () => applications.filter(a => a.status === "interview").sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [applications]
  );

  const notifications = useMemo<Notification[]>(() => {
    const items: Notification[] = [];
    applications.forEach(app => {
      if (app.status === "interview") {
        items.push({
          id: `int-${app.id}`, icon: MessageSquareText, tone: "info",
          title: "Interview stage reached", detail: `${app.jobTitle ?? "A role"} at ${app.companyName ?? "a company"}`,
          at: app.updatedAt,
        });
      } else if (app.status === "offer") {
        items.push({
          id: `off-${app.id}`, icon: PartyPopper, tone: "success",
          title: "Offer received!", detail: `${app.jobTitle ?? "A role"} at ${app.companyName ?? "a company"}`,
          at: app.updatedAt,
        });
      } else if (app.status === "rejected") {
        items.push({
          id: `rej-${app.id}`, icon: XCircle, tone: "neutral",
          title: "Application closed", detail: `${app.jobTitle ?? "A role"} at ${app.companyName ?? "a company"}`,
          at: app.updatedAt,
        });
      }
    });
    savedJobs.slice(0, 3).forEach(job => {
      items.push({
        id: `saved-${job.id}`, icon: Bookmark, tone: "neutral",
        title: "Job saved", detail: `${job.jobTitle ?? "A role"} at ${job.companyName ?? "a company"}`,
        at: job.savedAt,
      });
    });
    return items.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 5);
  }, [applications, savedJobs]);

  if (!user) {
    return (
      <div className="text-center py-20">
        <p>Please <Link href="/login"><span className="text-primary underline cursor-pointer">sign in</span></Link> to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {user.name?.split(" ")[0] ?? "there"} 👋</h1>
        <p className="text-muted-foreground mt-1">Your job search control center</p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Something went wrong loading some of your dashboard data. Try refreshing the page.
        </div>
      )}

      {/* ── Top KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Profile Completion */}
        <DashCard>
          {loading ? <StatSkeleton /> : (
            <>
              <div className="flex items-center justify-between mb-3">
                <IconBadge icon={UserCircle2} color="text-blue-500" bg="bg-blue-500/10" />
                <span className="text-xs font-semibold text-muted-foreground">{profileCompletion.percent}%</span>
              </div>
              <Progress value={profileCompletion.percent} className="h-1.5 mb-2.5" />
              <div className="text-sm font-semibold text-foreground">Profile Completion</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {profileCompletion.percent === 100
                  ? "Your profile is complete"
                  : `Add ${profileCompletion.missing[0]?.toLowerCase()}${profileCompletion.missing.length > 1 ? ` +${profileCompletion.missing.length - 1} more` : ""}`}
              </div>
              <Link href="/profile">
                <button className="text-xs font-medium text-primary hover:underline mt-2">
                  {profileCompletion.percent === 100 ? "View profile" : "Complete profile"} →
                </button>
              </Link>
            </>
          )}
        </DashCard>

        {/* Resume Score */}
        <DashCard>
          {loading ? <StatSkeleton /> : (
            <>
              <IconBadge icon={FileText} color="text-emerald-500" bg="bg-emerald-500/10" className="mb-3" />
              <div className="text-sm font-semibold text-foreground">Resume Score</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {user.resumeUrl ? "Get a fresh AI score for your latest resume" : "Upload a resume to unlock AI scoring"}
              </div>
              <Link href={user.resumeUrl ? "/ai/resume-analyzer" : "/ai/resume-builder"}>
                <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-2">
                  <Sparkles className="w-3 h-3" /> {user.resumeUrl ? "Run analysis" : "Upload resume"} →
                </button>
              </Link>
            </>
          )}
        </DashCard>

        {/* Applications Submitted */}
        <DashCard>
          {loading ? <StatSkeleton /> : (
            <>
              <IconBadge icon={Briefcase} color="text-blue-500" bg="bg-blue-500/10" className="mb-3" />
              <div className="text-2xl font-bold text-foreground">{stats.applicationCount}</div>
              <div className="text-sm text-muted-foreground mt-0.5">Applications Submitted</div>
              <div className="text-xs text-muted-foreground mt-2">{stats.pendingCount} awaiting response</div>
            </>
          )}
        </DashCard>

        {/* Saved Jobs */}
        <DashCard>
          {loading ? <StatSkeleton /> : (
            <>
              <IconBadge icon={Bookmark} color="text-purple-500" bg="bg-purple-500/10" className="mb-3" />
              <div className="text-2xl font-bold text-foreground">{stats.savedJobCount}</div>
              <div className="text-sm text-muted-foreground mt-0.5">Saved Jobs</div>
              <Link href="/jobs">
                <button className="text-xs font-medium text-primary hover:underline mt-2">Browse more →</button>
              </Link>
            </>
          )}
        </DashCard>
      </div>

      {/* ── Widget row: Recently Viewed / Upcoming Interviews / Notifications ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Recently Viewed Jobs */}
        <WidgetCard title="Recently Viewed Jobs" icon={Eye}>
          {loading ? (
            <ListSkeleton />
          ) : recentlyViewed.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentlyViewed.slice(0, 4).map(job => (
                <li key={job.id}>
                  <Link href={`/jobs/${job.id}`}>
                    <div className="flex items-center gap-2.5 py-2.5 cursor-pointer group">
                      <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-muted-foreground">
                        {getInitials(job.companyName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{job.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{job.companyName ?? "Company"}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyMini
              icon={Eye}
              text="No jobs viewed yet"
              hint="Browse listings to see them appear here"
              ctaLabel="Find Jobs"
              ctaHref="/jobs"
            />
          )}
        </WidgetCard>

        {/* Upcoming Interviews */}
        <WidgetCard title="Upcoming Interviews" icon={CalendarClock}>
          {loading ? (
            <ListSkeleton />
          ) : upcomingInterviews.length > 0 ? (
            <ul className="divide-y divide-border">
              {upcomingInterviews.slice(0, 4).map(app => (
                <li key={app.id} className="flex items-center gap-2.5 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquareText className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{app.jobTitle ?? "Interview"}</p>
                    <p className="text-xs text-muted-foreground truncate">{app.companyName ?? "Company"} · {timeAgo(app.updatedAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyMini
              icon={CalendarClock}
              text="No interviews scheduled"
              hint="They'll show up here once an application moves to interview stage"
              ctaLabel="View applications"
              ctaHref="#applications"
            />
          )}
        </WidgetCard>

        {/* Notifications */}
        <WidgetCard title="Notifications" icon={Bell}>
          {loading ? (
            <ListSkeleton />
          ) : notifications.length > 0 ? (
            <ul className="divide-y divide-border">
              {notifications.map(n => (
                <li key={n.id} className="flex items-start gap-2.5 py-2.5">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
                    n.tone === "success" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                    n.tone === "info" && "bg-blue-500/10 border-blue-500/20 text-blue-500",
                    n.tone === "warning" && "bg-amber-500/10 border-amber-500/20 text-amber-500",
                    n.tone === "neutral" && "bg-secondary border-border text-muted-foreground"
                  )}>
                    <n.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.detail}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">{timeAgo(n.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyMini icon={CheckCircle2} text="You're all caught up" hint="New activity on your applications will show up here" />
          )}
        </WidgetCard>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Applications Per Month */}
        <DashCard>
          <h2 className="font-semibold text-foreground mb-1">Applications Per Month</h2>
          <p className="text-xs text-muted-foreground mb-4">Your application activity over the last 6 months</p>
          {loading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : applications.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={applicationsPerMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                <RTooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--popover-border))", borderRadius: 10, fontSize: 12, color: "hsl(var(--popover-foreground))" }}
                />
                <Bar dataKey="count" name="Applications" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyMini icon={TrendingUp} text="Not enough data yet" hint="Apply to jobs to see your activity trend" />
          )}
        </DashCard>

        {/* Interview Success Rate */}
        <DashCard>
          <h2 className="font-semibold text-foreground mb-1">Interview Success Rate</h2>
          <p className="text-xs text-muted-foreground mb-4">Share of applications that reached interview or offer</p>
          {loading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : applications.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={44}
                      outerRadius={62}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {statusBreakdown.map(entry => (
                        <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status] ?? "hsl(var(--muted-foreground))"} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-foreground">{successRate}%</span>
                  <span className="text-[10px] text-muted-foreground">success</span>
                </div>
              </div>
              <ul className="flex-1 space-y-1.5 min-w-0">
                {statusBreakdown.map(entry => (
                  <li key={entry.status} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_CHART_COLORS[entry.status] ?? "hsl(var(--muted-foreground))" }} />
                    <span className="text-muted-foreground flex-1 truncate">{statusLabel(entry.status)}</span>
                    <span className="font-medium text-foreground">{entry.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyMini icon={BadgeCheck} text="Not enough data yet" hint="Your success rate will appear after your first application" />
          )}
        </DashCard>
      </div>

      {/* ── Applications list ── */}
      <div id="applications" className="bg-card border border-border rounded-xl overflow-hidden scroll-mt-20">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Your Applications</h2>
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Browse Jobs <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 bg-secondary rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-secondary rounded w-2/3" />
                  <div className="h-3 bg-secondary rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : applications.length > 0 ? (
          <div className="divide-y divide-border">
            {applications.map(app => (
              <div key={app.id} className="flex items-center gap-3 p-4 hover:bg-secondary/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {app.companyLogo
                    ? <img src={app.companyLogo} alt={app.companyName ?? ""} className="w-full h-full object-contain p-1" />
                    : <span className="text-xs font-bold text-muted-foreground">{getInitials(app.companyName)}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{app.jobTitle ?? "Unknown position"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {app.companyName ?? "Unknown company"} · {timeAgo(app.appliedAt)}
                  </p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0", statusColor(app.status))}>
                  {statusLabel(app.status)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">No applications yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Start applying to jobs that interest you</p>
            <Link href="/jobs">
              <Button size="sm" className="mt-4">Browse Jobs</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Presentational helpers ──────────────────────────────────────────────

function DashCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-xl p-5">{children}</div>;
}

function IconBadge({ icon: Icon, color, bg, className }: { icon: typeof Bell; color: string; bg: string; className?: string }) {
  return (
    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bg, className)}>
      <Icon className={cn("w-5 h-5", color)} />
    </div>
  );
}

function WidgetCard({ title, icon: Icon, children }: { title: string; icon: typeof Bell; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground text-sm">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyMini({
  icon: Icon, text, hint, ctaLabel, ctaHref,
}: {
  icon: typeof Bell; text: string; hint?: string; ctaLabel?: string; ctaHref?: string;
}) {
  return (
    <div className="text-center py-6">
      <Icon className="w-7 h-7 text-muted-foreground/50 mx-auto mb-2" />
      <p className="text-sm font-medium text-foreground">{text}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref}>
          <button className="text-xs font-medium text-primary hover:underline mt-2">{ctaLabel} →</button>
        </Link>
      )}
    </div>
  );
}
