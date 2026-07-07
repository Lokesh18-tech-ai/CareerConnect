import { useState } from "react";
import { ScanSearch, Sparkles, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell } from "recharts";
import { AIPageHeader } from "@/components/ai/AIPageHeader";
import { FileDropzone } from "@/components/ai/FileDropzone";
import { ScoreGauge } from "@/components/ai/ScoreGauge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { logAIActivity } from "@/lib/aiActivityLog";
import { notify } from "@/lib/toast";

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

interface ResumeResult { score: number; strengths: string[]; improvements: string[]; keywords: string[]; summary: string; }

export default function ResumeAnalyzerPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!resumeText) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/ai/analyze-resume`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription: jobDesc }),
      });
      const data = await res.json() as ResumeResult;
      setResult(data);
      notify.success("Resume analyzed successfully");
      logAIActivity({
        type: "resume_analyzed", title: "Resume Analysis Completed",
        description: `Your resume scored ${data.score}/100.`, href: "/ai/resume-analyzer",
      });
    } catch {
      notify.error("Resume analysis failed", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result ? [
    { name: "Score", value: result.score, fill: result.score >= 80 ? "hsl(var(--chart-2))" : result.score >= 60 ? "hsl(var(--chart-3))" : "hsl(var(--destructive))" },
    { name: "Strengths", value: result.strengths.length * 20, fill: "hsl(var(--chart-1))" },
    { name: "Keywords", value: Math.min(result.keywords.length * 12, 100), fill: "hsl(var(--chart-4))" },
  ] : [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AIPageHeader
        icon={ScanSearch}
        title="Resume Analyzer"
        description="Upload or paste your resume to get an AI-powered score, strengths, and improvement tips."
        gradient="from-emerald-500 to-teal-500"
      />

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <FileDropzone onExtracted={(text) => setResumeText(text)} />

        <div>
          <Label>Resume Text</Label>
          <Textarea placeholder="Paste your resume text here…" className="mt-1.5 min-h-[160px]" value={resumeText} onChange={e => setResumeText(e.target.value)} />
        </div>
        <div>
          <Label>Job Description <span className="text-muted-foreground text-xs">(optional — for targeted analysis)</span></Label>
          <Textarea placeholder="Paste the job description…" className="mt-1.5 min-h-[100px]" value={jobDesc} onChange={e => setJobDesc(e.target.value)} />
        </div>
        <Button onClick={analyze} disabled={!resumeText || loading} className="gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing…</> : <><Sparkles className="w-4 h-4" />Analyze Resume</>}
        </Button>
      </div>

      {result && (
        <div className="mt-6 space-y-5">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={result.score} label="/ 100" size={110} />
            <div>
              <p className="font-semibold text-foreground text-lg">Overall Resume Score</p>
              <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Score Breakdown</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                <RTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--popover-border))", borderRadius: 10, fontSize: 12 }} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
              <h4 className="font-semibold text-emerald-600 dark:text-emerald-400 mb-2 text-sm">✓ Strengths</h4>
              <ul className="space-y-1.5">{result.strengths.map((s, i) => <li key={i} className="text-sm text-emerald-700 dark:text-emerald-300">{s}</li>)}</ul>
            </div>
            <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
              <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2 text-sm">↑ Improvement Tips</h4>
              <ul className="space-y-1.5">{result.improvements.map((s, i) => <li key={i} className="text-sm text-amber-700 dark:text-amber-300">{s}</li>)}</ul>
            </div>
          </div>

          <div className="p-5 bg-card border border-border rounded-2xl">
            <h4 className="font-semibold text-foreground mb-2.5 text-sm">Keywords Found</h4>
            <div className="flex flex-wrap gap-2">
              {result.keywords.map((kw, i) => <span key={i} className="text-xs px-2.5 py-1 bg-secondary rounded-full text-foreground">{kw}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
