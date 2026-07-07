export interface ApplicationWizardData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  college: string;
  degree: string;
  branch: string;
  currentYear: string;
  cgpa: string;
  expectedGraduationYear: string;
  skills: string;
  coverLetter: string;
}

const KEY = "cc_application_wizard_cache";

export function emptyWizardData(): ApplicationWizardData {
  return {
    fullName: "", email: "", phone: "", location: "",
    college: "", degree: "", branch: "", currentYear: "", cgpa: "", expectedGraduationYear: "",
    skills: "", coverLetter: "",
  };
}

/** Loads whatever the applicant last entered, so returning users don't retype
 *  everything for their next application. Cover letter is intentionally
 *  excluded from caching since it should usually be tailored per job. */
export function getCachedWizardData(): Partial<ApplicationWizardData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    delete parsed.coverLetter;
    return parsed;
  } catch {
    return {};
  }
}

export function cacheWizardData(data: ApplicationWizardData) {
  try {
    const { coverLetter, ...rest } = data;
    void coverLetter;
    window.localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* best-effort only */
  }
}
