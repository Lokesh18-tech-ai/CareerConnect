export interface ResumeData {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
  experience: { id: string; role: string; company: string; dates: string; description: string }[];
  education: { id: string; school: string; degree: string; dates: string }[];
  skills: string[];
  projects: { id: string; name: string; description: string }[];
  certifications: string[];
  languages: string[];
  template: "modern" | "classic" | "minimal";
}

export interface SavedResumeVersion {
  id: string;
  savedAt: string;
  label: string;
  data: ResumeData;
}

const KEY = "cc_resume_builder_versions";
const MAX_VERSIONS = 20;

export function emptyResume(): ResumeData {
  return {
    fullName: "", title: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "", summary: "",
    experience: [], education: [], skills: [], projects: [], certifications: [], languages: [], template: "modern",
  };
}

export function getResumeVersions(): SavedResumeVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedResumeVersion[]) : [];
  } catch {
    return [];
  }
}

export function saveResumeVersion(data: ResumeData, label?: string): SavedResumeVersion {
  const versions = getResumeVersions();
  const entry: SavedResumeVersion = {
    id: `v_${Date.now()}`,
    savedAt: new Date().toISOString(),
    label: label?.trim() || `Version ${versions.length + 1}`,
    data,
  };
  const next = [entry, ...versions].slice(0, MAX_VERSIONS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable — save is best-effort */
  }
  return entry;
}

export function deleteResumeVersion(id: string) {
  const next = getResumeVersions().filter((v) => v.id !== id);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
