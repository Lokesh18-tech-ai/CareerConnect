import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Briefcase, Users, Clock, Plus, Eye, ChevronRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, statusColor, statusLabel, timeAgo, getInitials } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

import API from "@/lib/api";


interface Application {
  id: number; jobId: number; userId: number; status: string;
  jobTitle?: string | null; companyName?: string | null; companyLogo?: string | null;
  applicantName?: string | null; applicantEmail?: string | null;
  appliedAt: string; updatedAt: string;
}

interface Job { id: number; title: string; location: string; type: string; level: string; active: boolean; }
interface Company { id: number; name: string; }

export default function RecruiterDashboardPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState({ postedJobCount: 0, totalApplicationsReceived: 0, pendingReviewCount: 0 });
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [form, setForm] = useState({ title: "", companyId: "", location: "", type: "full-time", level: "mid", description: "", requirements: "", salary: "" });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(`${API}/recruiter/dashboard?userId=${user.id}`).then(r => r.json()),
      fetch(`${API}/jobs?postedById=${user.id}&limit=20`).then(r => r.json()),
      fetch(`${API}/companies`).then(r => r.json()),
    ]).then(([dash, jobData, cos]) => {
      const d = dash as typeof stats & { recentApplications?: Application[] };
      setStats({ postedJobCount: d.postedJobCount ?? 0, totalApplicationsReceived: d.totalApplicationsReceived ?? 0, pendingReviewCount: d.pendingReviewCount ?? 0 });
      setApplications(Array.isArray(d.recentApplications) ? d.recentApplications : []);
      setJobs(Array.isArray((jobData as { jobs: Job[] }).jobs) ? (jobData as { jobs: Job[] }).jobs : []);
      setCompanies(Array.isArray(cos) ? cos as Company[] : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const handleUpdateStatus = async (appId: number, status: string) => {
    if (!token) return;
    await fetch(`${API}/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({ status }),
    });
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token || !form.companyId) return;
    setPosting(true);
    const res = await fetch(`${API}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({ ...form, companyId: parseInt(form.companyId, 10), postedById: user.id }),
    });
    if (res.ok) {
      const job = await res.json() as Job;
      setJobs(prev => [job, ...prev]);
      setStats(s => ({ ...s, postedJobCount: s.postedJobCount + 1 }));
      setPostOpen(false);
      setForm({ title: "", companyId: "", location: "", type: "full-time", level: "mid", description: "", requirements: "", salary: "" });
    }
    setPosting(false);
  };

  if (!user) return <div className="text-center py-20"><p>Please <Link href="/login"><span className="text-primary underline cursor-pointer">sign in</span></Link>.</p></div>;

  const statCards = [
    { label: "Jobs Posted", value: stats.postedJobCount, icon: Briefcase, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Total Applicants", value: stats.totalApplicationsReceived, icon: Users, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Pending Review", value: stats.pendingReviewCount, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recruiter Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your job postings and applicants</p>
        </div>
        <Button onClick={() => setPostOpen(true)} className="gap-2" data-testid="button-post-job">
          <Plus className="w-4 h-4" /> Post a Job
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-5">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", card.bg)}>
              <card.icon className={cn("w-5 h-5", card.color)} />
            </div>
            <div className="text-2xl font-bold text-foreground">{loading ? "—" : card.value}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Recent Applications</h2>
        </div>
        {applications.length > 0 ? (
          <div className="divide-y divide-border">
            {applications.map(app => (
              <div key={app.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-secondary/40 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">{getInitials(app.applicantName)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm">{app.applicantName ?? "Applicant"}</p>
                    <p className="text-xs text-muted-foreground">{app.jobTitle} · {timeAgo(app.appliedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", statusColor(app.status))}>
                    {statusLabel(app.status)}
                  </span>
                  <Select value={app.status} onValueChange={v => handleUpdateStatus(app.id, v)}>
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Applied</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="offer">Offer</SelectItem>
                      <SelectItem value="rejected">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground text-sm">No applications yet</div>
        )}
      </div>

      {/* Posted Jobs */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Your Job Postings</h2>
        </div>
        {jobs.length > 0 ? (
          <div className="divide-y divide-border">
            {jobs.map(job => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <div className="flex items-center gap-3 p-4 hover:bg-secondary/40 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.location} · {job.type} · {job.level}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", job.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200")}>
                    {job.active ? "Active" : "Closed"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No jobs posted yet. <button onClick={() => setPostOpen(true)} className="text-primary hover:underline">Post your first job</button>
          </div>
        )}
      </div>

      {/* Post Job Dialog */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Post a New Job</DialogTitle></DialogHeader>
          <form onSubmit={handlePostJob} className="space-y-4">
            <div>
              <Label>Job Title</Label>
              <Input className="mt-1.5" placeholder="Senior Software Engineer" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>Company</Label>
              <select className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}>
                <option value="">Select a company</option>
                {companies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Location</Label>
                <Input className="mt-1.5" placeholder="San Francisco, CA" required value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div>
                <Label>Salary (optional)</Label>
                <Input className="mt-1.5" placeholder="$100k - $140k" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <select className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div>
                <Label>Level</Label>
                <select className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                  <option value="entry">Entry</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1.5 min-h-[100px]" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Requirements <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea className="mt-1.5 min-h-[80px]" value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPostOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={posting}>{posting ? "Posting..." : "Post Job"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
