export interface NotificationPrefs {
  email: boolean;
  jobAlerts: boolean;
  applicationUpdates: boolean;
  interviewNotifications: boolean;
  aiRecommendations: boolean;
}

export interface PrivacyPrefs {
  publicProfile: boolean;
  resumeVisible: boolean;
  hideEmail: boolean;
  hidePhone: boolean;
}

export interface UserPrefs {
  notifications: NotificationPrefs;
  privacy: PrivacyPrefs;
  language: string;
}

const KEY_PREFIX = "cc_user_prefs_";

export function defaultPrefs(): UserPrefs {
  return {
    notifications: { email: true, jobAlerts: true, applicationUpdates: true, interviewNotifications: true, aiRecommendations: true },
    privacy: { publicProfile: true, resumeVisible: true, hideEmail: false, hidePhone: false },
    language: "English",
  };
}

export function getPrefs(userId: number): UserPrefs {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + userId);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw);
    const d = defaultPrefs();
    return {
      notifications: { ...d.notifications, ...parsed.notifications },
      privacy: { ...d.privacy, ...parsed.privacy },
      language: parsed.language ?? d.language,
    };
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(userId: number, prefs: UserPrefs) {
  try {
    window.localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(prefs));
  } catch {
    /* best-effort only */
  }
}
