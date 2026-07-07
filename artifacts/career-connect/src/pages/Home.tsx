import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Search, MapPin, ArrowRight, Sparkles, Star,
  FileText, ClipboardCheck, MessageSquare, Map, Shuffle, Mail,
  ChevronRight, Users, Briefcase, Building2, TrendingUp, UploadCloud
} from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { cleanSalary } from "@/lib/utils";

import API from "@/lib/api";


interface Job { id: number; title: string; companyName?: string | null; companyLogo?: string | null; location: string; type: string; level: string; salary?: string | null; featured: boolean; createdAt: string; }
interface Company { id: number; name: string; logo?: string | null; industry?: string | null; location?: string | null; openPositions?: number | null; rating?: number | null; }

const TRENDING = ["Software Engineer", "Product Manager", "Data Scientist", "Remote", "UX Designer", "DevOps"];

const AI_TOOLS = [
  { icon: FileText, title: "Resume Analyzer", desc: "Get AI feedback to improve your resume score and stand out.", href: "/ai/resume-analyzer", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { icon: ClipboardCheck, title: "ATS Score Checker", desc: "See how well your resume passes applicant tracking systems.", href: "/ai/ats-checker", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { icon: MessageSquare, title: "Interview Coach", desc: "Practice with role-specific questions and expert tips.", href: "/ai/interview-coach", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { icon: Map, title: "Career Roadmap", desc: "Get a personalized plan to reach your career goals faster.", href: "/ai/career-roadmap", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  { icon: Shuffle, title: "Job Matching", desc: "AI matches you to the best-fit roles based on your profile.", href: "/jobs", color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
  { icon: Mail, title: "Cover Letter AI", desc: "Generate tailored cover letters for any job in seconds.", href: "/ai/cover-letter", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
];

const COMPANY_LOGOS = ["Google", "Microsoft", "Amazon", "Airbnb", "IBM", "Salesforce", "Shopify", "Meta"];

const STEPS = [
  { num: "01", title: "Create your profile", desc: "Build a standout profile that showcases your skills, experience, and career goals to top employers." },
  { num: "02", title: "Discover opportunities", desc: "Browse thousands of curated jobs matched to your profile. Use AI tools to find the perfect fit faster." },
  { num: "03", title: "Get hired faster", desc: "Apply with confidence. Track applications, prep for interviews, and land your dream role." },
];

function typeColor(type: string) {
  switch (type) {
    case "full-time": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "part-time": return "bg-teal-500/10 text-teal-400 border-teal-500/20";
    case "contract": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "internship": return "bg-pink-500/10 text-pink-400 border-pink-500/20";
    default: return "bg-white/5 text-white/60 border-white/10";
  }
}
function levelColor(level: string) {
  switch (level) {
    case "entry": return "bg-green-500/10 text-green-400 border-green-500/20";
    case "mid": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "senior": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "lead": return "bg-red-500/10 text-red-400 border-red-500/20";
    default: return "bg-white/5 text-white/60 border-white/10";
  }
}
function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [topCompanies, setTopCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState({ totalJobs: 0, totalCompanies: 0, totalUsers: 0 });

  useEffect(() => {
    fetch(`${API}/jobs/featured?limit=6`).then(r => r.json()).then(d => setFeaturedJobs(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/companies/top?limit=6`).then(r => r.json()).then(d => setTopCompanies(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/stats`).then(r => r.json()).then(d => setStats({ totalJobs: d.totalJobs ?? 0, totalCompanies: d.totalCompanies ?? 0, totalUsers: d.totalUsers ?? 0 })).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (locationSearch) params.set("location", locationSearch);
    setLocation(`/jobs?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Animated gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[120px] opacity-40 animate-blob" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[300px] bg-blue-600/15 rounded-full blur-[100px] opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute bottom-0 left-1/4 w-[350px] h-[250px] bg-purple-500/10 rounded-full blur-[100px] opacity-20 animate-blob animation-delay-4000" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16 pb-20 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 border border-white/10 bg-white/5 rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-8 backdrop-blur-sm"
          >
            <Sparkles className="w-3 h-3 text-primary" />
            AI-Powered · {stats.totalJobs > 0 ? `${stats.totalJobs.toLocaleString()}+` : "50,000+"} Live Jobs
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.05] mb-5"
          >
            The career platform for<br />
            <span className="text-gradient-blue">ambitious professionals.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Discover world-class opportunities, track your applications with precision, and land your dream role faster with AI.
          </motion.p>

          {/* Search bar */}
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row items-stretch gap-0 bg-white/5 border border-white/12 rounded-xl p-1.5 backdrop-blur-sm shadow-lg shadow-black/5 focus-within:ring-4 focus-within:ring-primary/15 transition-all">
              <div className="flex-1 flex items-center gap-2 bg-card rounded-lg px-4 py-3">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Job title, skills, or company"
                  className="flex-1 text-foreground text-sm outline-none bg-transparent placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex-1 flex items-center gap-2 bg-card rounded-lg px-4 py-3 sm:ml-1 mt-1 sm:mt-0">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  value={locationSearch}
                  onChange={e => setLocationSearch(e.target.value)}
                  placeholder="City, state, or remote"
                  className="flex-1 text-foreground text-sm outline-none bg-transparent placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="submit"
                className="sm:ml-1 mt-1 sm:mt-0 bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-lg transition-all text-sm whitespace-nowrap hover:shadow-md hover:-translate-y-px active:translate-y-0"
              >
                Search Jobs
              </button>
            </div>

            {/* Trending */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <span className="text-xs text-muted-foreground">Trending:</span>
              {TRENDING.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setSearch(t); setLocation(`/jobs?search=${encodeURIComponent(t)}`); }}
                  className="text-xs px-3 py-1 rounded-full border border-white/12 bg-white/5 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/10 transition-all"
                >
                  {t}
                </button>
              ))}
            </div>

            {/* CTA row */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <Link href="/login?tab=register">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-px active:translate-y-0">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/ai/resume-builder">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 text-foreground text-sm font-semibold backdrop-blur-sm transition-all hover:-translate-y-px active:translate-y-0">
                  <UploadCloud className="w-4 h-4" /> Upload Resume
                </button>
              </Link>
            </div>
          </motion.form>
        </div>
      </section>

      {/* ── TRUSTED BY ── */}
      <section className="border-y border-white/6 bg-white/2 py-10 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 text-center mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Trusted by 100+ world-class companies</p>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-background to-transparent z-10" />
          <div className="flex w-max animate-marquee">
            {[...COMPANY_LOGOS, ...COMPANY_LOGOS].map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="group flex items-center gap-2.5 mx-3 px-4 py-2.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-primary/30 transition-all cursor-default flex-shrink-0"
              >
                <div className="w-7 h-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/50 group-hover:text-primary group-hover:border-primary/30 transition-colors">
                  {getInitials(name)}
                </div>
                <span className="text-sm font-semibold text-white/30 group-hover:text-white/70 transition-colors tracking-wide whitespace-nowrap">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-10">Powering careers at scale</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: Math.max(stats.totalJobs, 50000), label: "Live Jobs", suffix: "+" },
              { value: Math.max(stats.totalCompanies, 1200), label: "Companies", suffix: "+" },
              { value: 100000, label: "Professionals", suffix: "+" },
              { value: 95, label: "Success Rate", suffix: "%" },
            ].map(stat => (
              <div key={stat.label} className="p-6 rounded-2xl border border-white/6 bg-white/3 hover:bg-white/5 hover:-translate-y-0.5 transition-all">
                <div className="text-3xl sm:text-4xl font-extrabold text-foreground mb-1">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED OPPORTUNITIES ── */}
      <section className="py-12 border-t border-white/6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Featured Opportunities</h2>
              <p className="text-muted-foreground text-sm mt-1">Hand-picked roles from top-tier companies</p>
            </div>
            <Link href="/jobs">
              <button className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          {featuredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredJobs.map(job => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className="group relative bg-card border border-white/8 rounded-xl p-5 cursor-pointer hover:border-primary/40 hover:bg-white/5 transition-all duration-200">
                    {job.featured && (
                      <div className="absolute top-3 right-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 font-medium">Featured</span>
                      </div>
                    )}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-sm font-bold text-white/60 flex-shrink-0">
                        {getInitials(job.companyName)}
                      </div>
                      <div className="min-w-0 flex-1 pr-12">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate text-sm">{job.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{job.companyName ?? "Company"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeColor(job.type)}`}>{job.type.replace("-", " ")}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${levelColor(job.level)}`}>{job.level}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                      {job.salary && <span className="font-medium text-foreground/70">{cleanSalary(job.salary)}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-white/6 rounded-2xl text-muted-foreground text-sm">
              No featured jobs available right now.{" "}
              <Link href="/jobs"><span className="text-primary hover:underline cursor-pointer">Browse all jobs →</span></Link>
            </div>
          )}
        </div>
      </section>

      {/* ── SUPERCHARGE WITH AI ── */}
      <section className="py-16 border-t border-white/6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 border border-primary/25 bg-primary/10 rounded-full px-4 py-1.5 text-xs text-primary font-medium mb-6">
            <Sparkles className="w-3 h-3" /> AI-Powered Tools
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">Supercharge your job search with AI</h2>
          <p className="text-muted-foreground mb-12 max-w-xl mx-auto">
            CareerConnect AI let's your work smarter — Personalized career accelerators to success.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {AI_TOOLS.map(tool => (
              <Link key={tool.title} href={tool.href}>
                <div className={`group p-5 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02] ${tool.bg} hover:brightness-110`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-white/10`}>
                    <tool.icon className={`w-5 h-5 ${tool.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{tool.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tool.desc}</p>
                  <div className={`flex items-center gap-1 mt-4 text-xs font-medium ${tool.color}`}>
                    Try it <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 border-t border-white/6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-3">Land your dream job in 3 steps</h2>
          <p className="text-muted-foreground mb-12">The fastest path from job seeker to hired.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative p-6 rounded-2xl border border-white/8 bg-white/3 text-left hover:bg-white/5 transition-colors">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 -right-3 w-6 h-px bg-gradient-to-r from-primary/40 to-transparent z-10" />
                )}
                <div className="text-4xl font-extrabold text-primary/20 mb-4 font-mono">{step.num}</div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOP COMPANIES ── */}
      {topCompanies.length > 0 && (
        <section className="py-16 border-t border-white/6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Top Hiring Companies</h2>
                <p className="text-muted-foreground text-sm mt-1">Find your next opportunity at world-class organizations</p>
              </div>
              <Link href="/companies">
                <button className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                  Explore all <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {topCompanies.map(co => (
                <Link key={co.id} href={`/companies/${co.id}`}>
                  <div className="group p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-primary/30 transition-all cursor-pointer text-center">
                    <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-sm font-bold text-white/60 mx-auto mb-3">
                      {getInitials(co.name)}
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">{co.name}</p>
                    {co.industry && <p className="text-xs text-muted-foreground mt-0.5 truncate">{co.industry}</p>}
                    {co.openPositions != null && co.openPositions > 0 && (
                      <p className="text-xs text-primary mt-1.5 font-medium">{co.openPositions} open</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-16 border-t border-white/6">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="relative rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-blue-600/10 to-transparent p-12 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] opacity-50" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">Ready to make your next move?</h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join thousands of professionals finding their dream roles on CareerConnect. Create your profile in minutes.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/login?tab=register">
                  <button className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors text-sm">
                    Create a free profile
                  </button>
                </Link>
                <Link href="/jobs">
                  <button className="px-6 py-3 bg-white/8 hover:bg-white/12 text-foreground font-semibold rounded-xl transition-colors text-sm border border-white/12">
                    Find Jobs
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/6 bg-black/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-foreground">CareerConnect</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">The AI-powered platform for ambitious professionals to discover, apply, and land their dream roles.</p>
            </div>

            {/* Links */}
            {[
              { title: "Job Seekers", links: ["Find Jobs", "Browse Companies", "AI Tools", "Resume Builder", "Interview Prep"] },
              { title: "AI Tools", links: ["Resume Analyzer", "Cover Letter AI", "Career Coach", "ATS Checker", "Job Matching"] },
              { title: "Employers", links: ["Post a Job", "Recruiter Dashboard", "Browse Talent", "Pricing", "Enterprise"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Privacy", "Terms"] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}>
                      <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{link}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">© 2026 CareerConnect. All rights reserved.</p>
            <div className="flex gap-5 text-xs text-muted-foreground">
              <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-foreground cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-foreground cursor-pointer transition-colors">Cookies</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
