import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Mail, Lock, User, Eye, EyeOff, AlertCircle, Check, X,
  ShieldCheck, CheckCircle2, Star, Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

const INPUT_CLS = "w-full bg-background/60 border border-border text-foreground text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12),0_0_20px_rgba(59,130,246,0.18)] placeholder:text-muted-foreground transition-all duration-300";
const LABEL_CLS = "block text-sm font-medium text-foreground mb-1.5";

const STATS = [
  { value: "20+", label: "Live Job Opportunities" },
  { value: "24+", label: "Hiring Companies" },
  { value: "AI", label: "Career Assistance" },
  { value: "1K+", label: "Growing Community" },
];

const TESTIMONIALS = [
  {
    quote: "CareerConnect helped me improve my resume, prepare for interviews, and land multiple internship opportunities. The AI tools saved me hours of work.",
    name: "Priya S.",
    role: "Software Engineering Student",
  },
  {
    quote: "The ATS Resume Analyzer gave me practical feedback that helped my resume stand out. I received interview calls much faster after making the suggested improvements.",
    name: "Rahul K.",
    role: "Frontend Developer",
  },
  {
    quote: "The AI Interview Coach made me much more confident before my campus interviews. Practicing realistic questions significantly improved my performance.",
    name: "Ananya R.",
    role: "Computer Science Student",
  },
  {
    quote: "Everything I needed for my job search—from resume building to interview preparation—was available in one place. The experience felt smooth and professional.",
    name: "David M.",
    role: "Full Stack Developer",
  },
  {
    quote: "CareerConnect simplified my internship search. The AI-powered tools saved time and helped me present myself much more effectively to recruiters.",
    name: "Sneha P.",
    role: "Data Science Student",
  },
];

// Fixed, deterministic layout so floating particles don't shift on every render
const PARTICLES = [
  { left: 8, top: 20, size: 4, duration: 9, delay: 0 },
  { left: 22, top: 65, size: 3, duration: 11, delay: 1.2 },
  { left: 38, top: 15, size: 5, duration: 8, delay: 0.6 },
  { left: 52, top: 45, size: 3, duration: 12, delay: 2 },
  { left: 66, top: 75, size: 4, duration: 10, delay: 0.4 },
  { left: 78, top: 30, size: 3, duration: 9.5, delay: 1.6 },
  { left: 88, top: 55, size: 5, duration: 11.5, delay: 0.9 },
  { left: 15, top: 85, size: 3, duration: 10.5, delay: 2.4 },
  { left: 45, top: 8, size: 3, duration: 13, delay: 0.3 },
  { left: 92, top: 12, size: 4, duration: 9.8, delay: 1.8 },
  { left: 30, top: 92, size: 3, duration: 12.5, delay: 0.8 },
  { left: 60, top: 60, size: 4, duration: 10.8, delay: 2.2 },
];

