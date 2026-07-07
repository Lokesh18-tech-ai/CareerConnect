import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { KeyRound, Eye, EyeOff, ArrowLeft, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const colors = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-500"];
  return { score, label: labels[score], color: colors[score] };
}

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = useMemo(() => passwordStrength(next), [next]);
  const canSubmit = current && next.length >= 6 && next === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, currentPassword: current, newPassword: next }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Couldn't change password"); return; }
      notify.success("Password updated successfully");
      setLocation("/settings");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="text-center py-20"><p>Please <Link href="/login"><span className="text-primary underline cursor-pointer">sign in</span></Link> to change your password.</p></div>;
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/settings">
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
        </button>
      </Link>

      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><KeyRound className="w-5 h-5 text-primary" /></div>
          <div><h1 className="text-lg font-bold text-foreground">Change Password</h1><p className="text-xs text-muted-foreground">Choose a strong, unique password</p></div>
        </div>

        {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/25 rounded-lg text-sm text-destructive">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <div className="relative mt-1.5">
              <Input type={show ? "text" : "password"} value={current} onChange={e => setCurrent(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label>New Password</Label>
            <div className="relative mt-1.5">
              <Input type={show ? "text" : "password"} value={next} onChange={e => setNext(e.target.value)} required minLength={6} className="pr-10" />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {next && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i <= strength.score - 1 ? strength.color : "bg-border")} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{strength.label}</p>
              </div>
            )}
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type={show ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} required className="mt-1.5" />
            {confirm && next !== confirm && <p className="text-xs text-destructive mt-1">Passwords don't match</p>}
            {confirm && next === confirm && next.length >= 6 && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Passwords match</p>}
          </div>
          <Button type="submit" className="w-full gap-2" disabled={!canSubmit || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} {loading ? "Saving…" : "Save Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
