import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CheckCheck, Trash2, Inbox, Send, Eye as EyeIcon, MessageSquare,
  CalendarClock, Award, XCircle, Undo2, Sparkles, Bookmark, AlertTriangle,
  Settings, UserCircle2, Check, ScanSearch, ShieldCheck, Mail, FileText, Save, Map, Mic, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn, timeAgo, getInitials } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { notify } from "@/lib/toast";
import { getReadIds, getDeletedIds, markRead, markAllRead, deleteOne, deleteAll } from "@/lib/notificationsStore";
import { getAIActivity, type AIActivityType } from "@/lib/aiActivityLog";

import API from "@/lib/api";


type Category = "all" | "applications" | "recruiters" | "interviews" | "ai" | "system";

interface AppNotification {
  id: string;
  category: Exclude<Category, "all">;
  icon: typeof Bell;
  tone: "success" | "info" | "warning" | "neutral" | "destructive";
  title: string;
  description: string;
  at: string;
  href?: string;
}

interface Application {
  id: number; jobId: number; status: string; jobTitle?: string | null; companyName?: string | null; appliedAt: string; updatedAt: string;
}
interface SavedJob {
  id: number; jobId: number; jobTitle?: string | null; companyName?: string | null; savedAt: string; postedAt?: string | null;
}

const CATEGORY_LABEL: Record<Category, string> = {
  all: "All", applications: "Applications", recruiters: "Recruiters",
  interviews: "Interviews", ai: "AI Suggestions", system: "System",
};

const TONE_STYLE: Record<AppNotification["tone"], string> = {
  success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
  info: "bg-blue-500/10 border-blue-500/20 text-blue-500",
  warning: "bg-amber-500/10 border-amber-500/20 text-amber-500",
  neutral: "bg-secondary border-border text-muted-foreground",
  destructive: "bg-red-500/10 border-red-500/20 text-red-500",
};

