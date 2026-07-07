import { useState, useMemo } from "react";
import { Map, Sparkles, Loader2, Milestone, GraduationCap, ListChecks } from "lucide-react";
import { AIPageHeader } from "@/components/ai/AIPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logAIActivity } from "@/lib/aiActivityLog";
import { notify } from "@/lib/toast";

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

interface RoadmapStep {
  title: string;
  body: string;
}

/** Splits the AI's free-text roadmap response into numbered/titled steps for
 *  a cleaner timeline UI. Falls back to paragraph chunks if no clear
 *  numbering/headings are present. */
function parseRoadmap(text: string): RoadmapStep[] {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const steps: RoadmapStep[] = [];
  let current: RoadmapStep | null = null;

  const headingPattern = /^(\d+[.)]|\*\*|#+|Step\s*\d+:?|Month\s*\d+.*:|Phase\s*\d+.*:)/i;

  for (const line of lines) {
    if (headingPattern.test(line)) {
      if (current) steps.push(current);
      current = { title: line.replace(/^\d+[.)]\s*|\*\*|#+\s*/g, "").trim(), body: "" };
    } else if (current) {
      current.body += (current.body ? " " : "") + line;
    } else {
      current = { title: "Overview", body: line };
    }
  }
  if (current) steps.push(current);
  return steps.length > 0 ? steps : [{ title: "Your Roadmap", body: text }];
}

export default function CareerRoadmapPage() {
  const [currentRole, setCurrentRole] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [timeframe, setTimeframe] = useState("12 months");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const steps = useMemo(() => (answer ? parseRoadmap(answer) : []), [answer]);

  const generate = async () => {
    if (!targetRole) return;
    setLoading(true); setAnswer(""); setChecked(new Set());
    try {
      const question = `Create a personalized career roadmap for someone moving from "${currentRole || "their current role"}" to "${targetRole}" within ${timeframe}. Structure the response as numbered steps (Step 1, Step 2, …), and for each step include: the skills to build, any certifications worth pursuing, and a rough timeline. Keep each step to 2-3 sentences.`;
      const res = await fetch(`${API}/ai/career-coach`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json() as { answer: string };
      setAnswer(data.answer ?? "");
      notify.success("Career roadmap generated");
      logAIActivity({
        type: "career_roadmap", title: "Career Roadmap Generated",
        description: `A path from ${currentRole || "your current role"} to ${targetRole} is ready.`, href: "/ai/career-roadmap",
      });
    } catch {
      notify.error("Couldn't generate roadmap", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (i: number) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AIPageHeader
        icon={Map}
        title="Career Roadmap"
        description="Get a personalized, milestone-based learning path toward your target role."
        gradient="from-cyan-500 to-blue-500"
      />

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Current Role <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input className="mt-1.5" placeholder="Junior Developer" value={currentRole} onChange={e => setCurrentRole(e.target.value)} />
          </div>
          <div>
            <Label>Target Role</Label>
            <Input className="mt-1.5" placeholder="Senior Full-Stack Engineer" value={targetRole} onChange={e => setTargetRole(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Timeframe</Label>
          <div className="flex gap-2 mt-1.5">
            {["6 months", "12 months", "18 months", "2 years"].map(t => (
              <button key={t} onClick={() => setTimeframe(t)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${timeframe === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={generate} disabled={!targetRole || loading} className="gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Building your roadmap…</> : <><Sparkles className="w-4 h-4" />Generate Roadmap</>}
        </Button>
      </div>

      {steps.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Milestone className="w-4 h-4 text-primary" /> Your Path to {targetRole}</h3>
            <span className="text-xs text-muted-foreground">{checked.size}/{steps.length} milestones complete</span>
          </div>
          <div className="relative pl-8">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
            <div className="space-y-5">
              {steps.map((step, i) => (
                <div key={i} className="relative">
                  <button
                    onClick={() => toggleCheck(i)}
                    className={`absolute -left-8 top-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${checked.has(i) ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    {checked.has(i) ? <ListChecks className="w-3 h-3" /> : i + 1}
                  </button>
                  <div className={`p-4 rounded-xl border transition-colors ${checked.has(i) ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" /> {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
