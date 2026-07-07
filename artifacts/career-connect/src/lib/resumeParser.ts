const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

export interface ParsedResume {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  targetRole: string;
  summary: string;
  linkedin: string;
  github: string;
  portfolio: string;
  website: string;
  education: { school: string; degree: string; field: string; graduationYear: string; cgpa: string }[];
  experience: { company: string; role: string; duration: string; description: string }[];
  projects: { name: string; description: string; technologies: string; githubLink: string }[];
  skills: string[];
  certifications: string[];
  languages: string[];
}

export type ParseFailureReason =
  | "not_configured" | "invalid_api_key" | "rate_limited"
  | "upstream_error" | "invalid_ai_response" | "unknown_error" | "network_error";

export class ResumeParseError extends Error {
  reason: ParseFailureReason;
  constructor(message: string, reason: ParseFailureReason) {
    super(message);
    this.reason = reason;
    this.name = "ResumeParseError";
  }
}

export function emptyParsedResume(): ParsedResume {
  return {
    fullName: "", email: "", phone: "", location: "", targetRole: "", summary: "",
    linkedin: "", github: "", portfolio: "", website: "",
    education: [], experience: [], projects: [], skills: [], certifications: [], languages: [],
  };
}

/** Calls the single, shared backend resume parser (POST /api/ai/parse-resume).
 *  This is the ONE parsing implementation reused across Resume Builder, the
 *  Job Application Wizard, and anywhere else structured resume data is needed —
 *  no feature should implement its own parsing logic. */
export async function parseResumeText(resumeText: string): Promise<ParsedResume> {
  let res: Response;
  try {
    res = await fetch(`${API}/ai/parse-resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText }),
    });
  } catch {
    throw new ResumeParseError("Couldn't reach the server. Check your connection and that the backend is running.", "network_error");
  }

  const data = await res.json().catch(() => ({})) as Partial<ParsedResume> & { error?: string; reason?: ParseFailureReason };

  if (!res.ok) {
    throw new ResumeParseError(data.error ?? "Resume parsing failed.", data.reason ?? "unknown_error");
  }
  return { ...emptyParsedResume(), ...data };
}

/** True if the parser found essentially nothing — resume text was probably too short/garbled. */
export function isEmptyParsedResume(r: ParsedResume): boolean {
  return !r.fullName && !r.email && r.education.length === 0 && r.experience.length === 0 && r.skills.length === 0;
}
