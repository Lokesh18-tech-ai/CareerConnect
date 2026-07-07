import { useState, useMemo } from "react";
import { ShieldCheck, Sparkles, Loader2, CheckCircle2, XCircle, AlignLeft } from "lucide-react";
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

const STOPWORDS = new Set(["the", "and", "a", "to", "of", "in", "for", "with", "on", "is", "as", "at", "by", "an", "be", "or", "our", "we", "you", "your", "will", "are", "this", "that"]);

function extractSignificantWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9+#. ]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
  );
}

export default function ATSCheckerPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!resumeText || !jobDesc) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/ai/analyze-resume`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription: jobDesc }),
      });
      const data = await res.json() as ResumeResult;
      setResult(data);
      notify.success("ATS score generated");
      logAIActivity({
        type: "ats_score", title: "ATS Score Ready",
        description: `Your resume scored ${data.score}/100 for ATS compatibility.`, href: "/ai/ats-checker",
      });
    } catch {
      notify.error("ATS check failed", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Client-side keyword-gap analysis: words present in the job description
  // but not found anywhere in the resume text.
  const { matched, missing, matchPercent } = useMemo(() => {
    if (!resumeText || !jobDesc) return { matched: [] as string[], missing: [] as string[], matchPercent: 0 };
    const jdWords = extractSignificantWords(jobDesc);
    const resumeWords = extractSignificantWords(resumeText);
    const jdList = Array.from(jdWords);
    const matchedList = jdList.filter(w => resumeWords.has(w));
    const missingList = jdList.filter(w => !resumeWords.has(w)).slice(0, 15);
    const pct = jdList.length > 0 ? Math.round((matchedList.length / jdList.length) * 100) : 0;
    return { matched: matchedList.slice(0, 20), missing: missingList, matchPercent: pct };
  }, [resumeText, jobDesc]);

  const formattingChecks = useMemo(() => {
    if (!resumeText) return [];
    const wordCount = resumeText.trim().split(/\s+/).length;
    return [
      { label: "Has an email address", pass: /[\w.+-]+@[\w-]+\.[\w.-]+/.test(resumeText) },
      { label: "Has a phone number", pass: /(\+?\d[\d\s().-]{7,})/.test(resumeText) },
      { label: "Reasonable length (250–1000 words)", pass: wordCount >= 250 && wordCount <= 1000 },
      { label: "Uses bullet-style structure", pass: /[•\-\u2022]/.test(resumeText) || resumeText.split("\n").length > 8 },
    ];
  }, [resumeText]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AIPageHeader
        icon={ShieldCheck}
        title="ATS Checker"
        description="Check how well your resume matches a specific job posting and whether it's likely to pass an ATS filter."
        gradient="from-violet-500 to-purple-500"
      />

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <FileDropzone onExtracted={(text) => setResumeText(text)} />
        <div>
          <Label>Resume Text</Label>
          <Textarea placeholder="Paste your resume text here…" className="mt-1.5 min-h-[140px]" value={resumeText} onChange={e => setResumeText(e.target.value)} />
        </div>
        <div>
          <Label>Job Description <span className="text-destructive text-xs">(required for ATS matching)</span></Label>
          <Textarea placeholder="Paste the target job description…" className="mt-1.5 min-h-[120px]" value={jobDesc} onChange={e => setJobDesc(e.target.value)} />
        </div>
        <Button onClick={check} disabled={!resumeText || !jobDesc || loading} className="gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Checking…</> : <><Sparkles className="w-4 h-4" />Check ATS Compatibility</>}
        </Button>
      </div>

      {result && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-5">
              <ScoreGauge score={result.score} label="AI score" />
              <div>
                <p className="font-semibold text-foreground">AI Compatibility Score</p>
                <p className="text-xs text-muted-foreground mt-1">{result.summary}</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-5">
              <ScoreGauge score={matchPercent} label="keyword match" />
              <div>
                <p className="font-semibold text-foreground">Keyword Match</p>
                <p className="text-xs text-muted-foreground mt-1">{matched.length} of {matched.length + missing.length}+ key terms found in your resume</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h4 className="font-semibold text-foreground mb-3 text-sm flex items-center gap-1.5"><AlignLeft className="w-4 h-4" /> Formatting Analysis</h4>
            <ul className="space-y-2">
              {formattingChecks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-sm">
                  {c.pass ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  <span className={c.pass ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
              <h4 className="font-semibold text-emerald-600 dark:text-emerald-400 mb-2.5 text-sm">Matched Keywords</h4>
              <div className="flex flex-wrap gap-1.5">{matched.map(k => <span key={k} className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full">{k}</span>)}</div>
            </div>
            <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl">
              <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2.5 text-sm">Missing Keywords</h4>
              <div className="flex flex-wrap gap-1.5">{missing.map(k => <span key={k} className="text-xs px-2 py-0.5 bg-red-500/10 text-red-700 dark:text-red-300 rounded-full">{k}</span>)}</div>
            </div>
          </div>

          <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
            <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2 text-sm">↑ Improvement Suggestions</h4>
            <ul className="space-y-1.5">{result.improvements.map((s, i) => <li key={i} className="text-sm text-amber-700 dark:text-amber-300">{s}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}
