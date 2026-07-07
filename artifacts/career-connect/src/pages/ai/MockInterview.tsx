import { useState, useEffect, useRef, useCallback } from "react";
import { Target, Sparkles, Loader2, Timer, RotateCcw, Award, MessageSquare } from "lucide-react";
import { AIPageHeader } from "@/components/ai/AIPageHeader";
import { ScoreGauge } from "@/components/ai/ScoreGauge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { logAIActivity } from "@/lib/aiActivityLog";
import { notify } from "@/lib/toast";

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;
const SECONDS_PER_QUESTION = 90;

interface InterviewQ { question: string; tips: string; category: string; }
interface AnswerRecord { question: string; answer: string; technical: number; communication: number; feedback: string; }

type Stage = "setup" | "loading" | "session" | "evaluating" | "report";

function heuristicScore(answer: string, tips: string): { technical: number; communication: number } {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const lengthScore = Math.min(100, Math.round((words / 60) * 100));
  const tipWords = new Set(tips.toLowerCase().split(/\W+/).filter(w => w.length > 4));
  const answerWords = new Set(answer.toLowerCase().split(/\W+/));
  const overlap = Array.from(tipWords).filter(w => answerWords.has(w)).length;
  const relevance = tipWords.size > 0 ? Math.min(100, Math.round((overlap / tipWords.size) * 150)) : 50;
  return {
    technical: Math.max(20, Math.round((lengthScore + relevance) / 2)),
    communication: Math.max(20, Math.round(lengthScore * 0.9)),
  };
}

async function evaluateAnswer(question: string, answer: string, tips: string): Promise<AnswerRecord> {
  if (!answer.trim()) {
    return { question, answer, technical: 0, communication: 0, feedback: "No answer was given in time." };
  }
  try {
    const prompt = `Evaluate this mock interview answer.\nQuestion: "${question}"\nAnswer: "${answer}"\n\nRespond in EXACTLY this format on one line: Technical: <0-100> | Communication: <0-100> | Feedback: <one sentence>`;
    const res = await fetch(`${API}/ai/career-coach`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: prompt }),
    });
    const data = await res.json() as { answer: string };
    const raw = data.answer ?? "";
    const match = raw.match(/Technical:\s*(\d{1,3}).*Communication:\s*(\d{1,3}).*Feedback:\s*(.*)/is);
    if (match) {
      return {
        question, answer,
        technical: Math.min(100, parseInt(match[1], 10)),
        communication: Math.min(100, parseInt(match[2], 10)),
        feedback: match[3].trim().slice(0, 300),
      };
    }
    const h = heuristicScore(answer, tips);
    return { question, answer, ...h, feedback: raw.trim().slice(0, 300) || "Answer recorded." };
  } catch {
    const h = heuristicScore(answer, tips);
    return { question, answer, ...h, feedback: "Estimated from answer length and relevance (AI evaluation unavailable)." };
  }
}

