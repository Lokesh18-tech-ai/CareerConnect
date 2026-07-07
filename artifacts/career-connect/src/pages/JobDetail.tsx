import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { MapPin, Briefcase, Clock, DollarSign, Building2, ArrowLeft, Bookmark, BookmarkCheck, Send, Star } from "lucide-react";
import { cn, typeColor, levelColor, timeAgo, getInitials, cleanSalary } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import JobApplicationWizard from "@/components/JobApplicationWizard";

import API from "@/lib/api";


interface Job {
  id: number; title: string; companyId: number; companyName?: string | null; companyLogo?: string | null;
  location: string; type: string; level: string; description: string; requirements?: string | null;
  salary?: string | null; featured: boolean; active: boolean; postedById?: number | null; createdAt: string;
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", className)}>{children}</span>;
}

export default function JobDetailPage() {
  const [, params] = useRoute("/jobs/:id");
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const id = parseInt(params?.id ?? "0", 10);

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/jobs/${id}`).then(r => r.json()).then(d => { setJob(d as Job); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/saved-jobs?userId=${user.id}`).then(r => r.json())
      .then((d: Array<{ jobId: number }>) => setIsSaved(Array.isArray(d) && d.some(s => s.jobId === id))).catch(() => {});
    fetch(`${API}/applications?userId=${user.id}&jobId=${id}`).then(r => r.json())
      .then((d: unknown[]) => setHasApplied(Array.isArray(d) && d.length > 0)).catch(() => {});
  }, [user, id]);

  const handleSave = async () => {
    if (!user || !token) { setLocation("/login"); return; }
    if (isSaved) {
      await fetch(`${API}/saved-jobs/${id}`, { method: "DELETE", headers: { Authorization: token } });
      setIsSaved(false);
    } else {
      await fetch(`${API}/saved-jobs`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: token }, body: JSON.stringify({ jobId: id, userId: user.id }) });
      setIsSaved(true);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
      <div className="h-8 bg-white/8 rounded w-1/2" />
      <div className="h-4 bg-white/8 rounded w-1/3" />
      <div className="h-40 bg-white/8 rounded" />
    </div>
  );

  if (!job) return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-center">
      <h2 className="text-xl font-semibold text-foreground">Job not found</h2>
      <Link href="/jobs"><button className="mt-4 px-4 py-2 border border-white/10 rounded-lg text-sm text-foreground hover:bg-white/8 transition-colors">Back to Jobs</button></Link>
    </div>
  );

  const tc = typeColor(job.type);
  const lc = levelColor(job.level);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/jobs">
        <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </button>
      </Link>

      <div className="bg-card border border-white/8 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/8">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center text-xl font-bold text-white/60 flex-shrink-0">
              {job.companyLogo
                ? <img src={job.companyLogo} alt={job.companyName ?? ""} className="w-full h-full object-contain p-2" />
                : getInitials(job.companyName)
              }
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-job-title">{job.title}</h1>
              <Link href={`/companies/${job.companyId}`}>
                <p className="text-primary hover:underline cursor-pointer font-medium mt-1 flex items-center gap-1 text-sm">
                  <Building2 className="w-4 h-4" />{job.companyName ?? "Unknown Company"}
                </p>
              </Link>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className={tc}>{job.type.replace("-", " ")}</Badge>
                <Badge className={lc}>{job.level}</Badge>
                {job.featured && <Badge className="bg-primary/15 text-primary border-primary/25">Featured</Badge>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{job.location}</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />{timeAgo(job.createdAt)}</div>
            {job.salary && <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" />{cleanSalary(job.salary)}</div>}
          </div>

          <div className="flex gap-3 mt-6">
            {hasApplied ? (
              <button disabled className="flex items-center gap-2 px-5 py-2.5 bg-green-500/15 text-green-400 border border-green-500/25 rounded-xl text-sm font-semibold">
                <Send className="w-4 h-4" /> Applied
              </button>
            ) : (
              <button onClick={() => setApplyOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-colors" data-testid="button-apply">
                <Send className="w-4 h-4" /> Apply Now
              </button>
            )}
            {user?.role !== "recruiter" && (
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2.5 border border-white/10 hover:bg-white/8 text-foreground rounded-xl text-sm font-medium transition-colors" data-testid="button-save-job">
                {isSaved ? <><BookmarkCheck className="w-4 h-4 text-primary" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save</>}
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">About This Role</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">{job.description}</p>
          </div>
          {job.requirements && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Requirements</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">{job.requirements}</p>
            </div>
          )}
        </div>
      </div>

      {job && (
        <JobApplicationWizard
          job={{ id: job.id, title: job.title, companyName: job.companyName, location: job.location, type: job.type }}
          open={applyOpen}
          onOpenChange={setApplyOpen}
          onSuccess={() => setHasApplied(true)}
        />
      )}
    </div>
  );
}