const LOADING_MESSAGES = {
  login: ["Signing you in…", "Preparing your dashboard…"],
  register: ["Creating your account…", "Setting up your AI workspace…", "Preparing your dashboard…"],
};

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

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [success, setSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [testimonialPaused, setTestimonialPaused] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ email: "", password: "", name: "", role: "jobseeker" });

  useEffect(() => { if (location.includes("tab=register")) setTab("register"); }, [location]);
  useEffect(() => { if (isAuthenticated && !success) setLocation("/"); }, [isAuthenticated]);
  useEffect(() => {
    if (testimonialPaused) return;
    const id = setInterval(() => setTestimonialIndex((i) => (i + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(id);
  }, [testimonialPaused]);
  useEffect(() => {
    if (!loading) return;
    const messages = LOADING_MESSAGES[tab];
    const id = setInterval(() => setLoadingMsgIndex((i) => Math.min(i + 1, messages.length - 1)), 900);
    return () => clearInterval(id);
  }, [loading, tab]);

  const emailValid = useMemo(() => {
    const email = tab === "login" ? loginForm.email : regForm.email;
    if (!email) return null;
    return /^\S+@\S+\.\S+$/.test(email);
  }, [tab, loginForm.email, regForm.email]);

  const strength = useMemo(() => passwordStrength(regForm.password), [regForm.password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true); setLoadingMsgIndex(0);
    try {
      const res = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginForm) });
      const data = await res.json() as { token?: string; user?: AuthUser; error?: string };
      if (!res.ok) { setError(data.error ?? "Login failed"); return; }
      login(data.token!, data.user!);
      setLocation("/");
    } catch { setError("Network error. Please try again."); } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true); setLoadingMsgIndex(0);
    try {
      const res = await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(regForm) });
      const data = await res.json() as { token?: string; user?: AuthUser; error?: string };
      if (!res.ok) { setError(data.error ?? "Registration failed"); return; }
      login(data.token!, data.user!);
      setSuccess(true);
      setTimeout(() => setLocation("/"), 2200);
    } catch { setError("Network error. Please try again."); } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="text-center max-w-sm">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground">🎉 Welcome to CareerConnect!</h2>
          <p className="text-muted-foreground mt-2">Your AI-powered career workspace is ready.</p>
          <p className="text-xs text-muted-foreground mt-4">Redirecting to your dashboard…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left panel — branding */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-10 xl:p-14 bg-gradient-to-br from-primary/10 via-background to-blue-500/5 border-r border-border">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Faint animated grid */}
          <div className="absolute inset-0 opacity-[0.04] animate-grid-drift" style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          {/* Soft glowing blue gradients */}
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary/25 rounded-full blur-[100px] animate-blob" />
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/3 w-56 h-56 bg-indigo-500/15 rounded-full blur-[90px] animate-blob animation-delay-4000" />

          {/* Floating particles */}
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-blue-300/40 animate-float-particle"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.size,
                height: p.size,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}

          {/* Subtle animated wave near the bottom */}
          <svg className="absolute bottom-0 left-0 w-full h-40 opacity-[0.15]" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <path className="animate-wave-drift" fill="hsl(var(--primary))"
              d="M0,100 C150,180 350,20 600,100 C850,180 1050,20 1200,100 L1200,220 L0,220 Z" />
          </svg>
          <svg className="absolute bottom-0 left-0 w-full h-32 opacity-[0.12]" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <path className="animate-wave-drift-slow" fill="hsl(var(--primary))"
              d="M0,120 C200,60 400,160 600,110 C800,60 1000,160 1200,110 L1200,220 L0,220 Z" />
          </svg>
        </div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative">
          <div className="flex items-center gap-2.5 relative">
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-primary/25 rounded-full blur-2xl" />
            <div className="relative w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="relative font-bold text-lg text-foreground">CareerConnect</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="relative">
          <h1 className="text-4xl xl:text-[2.75rem] font-extrabold text-foreground leading-tight tracking-tight">
            Welcome to <span className="text-gradient-blue">CareerConnect</span>
          </h1>
          <p className="text-muted-foreground text-lg mt-3 max-w-md">The AI-powered career platform for ambitious professionals.</p>

          <div className="grid grid-cols-2 gap-3 mt-8 max-w-md">
            {STATS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }}
                whileHover={{ y: -4, boxShadow: "0 12px 28px rgba(59,130,246,0.25)" }}
                className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-3.5 cursor-default transition-colors duration-300 hover:border-primary/50">
                <div className="text-xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Premium rotating testimonial card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
          onHoverStart={() => setTestimonialPaused(true)} onHoverEnd={() => setTestimonialPaused(false)}
          whileHover={{ y: -3 }}
          className="relative max-w-md rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-5 min-h-[130px] shadow-sm transition-shadow hover:shadow-lg hover:shadow-primary/5 overflow-hidden">
          <div className="flex gap-0.5 mb-2.5">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={testimonialIndex} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.35, ease: "easeOut" }}>
              <p className="text-sm leading-relaxed text-foreground/90 font-medium line-clamp-3">
                "{TESTIMONIALS[testimonialIndex].quote}"
              </p>
              <div className="flex items-center gap-2.5 mt-3">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0">
                  {TESTIMONIALS[testimonialIndex].name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{TESTIMONIALS[testimonialIndex].name}</p>
                  <p className="text-[11px] text-muted-foreground">{TESTIMONIALS[testimonialIndex].role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          {/* Progress dots */}
          <div className="flex gap-1 mt-3">
            {TESTIMONIALS.map((_, i) => (
              <span key={i} className={cn("h-1 rounded-full transition-all duration-300", i === testimonialIndex ? "w-4 bg-primary" : "w-1 bg-border")} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-col items-center justify-center p-4 sm:p-8 relative">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/30 mb-3">
              <Briefcase className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">CareerConnect</h1>
          </div>

          <motion.div
            whileHover={{ y: -3, boxShadow: "0 20px 45px rgba(59,130,246,0.16)" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="glass-panel border border-border hover:border-primary/40 rounded-2xl p-6 sm:p-7 shadow-xl transition-colors duration-300">
            {/* Tabs */}
            <div className="relative flex bg-muted/60 rounded-xl p-1 mb-6">
              {(["login", "register"] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(""); }}
                  className={cn("relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors z-10", tab === t ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {tab === t && (
                    <motion.span layoutId="auth-tab-pill" transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      className="absolute inset-0 bg-primary rounded-lg shadow-sm -z-10" />
                  )}
                  {t === "login" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-start gap-2 mb-4 p-3 bg-destructive/10 border border-destructive/25 rounded-lg text-sm text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
              </div>
            )}

            <AnimatePresence mode="wait">
              {tab === "login" ? (
                <motion.form key="login" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.25, ease: "easeOut" }} onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className={LABEL_CLS}>Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="email" placeholder="Enter your email address" className={INPUT_CLS + " pl-10 pr-9"}
                        value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} required />
                      {emailValid !== null && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          {emailValid ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-destructive" />}
                        </span>
                      )}
                    </div>
                    {emailValid === false && <p className="text-xs text-destructive mt-1">⚠ Invalid email</p>}
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type={showPass ? "text" : "password"} placeholder="Enter your password" className={INPUT_CLS + " pl-10 pr-10"}
                        value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} required />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded border-border" /> Remember Me
                    </label>
                    <button type="button" onClick={() => notify.info("Password reset coming soon")} className="text-primary hover:underline">Forgot Password?</button>
                  </div>
                  <motion.button type="submit" disabled={loading}
                    whileHover={!loading ? { scale: 1.02 } : {}} whileTap={!loading ? { scale: 0.98 } : {}}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? LOADING_MESSAGES.login[loadingMsgIndex] : "Sign In"}
                  </motion.button>
                </motion.form>
              ) : (
                <motion.form key="register" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25, ease: "easeOut" }} onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className={LABEL_CLS}>Full name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input placeholder="Enter your full name" className={INPUT_CLS + " pl-10"}
                        value={regForm.name} onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="email" placeholder="Enter your email address" className={INPUT_CLS + " pl-10 pr-9"}
                        value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} required />
                      {emailValid !== null && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          {emailValid ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-destructive" />}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type={showPass ? "text" : "password"} placeholder="Create a secure password" className={INPUT_CLS + " pl-10 pr-10"}
                        value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {regForm.password && (
                      <div className="mt-2">
                        <div className="flex gap-1">{[0, 1, 2, 3, 4].map(i => <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i <= strength.score - 1 ? strength.color : "bg-border")} />)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{strength.label}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={LABEL_CLS}>I am a</label>
                    <select className={INPUT_CLS} value={regForm.role} onChange={e => setRegForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="jobseeker">Job Seeker</option>
                      <option value="recruiter">Recruiter / Employer</option>
                    </select>
                  </div>
                  <motion.button type="submit" disabled={loading}
                    whileHover={!loading ? { scale: 1.02 } : {}} whileTap={!loading ? { scale: 0.98 } : {}}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? LOADING_MESSAGES.register[loadingMsgIndex] : "Create Account"}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-5">
              <ShieldCheck className="w-3.5 h-3.5" /> Your information is encrypted and securely protected.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-6 text-xs text-muted-foreground">
            <button className="hover:text-foreground transition-colors">Privacy Policy</button>
            <button className="hover:text-foreground transition-colors">Terms of Service</button>
            <button className="hover:text-foreground transition-colors">Contact</button>
            <button className="hover:text-foreground transition-colors">Support</button>
          </div>
          <p className="text-center text-xs text-muted-foreground/70 mt-2">© CareerConnect 2026</p>
        </motion.div>
      </div>
    </div>
  );
}