export default function MockInterviewPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [level, setLevel] = useState("Mid");
  const [questions, setQuestions] = useState<InterviewQ[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const timerRef = useRef<number | null>(null);

  const advance = useCallback(async (currentAnswer: string) => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setStage("evaluating");
    const q = questions[qIndex];
    const rec = await evaluateAnswer(q.question, currentAnswer, q.tips);
    const nextRecords = [...records, rec];
    setRecords(nextRecords);
    setAnswer("");
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1);
      setSecondsLeft(SECONDS_PER_QUESTION);
      setStage("session");
    } else {
      setStage("report");
      const overall = Math.round(nextRecords.reduce((s, r) => s + (r.technical + r.communication) / 2, 0) / nextRecords.length);
      notify.success("Mock interview complete", `Overall score: ${overall}/100`);
      logAIActivity({
        type: "mock_interview", title: "Mock Interview Completed",
        description: `You completed a ${jobTitle} mock interview with an overall score of ${overall}/100.`, href: "/ai/mock-interview",
      });
    }
  }, [questions, qIndex, records, jobTitle]);

  useEffect(() => {
    if (stage !== "session") return;
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(timerRef.current!);
          void advance(answer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, qIndex]);

  const start = async () => {
    if (!jobTitle || !industry) return;
    setStage("loading");
    try {
      const res = await fetch(`${API}/ai/interview-prep`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, industry, level }),
      });
      const data = await res.json() as { questions: InterviewQ[] };
      const qs = Array.isArray(data.questions) ? data.questions : [];
      setQuestions(qs);
      setRecords([]);
      setQIndex(0);
      setSecondsLeft(SECONDS_PER_QUESTION);
      setStage(qs.length > 0 ? "session" : "setup");
    } catch {
      setStage("setup");
    }
  };

  const restart = () => {
    setStage("setup");
    setQuestions([]);
    setRecords([]);
    setQIndex(0);
  };

  const avgTechnical = records.length ? Math.round(records.reduce((s, r) => s + r.technical, 0) / records.length) : 0;
  const avgCommunication = records.length ? Math.round(records.reduce((s, r) => s + r.communication, 0) / records.length) : 0;
  const overall = Math.round((avgTechnical + avgCommunication) / 2);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AIPageHeader
        icon={Target}
        title="Mock Interview"
        description="A timed, interactive interview simulation with AI evaluation and a final performance report."
        gradient="from-fuchsia-500 to-purple-500"
      />

      {stage === "setup" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Job Title / Role</Label>
              <Input className="mt-1.5" placeholder="Product Manager" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
            </div>
            <div>
              <Label>Industry</Label>
              <Input className="mt-1.5" placeholder="Technology" value={industry} onChange={e => setIndustry(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Difficulty Level</Label>
            <div className="flex gap-2 mt-1.5">
              {["Entry", "Mid", "Senior"].map(l => (
                <button key={l} onClick={() => setLevel(l)} className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors", level === l ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Timer className="w-3.5 h-3.5 flex-shrink-0" /> You'll get {SECONDS_PER_QUESTION} seconds per question — the interview auto-advances when time runs out.
          </div>
          <Button onClick={start} disabled={!jobTitle || !industry} className="gap-2">
            <Sparkles className="w-4 h-4" /> Start Mock Interview
          </Button>
        </div>
      )}

      {stage === "loading" && (
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Preparing your interview questions…</p>
        </div>
      )}

      {stage === "session" && questions[qIndex] && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-medium text-muted-foreground">Question {qIndex + 1} of {questions.length}</span>
            <span className={cn("flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full", secondsLeft <= 15 ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary")}>
              <Timer className="w-3.5 h-3.5" /> {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-5">
            <div className="h-full bg-primary transition-all duration-1000 linear" style={{ width: `${(secondsLeft / SECONDS_PER_QUESTION) * 100}%` }} />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">{questions[qIndex].question}</p>
          <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">{questions[qIndex].category}</span>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer as if you were speaking it out loud…"
            className="min-h-[160px] mt-4"
            autoFocus
          />
          <div className="flex justify-end mt-4">
            <Button onClick={() => advance(answer)} className="gap-2">
              {qIndex + 1 < questions.length ? "Next Question" : "Finish Interview"}
            </Button>
          </div>
        </div>
      )}

      {stage === "evaluating" && (
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Evaluating your answer…</p>
        </div>
      )}

      {stage === "report" && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={overall} label="overall" size={110} />
            <div className="flex-1">
              <p className="font-semibold text-foreground text-lg flex items-center gap-1.5"><Award className="w-4.5 h-4.5 text-primary" /> Final Performance Report</p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Technical Score</p>
                  <p className="text-xl font-bold text-foreground">{avgTechnical}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Communication Score</p>
                  <p className="text-xl font-bold text-foreground">{avgCommunication}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {records.map((r, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5">
                <p className="text-sm font-semibold text-foreground mb-1">{i + 1}. {r.question}</p>
                <p className="text-xs text-muted-foreground italic mb-2">{r.answer ? `"${r.answer.slice(0, 140)}${r.answer.length > 140 ? "…" : ""}"` : "No answer given"}</p>
                <div className="flex items-center gap-3 text-xs mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">Technical {r.technical}</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">Communication {r.communication}</span>
                </div>
                <p className="text-sm text-muted-foreground flex items-start gap-1.5"><MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {r.feedback}</p>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={restart} className="gap-2">
            <RotateCcw className="w-3.5 h-3.5" /> Start Another Mock Interview
          </Button>
        </div>
      )}
    </div>
  );
}
