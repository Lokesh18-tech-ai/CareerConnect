import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { User, Bell, Shield, Lock, LogOut, Trash2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { notify } from "@/lib/toast";
import { getPrefs, savePrefs, type UserPrefs } from "@/lib/settingsStore";

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);

  useEffect(() => {
    if (user) setPrefs(getPrefs(user.id));
  }, [user]);

  if (!user || !prefs) {
    return <div className="text-center py-20"><p>Please <Link href="/login"><span className="text-primary underline cursor-pointer">sign in</span></Link> to view settings.</p></div>;
  }

  const updatePrefs = (next: UserPrefs) => {
    setPrefs(next);
    savePrefs(user.id, next);
  };

  const toggleNotif = (key: keyof UserPrefs["notifications"]) =>
    updatePrefs({ ...prefs, notifications: { ...prefs.notifications, [key]: !prefs.notifications[key] } });

  const togglePrivacy = (key: keyof UserPrefs["privacy"]) =>
    updatePrefs({ ...prefs, privacy: { ...prefs.privacy, [key]: !prefs.privacy[key] } });

  const handleLogout = () => {
    logout();
    setLocation("/");
    notify.info("Signed out");
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch(`${API}/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        notify.error("Couldn't delete account", data.error ?? "Please try again.");
        return;
      }
      notify.success("Account deleted");
      logout();
      setLocation("/");
    } catch {
      notify.error("Couldn't delete account", "Please try again.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account, notifications, and security</p>
      </div>

      <div className="space-y-6">
        {/* Account */}
        <SettingsCard icon={User} title="Account">
          <Row label="Name" value={user.name} action={<Link href="/profile/edit"><Button size="sm" variant="outline">Update Account Information</Button></Link>} />
          <Row label="Email" value={user.email} action={<Button size="sm" variant="outline" onClick={() => notify.info("Email changes coming soon", "This isn't backed by the server yet.")}>Update Email</Button>} />
        </SettingsCard>

        {/* Notifications */}
        <SettingsCard icon={Bell} title="Notifications">
          <ToggleRow label="Email Notifications" checked={prefs.notifications.email} onChange={() => toggleNotif("email")} />
          <ToggleRow label="Job Alerts" checked={prefs.notifications.jobAlerts} onChange={() => toggleNotif("jobAlerts")} />
          <ToggleRow label="Interview Notifications" checked={prefs.notifications.interviewNotifications} onChange={() => toggleNotif("interviewNotifications")} />
          <ToggleRow label="Application Updates" checked={prefs.notifications.applicationUpdates} onChange={() => toggleNotif("applicationUpdates")} />
          <ToggleRow label="AI Recommendations" checked={prefs.notifications.aiRecommendations} onChange={() => toggleNotif("aiRecommendations")} />
        </SettingsCard>

        {/* Privacy */}
        <SettingsCard icon={Shield} title="Privacy">
          <ToggleRow label="Profile Visibility" checked={prefs.privacy.publicProfile} onChange={() => togglePrivacy("publicProfile")} />
          <ToggleRow label="Resume Visibility" checked={prefs.privacy.resumeVisible} onChange={() => togglePrivacy("resumeVisible")} />
          <ToggleRow label="Hide Email" checked={prefs.privacy.hideEmail} onChange={() => togglePrivacy("hideEmail")} />
          <ToggleRow label="Hide Phone Number" checked={prefs.privacy.hidePhone} onChange={() => togglePrivacy("hidePhone")} />
        </SettingsCard>

        {/* Security */}
        <SettingsCard icon={Lock} title="Security">
          <Row label="Password" value="••••••••" action={<Link href="/settings/change-password"><Button size="sm" variant="outline" className="gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Change Password</Button></Link>} />

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Sign Out</p>
              <p className="text-xs text-muted-foreground">End your current session on this device</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="gap-1.5"><LogOut className="w-3.5 h-3.5" /> Logout</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Sign out of CareerConnect?</AlertDialogTitle><AlertDialogDescription>You can sign back in anytime.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleLogout}>Sign Out</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently remove your account and data</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /> Delete</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Delete your account permanently?</AlertDialogTitle><AlertDialogDescription>This removes your account and profile data. This can't be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Account</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" /> {title}
      </h3>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ label, value, action }: { label: React.ReactNode; value?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {value && <p className="text-xs text-muted-foreground mt-0.5 truncate">{value}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <p className="text-sm text-foreground">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
