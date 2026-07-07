export type AIActivityType =
  | "resume_analyzed" | "ats_score" | "cover_letter" | "resume_parsed"
  | "resume_autosaved" | "profile_autofilled" | "career_roadmap"
  | "interview_coach" | "mock_interview";

export interface AIActivity {
  id: string;
  type: AIActivityType;
  title: string;
  description: string;
  at: string;
  href?: string;
}

const KEY = "cc_ai_activity_log";
const MAX_ITEMS = 30;

export function getAIActivity(): AIActivity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AIActivity[]) : [];
  } catch {
    return [];
  }
}

/** Logs a real AI action (called right after a genuine AI API response succeeds —
 *  never called speculatively or for fake/simulated activity). */
export function logAIActivity(entry: Omit<AIActivity, "id" | "at">) {
  if (typeof window === "undefined") return;
  try {
    const next: AIActivity = { ...entry, id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString() };
    const existing = getAIActivity();
    window.localStorage.setItem(KEY, JSON.stringify([next, ...existing].slice(0, MAX_ITEMS)));
  } catch {
    /* best-effort only */
  }
}
