import { useState, useEffect } from "react";
import { Users, Briefcase, Building2, FileText, TrendingUp, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";

import API from "@/lib/api";


interface Stats {
  totalUsers: number; totalJobs: number; totalCompanies: number; totalApplications: number;
  newUsersThisMonth: number; newJobsThisMonth: number; activeJobs: number;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/stats`)
      .then(r => r.json())
      .then(d => { setStats(d as Stats); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (!user || user.role !== "admin") {
    return (
      <div className="text-center py-20">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-1">You need admin privileges to view this page.</p>
        <Link href="/"><div className="mt-4 inline-flex text-primary underline cursor-pointer text-sm">Go home</div></Link>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers, sub: `+${stats?.newUsersThisMonth ?? 0} this month`, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Total Jobs", value: stats?.totalJobs, sub: `${stats?.activeJobs ?? 0} active`, icon: Briefcase, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Companies", value: stats?.totalCompanies, sub: "registered", icon: Building2, color: "text-green-500", bg: "bg-green-50" },
    { label: "Applications", value: stats?.totalApplications, sub: "total submitted", icon: FileText, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Platform overview and statistics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-5">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", card.bg)}>
              <card.icon className={cn("w-5 h-5", card.color)} />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "—" : (card.value?.toLocaleString() ?? 0)}
            </div>
            <div className="text-sm font-medium text-foreground mt-0.5">{card.label}</div>
            <div className="text-xs text-muted-foreground">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Platform Health</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: "Active Jobs / Total Jobs", value: stats ? `${stats.activeJobs}/${stats.totalJobs}` : "—", pct: stats ? (stats.activeJobs / Math.max(stats.totalJobs, 1)) * 100 : 0, color: "bg-green-500" },
            { label: "New Users This Month", value: stats?.newUsersThisMonth ?? 0, pct: stats ? Math.min((stats.newUsersThisMonth / Math.max(stats.totalUsers, 1)) * 100, 100) : 0, color: "bg-blue-500" },
            { label: "Jobs Posted This Month", value: stats?.newJobsThisMonth ?? 0, pct: stats ? Math.min((stats.newJobsThisMonth / Math.max(stats.totalJobs, 1)) * 100, 100) : 0, color: "bg-purple-500" },
          ].map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className={cn("h-2 rounded-full transition-all", item.color)} style={{ width: `${Math.max(item.pct, 2)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