const AI_ACTIVITY_ICON: Record<AIActivityType, typeof Bell> = {
  resume_analyzed: ScanSearch, ats_score: ShieldCheck, cover_letter: Mail, resume_parsed: FileText,
  resume_autosaved: Save, profile_autofilled: UserCircle2, career_roadmap: Map,
  interview_coach: Mic, mock_interview: Target,
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [aiActivity, setAiActivity] = useState(() => getAIActivity());
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("all");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(getReadIds());
    setDeletedIds(getDeletedIds());
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const [apps, saved] = await Promise.all([
          fetch(`${API}/applications?userId=${user.id}`).then(r => r.json()) as Promise<Application[]>,
          fetch(`${API}/saved-jobs?userId=${user.id}`).then(r => r.json()) as Promise<SavedJob[]>,
        ]);
        const savedWithDates = await Promise.all(
          saved.map(async (s) => {
            try {
              const job = await fetch(`${API}/jobs/${s.jobId}`).then(r => r.ok ? r.json() : null);
              return { ...s, postedAt: job?.createdAt ?? null };
            } catch { return s; }
          })
        );
        setApplications(Array.isArray(apps) ? apps : []);
        setSavedJobs(Array.isArray(savedWithDates) ? savedWithDates : []);
      } catch {
        notify.error("Couldn't load notifications", "Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const profileCompletionPct = useMemo(() => {
    if (!user) return 100;
    const checks = [!!user.name, !!user.avatar, !!user.bio, !!user.location, !!user.resumeUrl, !!user.skills];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [user]);

  const notifications = useMemo<AppNotification[]>(() => {
    const items: AppNotification[] = [];

    applications.forEach(app => {
      items.push({
        id: `submit-${app.id}`, category: "applications", icon: Send, tone: "info",
        title: "Application Submitted", description: `You applied to ${app.jobTitle ?? "a role"} at ${app.companyName ?? "a company"}.`,
        at: app.appliedAt, href: `/applications`,
      });
      if (app.status === "reviewing") {
        items.push({ id: `status-${app.id}-reviewing`, category: "applications", icon: EyeIcon, tone: "info", title: "Application Under Review", description: `${app.companyName ?? "The employer"} is reviewing your application for ${app.jobTitle ?? "the role"}.`, at: app.updatedAt, href: "/applications" });
      } else if (app.status === "interview") {
        items.push({ id: `status-${app.id}-interview`, category: "interviews", icon: CalendarClock, tone: "info", title: "Interview Scheduled", description: `You've reached the interview stage for ${app.jobTitle ?? "a role"} at ${app.companyName ?? "a company"}.`, at: app.updatedAt, href: "/applications" });
      } else if (app.status === "offer") {
        items.push({ id: `status-${app.id}-offer`, category: "applications", icon: Award, tone: "success", title: "Offer Received!", description: `Congratulations — ${app.companyName ?? "the employer"} sent you an offer for ${app.jobTitle ?? "the role"}.`, at: app.updatedAt, href: "/applications" });
      } else if (app.status === "rejected") {
        items.push({ id: `status-${app.id}-rejected`, category: "applications", icon: XCircle, tone: "neutral", title: "Application Not Selected", description: `${app.companyName ?? "The employer"} moved forward with other candidates for ${app.jobTitle ?? "the role"}.`, at: app.updatedAt, href: "/applications" });
      } else if (app.status === "withdrawn") {
        items.push({ id: `status-${app.id}-withdrawn`, category: "applications", icon: Undo2, tone: "neutral", title: "Application Withdrawn", description: `You withdrew your application for ${app.jobTitle ?? "the role"}.`, at: app.updatedAt, href: "/applications" });
      }
    });

    savedJobs.forEach(s => {
      items.push({ id: `saved-${s.id}`, category: "system", icon: Bookmark, tone: "neutral", title: "Job Saved", description: `${s.jobTitle ?? "A role"} at ${s.companyName ?? "a company"} was added to your saved jobs.`, at: s.savedAt, href: "/saved-jobs" });
      if (s.postedAt) {
        const deadline = new Date(s.postedAt).getTime() + 30 * 86400000;
        const hoursLeft = (deadline - Date.now()) / 3600000;
        if (hoursLeft > 0 && hoursLeft < 48) {
          items.push({ id: `expiring-${s.id}`, category: "system", icon: AlertTriangle, tone: "warning", title: "Saved Job Expiring Soon", description: `The estimated application window for ${s.jobTitle ?? "a saved job"} closes soon.`, at: new Date().toISOString(), href: "/saved-jobs" });
        }
      }
    });

    if (profileCompletionPct < 100) {
      items.push({ id: "profile-completion", category: "system", icon: UserCircle2, tone: "warning", title: "Complete Your Profile", description: `Your profile is ${profileCompletionPct}% complete. A fuller profile gets more recruiter attention.`, at: new Date().toISOString(), href: "/profile" });
    }

    aiActivity.forEach(a => {
      items.push({
        id: a.id, category: "ai", icon: AI_ACTIVITY_ICON[a.type] ?? Sparkles, tone: "success",
        title: a.title, description: a.description, at: a.at, href: a.href,
      });
    });

    return items
      .filter(n => !deletedIds.has(n.id))
      .sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [applications, savedJobs, aiActivity, profileCompletionPct, deletedIds]);

  const filtered = category === "all" ? notifications : notifications.filter(n => n.category === category);

  const counts = useMemo(() => ({
    unread: notifications.filter(n => !readIds.has(n.id)).length,
    applications: notifications.filter(n => n.category === "applications").length,
    interviews: notifications.filter(n => n.category === "interviews").length,
    recruiters: notifications.filter(n => n.category === "recruiters").length,
    system: notifications.filter(n => n.category === "system").length,
  }), [notifications, readIds]);

  const handleMarkRead = useCallback((id: string) => {
    markRead(id);
    setReadIds(getReadIds());
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteOne(id);
    setDeletedIds(getDeletedIds());
    notify.success("Notification deleted");
  }, []);

  const handleMarkAllRead = () => {
    markAllRead(notifications.map(n => n.id));
    setReadIds(getReadIds());
    notify.success("All notifications marked as read");
  };

  const handleClearAll = () => {
    deleteAll(filtered.map(n => n.id));
    setDeletedIds(getDeletedIds());
    notify.success("Notifications cleared");
  };

  const cards = [
    { label: "Unread", value: counts.unread, icon: Bell, color: "text-primary", bg: "bg-primary/10" },
    { label: "Applications", value: counts.applications, icon: Send, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Interviews", value: counts.interviews, icon: CalendarClock, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Recruiter Messages", value: counts.recruiters, icon: MessageSquare, color: "text-pink-500", bg: "bg-pink-500/10" },
    { label: "System", value: counts.system, icon: Settings, color: "text-muted-foreground", bg: "bg-muted" },
  ];

  if (!user) {
    return <div className="text-center py-20"><p>Please <Link href="/login"><span className="text-primary underline cursor-pointer">sign in</span></Link> to view your notifications.</p></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Bell className="w-6 h-6 text-primary" /> Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay on top of every update to your job search</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleMarkAllRead} disabled={notifications.length === 0}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" disabled={filtered.length === 0}>
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes {filtered.length} notification{filtered.length === 1 ? "" : "s"} {category !== "all" ? `in "${CATEGORY_LABEL[category]}"` : ""} from this list. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Clear</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {loading ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", c.bg)}><c.icon className={cn("w-4 h-4", c.color)} /></div>
            <div className="text-xl font-bold text-foreground">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-5 bg-muted/50 border border-border rounded-xl p-1 w-fit">
        {(Object.keys(CATEGORY_LABEL) as Category[]).map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={cn("px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors", category === cat ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyNotifications hasAny={notifications.length > 0} />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence>
            {filtered.map(n => {
              const unread = !readIds.has(n.id);
              return (
                <motion.div key={n.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                  className={cn("flex items-start gap-3 p-4 rounded-2xl border transition-colors", unread ? "bg-primary/[0.03] border-primary/15" : "bg-card border-border")}>
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border", TONE_STYLE[n.tone])}>
                    <n.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {unread && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                      <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">{timeAgo(n.at)}</span>
                      {n.href && (
                        <Link href={n.href}>
                          <button onClick={() => handleMarkRead(n.id)} className="text-xs font-medium text-primary hover:underline">View</button>
                        </Link>
                      )}
                      {unread && (
                        <button onClick={() => handleMarkRead(n.id)} className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                          <Check className="w-3 h-3" /> Mark as read
                        </button>
                      )}
                      <button onClick={() => handleDelete(n.id)} className="text-xs font-medium text-muted-foreground hover:text-destructive ml-auto flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function EmptyNotifications({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center">
      <Inbox className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
      <h3 className="font-semibold text-foreground">{hasAny ? "Nothing here" : "You're all caught up"}</h3>
      <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
        {hasAny ? "No notifications in this category right now." : "New activity on your applications, saved jobs, and profile will show up here."}
      </p>
    </div>
  );
}
