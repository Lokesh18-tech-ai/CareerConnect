export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  branch: string;
  cgpa: string;
  graduationYear: string;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface ProfileExtras {
  headline: string;
  phone: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  resumeFileName: string;
  resumeUpdatedAt: string;
  /** base64 data URL of the uploaded resume, stored locally so "Download" works
   *  without a backend file store. Kept out of the main user record since
   *  the schema's resumeUrl column is a plain text/URL field. */
  resumeDataUrl: string;
}

function keyFor(userId: number) {
  return `cc_profile_extras_${userId}`;
}

export function emptyProfileExtras(): ProfileExtras {
  return { headline: "", phone: "", education: [], experience: [], resumeFileName: "", resumeUpdatedAt: "", resumeDataUrl: "" };
}

export function getProfileExtras(userId: number): ProfileExtras {
  if (typeof window === "undefined") return emptyProfileExtras();
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return emptyProfileExtras();
    return { ...emptyProfileExtras(), ...JSON.parse(raw) };
  } catch {
    return emptyProfileExtras();
  }
}

export function saveProfileExtras(userId: number, extras: ProfileExtras) {
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(extras));
  } catch {
    /* best-effort — likely a quota issue from a large resume data URL */
  }
}
