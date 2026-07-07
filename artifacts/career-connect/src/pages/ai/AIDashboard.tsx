import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Sparkles, FileText, ScanSearch, ShieldCheck, Mail, Map, Mic, Target, ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ToolCard {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
}

const TOOLS: ToolCard[] = [
  {
    href: "/ai/resume-builder",
    icon: FileText,
    title: "Resume Builder",
    description: "Build an ATS-friendly resume with live preview and export.",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    href: "/ai/resume-analyzer",
    icon: ScanSearch,
    title: "Resume Analyzer",
    description: "Get an AI-powered score, strengths, and improvement tips.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    href: "/ai/ats-checker",
    icon: ShieldCheck,
    title: "ATS Checker",
    description: "Check formatting and keyword match against a job posting.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    href: "/ai/cover-letter",
    icon: Mail,
    title: "Cover Letter Generator",
    description: "Generate a personalized cover letter in seconds.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    href: "/ai/career-roadmap",
    icon: Map,
    title: "Career Roadmap",
    description: "Get a personalized learning path toward your target role.",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    href: "/ai/interview-coach",
    icon: Mic,
    title: "Interview Coach",
    description: "Practice role-specific questions with expert answer tips.",
    gradient: "from-rose-500 to-pink-500",
  },
  {
    href: "/ai/mock-interview",
    icon: Target,
    title: "Mock Interview",
    description: "A timed, interactive interview simulation with a final report.",
    gradient: "from-fuchsia-500 to-purple-500",
  },
];

export default function AIDashboardPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <div className="inline-flex items-center gap-2 border border-primary/20 bg-primary/5 rounded-full px-4 py-1.5 text-xs font-medium text-primary mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Your AI-powered career workspace
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
          AI Career Tools
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Everything you need to land your next role — resume, cover letters, interview practice,
          and a career roadmap, all powered by AI.
        </p>
      </motion.div>

      {/* Card grid: 1 / 2 / 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TOOLS.map((tool, i) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.href}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="h-full"
            >
              <Link href={tool.href}>
                <div className="group relative h-full flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden">
                  {/* Soft gradient wash on hover */}
                  <div className={`pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-300`} />

                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${tool.gradient} shadow-sm mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="font-semibold text-foreground text-base mb-1.5">{tool.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">{tool.description}</p>

                  <div className="flex items-center gap-1.5 text-sm font-medium text-primary mt-4 opacity-80 group-hover:opacity-100 group-hover:gap-2.5 transition-all duration-200">
                    Launch <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
