import { useState, useMemo } from "react";
import { Mic, Sparkles, Loader2, ChevronDown, ChevronUp, Lightbulb, TrendingUp } from "lucide-react";
import { AIPageHeader } from "@/components/ai/AIPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { logAIActivity } from "@/lib/aiActivityLog";
import { notify } from "@/lib/toast";

import API from "@/lib/api";


interface InterviewQ { question: string; tips: string; category: string; }

const LEVELS = ["Entry", "Mid", "Senior"];

const categoryColor = (cat: string) => {
  switch (cat) {
    case "behavioral": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "technical": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "situational": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    default: return "bg-secondary text-muted-foreground border-border";
  }
};

export default function InterviewCoachPage() {
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [level, setLevel] = useState("Mid");
  const [questions, setQuestions] = useState<InterviewQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [practiced, setPracticed] = useState<Set<number>>(new Set());

  const generate = async () => {
    if (!jobTitle || !industry) return;
    setLoading(true); setQuestions([]); setPracticed(new Set()); setNotes({});
    try {
      const res = await fetch(`${API}/ai/interview-prep`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, industry, level }),
      });
      const data = await res.json() as { questions: InterviewQ[] };
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      notify.success("Interview questions ready");
      logAIActivity({
        type: "interview_coach", title: "Interview Coach Ready",
        description: `${(data.questions ?? []).length} ${jobTitle} questions generated for practice.`, href: "/ai/interview-coach",
      });
    } catch {
      notify.error("Couldn't generate questions", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const progress = questions.length > 0 ? Math.round((practiced.size / questions.length) * 100) : 0;

  const improvementSuggestions = useMemo(() => {
    const unpracticed = questions.filter((_, i) => !practiced.has(i));
    if (questions.length === 0) return [];
    if (unpracticed.length === 0) return ["Great work — you've practiced every question. Try a Mock Interview for a timed, scored simulation."];
    const categories = Array.from(new Set(unpracticed.map(q => q.category)));
    return [`You still have ${unpracticed.length} question${unpracticed.length > 1 ? "s" : ""} to practice, covering: ${categories.join(", ")}.`];
  }, [questions, practiced]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AIPageHeader
        icon={Mic}
        title="Interview Coach"
        description="Get role-specific interview questions with expert tips, and track your practice."
        gradient="from-rose-500 to-pink-500"
      />

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Job Title / Role</Label>
            <Input className="mt-1.5" placeholder="Software Engineer" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
          </div>
          <div>
            <Label>Industry</Label>
            <Input className="mt-1.5" placeholder="Technology" value={industry} onChange={e => setIndustry(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Difficulty Level</Label>
          <div className="flex gap-2 mt-1.5">
            {LEVELS.map(l => (
              <button key={l} onClick={() => setLevel(l)} className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors", level === l ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={generate} disabled={!jobTitle || !industry || loading} className="gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</> : <><Sparkles className="w-4 h-4" />Generate Questions</>}
        </Button>
      </div>

      {questions.length > 0 && (
        <div className="mt-6 space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-primary" /> Practice Progress</p>
              <span className="text-sm font-bold text-foreground">{progress}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {improvementSuggestions.map((s, i) => <p key={i} className="text-xs text-muted-foreground mt-2.5">{s}</p>)}
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="border border-border rounded-2xl overflow-hidden bg-card">
                <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/40 transition-colors">
                  <div className="flex items-start gap-3 flex-1">
                    <span className={cn("w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5", practiced.has(i) ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground")}>
                      {practiced.has(i) ? "✓" : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{q.question}</p>
                      <span className={cn("inline-block mt-1 text-xs px-2 py-0.5 rounded-full border font-medium", categoryColor(q.category))}>{q.category}</span>
                    </div>
                  </div>
                  {expanded === i ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />}
                </button>
                {expanded === i && (
                  <div className="px-4 pb-4 pt-0 border-t border-border bg-secondary/20 space-y-3">
                    <p className="text-xs font-medium text-primary mb-1 mt-3 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> Tips for answering</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{q.tips}</p>
                    <Textarea
                      placeholder="Jot down your practice answer or notes…"
                      value={notes[i] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [i]: e.target.value }))}
                      className="min-h-[70px] text-sm bg-card"
                    />
                    <Button size="sm" variant={practiced.has(i) ? "secondary" : "outline"} onClick={() => setPracticed((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; })}>
                      {practiced.has(i) ? "Marked as practiced" : "Mark as practiced"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
