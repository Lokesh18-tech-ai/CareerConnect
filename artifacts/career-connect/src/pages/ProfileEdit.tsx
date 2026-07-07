import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Save, X, Camera, Plus, Trash2, Sparkles, Loader2, Download, RotateCcw,
  GraduationCap, Building2, Eye, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileDropzone } from "@/components/ai/FileDropzone";
import { getInitials, computeProfileCompletion } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { notify } from "@/lib/toast";
import { parseResumeText, isEmptyParsedResume, ResumeParseError } from "@/lib/resumeParser";
import { logAIActivity } from "@/lib/aiActivityLog";
import {
  getProfileExtras, saveProfileExtras, emptyProfileExtras,
  type ProfileExtras, type EducationEntry, type ExperienceEntry,
} from "@/lib/profileExtras";

import API from "@/lib/api";


function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfileEditPage() {
  const { user, token, login, logout } = useAuth();
  const [, setLocation] = useLocation();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocationField] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [extras, setExtras] = useState<ProfileExtras>(emptyProfileExtras());
  const [resumeUrl, setResumeUrl] = useState("");

  const [aiBioLoading, setAiBioLoading] = useState(false);
  const [autoFillStage, setAutoFillStage] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [autoFillMessage, setAutoFillMessage] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [pendingResumeFile, setPendingResumeFile] = useState<{ name: string; dataUrl: string } | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setAvatar(user.avatar ?? "");
    setBio(user.bio ?? "");
    setLocationField(user.location ?? "");
    setSkills((user.skills ?? "").split(",").map(s => s.trim()).filter(Boolean));
    setResumeUrl(user.resumeUrl ?? "");
    setExtras(getProfileExtras(user.id));
  }, [user]);

  if (!user) {
    return <div className="text-center py-20"><p>Please <Link href="/login"><span className="text-primary underline cursor-pointer">sign in</span></Link> to edit your profile.</p></div>;
  }

  const completion = computeProfileCompletion({
    name, avatar, bio, location, resumeUrl, skills: skills.join(","),
    headline: extras.headline, phone: extras.phone,
    hasEducation: extras.education.length > 0, hasExperience: extras.experience.length > 0,
  });

  const handleAvatarChange = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setAvatar(dataUrl);
  };

  const runResumeAutoFill = async (text: string) => {
    setAutoFillStage("processing");
    setAutoFillMessage("AI is reading your resume and identifying sections…");
    try {
      const parsed = await parseResumeText(text);
      if (isEmptyParsedResume(parsed)) {
        setAutoFillStage("error");
        setAutoFillMessage("Couldn't confidently extract fields — your file is still saved. Try retrying, or edit fields manually.");
        return;
      }
      setName((v) => v || parsed.fullName);
      setLocationField((v) => v || parsed.location);
      setExtras((e) => ({
        ...e,
        phone: e.phone || parsed.phone,
        education: e.education.length ? e.education : parsed.education.map(ed => ({
          id: uid(), school: ed.school, degree: ed.degree, branch: ed.field, cgpa: ed.cgpa, graduationYear: ed.graduationYear,
        })),
        experience: e.experience.length ? e.experience : parsed.experience.map(ex => ({
          id: uid(), company: ex.company, role: ex.role, duration: ex.duration, description: ex.description,
        })),
      }));
      setSkills((s) => s.length ? s : parsed.skills);
      setAutoFillStage("success");
      setAutoFillMessage("Auto-filled from your resume — review each section below.");
      notify.success("Profile auto-filled from resume");
      logAIActivity({ type: "profile_autofilled", title: "Profile Auto-Filled", description: "Your profile was auto-filled from your uploaded resume.", href: "/profile/edit" });
    } catch (err) {
      setAutoFillStage("error");
      setAutoFillMessage(err instanceof ResumeParseError ? err.message : "AI Auto-Fill failed unexpectedly. Your file is still saved — you can retry.");
      notify.error("AI Auto-Fill failed", err instanceof ResumeParseError ? err.message : "Please try again.");
    }
  };

  const handleResumeFile = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setPendingResumeFile({ name: file.name, dataUrl });
  };

  const handleResumeExtracted = (text: string) => {
    setExtractedText(text);
    runResumeAutoFill(text);
  };

  const handleDeleteResume = () => {
    setPendingResumeFile(null);
    setResumeUrl("");
    setExtras((e) => ({ ...e, resumeFileName: "", resumeUpdatedAt: "", resumeDataUrl: "" }));
    notify.info("Resume removed — click Save Changes to confirm");
  };

  const handleDownloadResume = () => {
    const dataUrl = pendingResumeFile?.dataUrl || extras.resumeDataUrl;
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = pendingResumeFile?.name || extras.resumeFileName || "resume";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGenerateBio = async () => {
    setAiBioLoading(true);
    try {
      const question = `Write a concise, professional "About Me" summary (3-4 sentences, first person) for a resume/profile. Headline: "${extras.headline || "Professional"}". Skills: ${skills.join(", ") || "N/A"}. Experience: ${extras.experience.map(e => `${e.role} at ${e.company}`).join("; ") || "N/A"}. Return only the summary text, no preamble.`;
      const res = await fetch(`${API}/ai/career-coach`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json() as { answer?: string };
      if (data.answer) {
        setBio(data.answer.trim());
        notify.success("About Me generated");
      }
    } catch {
      notify.error("Couldn't generate About Me", "Please try again.");
    } finally {
      setAiBioLoading(false);
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput("");
  };

  const addEducation = () => setExtras((e) => ({ ...e, education: [...e.education, { id: uid(), school: "", degree: "", branch: "", cgpa: "", graduationYear: "" }] }));
  const updateEducation = (id: string, patch: Partial<EducationEntry>) => setExtras((e) => ({ ...e, education: e.education.map((ed) => ed.id === id ? { ...ed, ...patch } : ed) }));
  const removeEducation = (id: string) => setExtras((e) => ({ ...e, education: e.education.filter((ed) => ed.id !== id) }));

  const addExperience = () => setExtras((e) => ({ ...e, experience: [...e.experience, { id: uid(), company: "", role: "", duration: "", description: "" }] }));
  const updateExperience = (id: string, patch: Partial<ExperienceEntry>) => setExtras((e) => ({ ...e, experience: e.experience.map((ex) => ex.id === id ? { ...ex, ...patch } : ex) }));
  const removeExperience = (id: string) => setExtras((e) => ({ ...e, experience: e.experience.filter((ex) => ex.id !== id) }));

  const handleCancel = () => {
    setLocation("/profile");
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const finalResumeUrl = pendingResumeFile ? pendingResumeFile.name : resumeUrl;
      const res = await fetch(`${API}/users/${user.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ name, avatar, bio, location, skills: skills.join(", "), resumeUrl: finalResumeUrl }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json() as AuthUser;
      login(token, updated);

      const nextExtras: ProfileExtras = {
        ...extras,
        resumeFileName: pendingResumeFile ? pendingResumeFile.name : extras.resumeFileName,
        resumeDataUrl: pendingResumeFile ? pendingResumeFile.dataUrl : extras.resumeDataUrl,
        resumeUpdatedAt: pendingResumeFile ? new Date().toISOString() : extras.resumeUpdatedAt,
      };
      saveProfileExtras(user.id, nextExtras);
      setExtras(nextExtras);
      setPendingResumeFile(null);

      notify.success("Profile updated successfully");
      setLocation("/profile");
    } catch {
      notify.error("Couldn't save profile", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
        <p className="text-muted-foreground mt-1">Update your professional information</p>
      </div>

      {/* Profile completion */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-foreground">Profile Completion</span>
          <span className="text-sm font-bold text-primary">{completion.percent}%</span>
        </div>
        <Progress value={completion.percent} className="h-2" />
        {completion.missing.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">Add {completion.missing.slice(0, 3).join(", ")}{completion.missing.length > 3 ? ` +${completion.missing.length - 3} more` : ""} to complete your profile.</p>
        )}
      </div>

      <div className="space-y-6">
        {/* Picture + Personal Info */}
        <Card title="Personal Information">
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <Avatar className="w-20 h-20 border border-border">
                <AvatarImage src={avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{getInitials(name)}</AvatarFallback>
              </Avatar>
              <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarChange(f); e.target.value = ""; }} />
            </div>
            <p className="text-xs text-muted-foreground">Click the camera icon to upload a new profile picture.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
            <Field label="Email"><Input value={user.email} disabled className="opacity-60" /></Field>
            <Field label="Phone Number"><Input value={extras.phone} onChange={e => setExtras(x => ({ ...x, phone: e.target.value }))} placeholder="+1 555 123 4567" /></Field>
            <Field label="Location"><Input value={location} onChange={e => setLocationField(e.target.value)} placeholder="San Francisco, CA" /></Field>
            <Field label="Professional Title" className="sm:col-span-2"><Input value={extras.headline} onChange={e => setExtras(x => ({ ...x, headline: e.target.value }))} placeholder="Student / Software Developer / Fresher" /></Field>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Email changes aren't supported here yet — see Settings for account options.</p>
        </Card>

        {/* Resume */}
        <Card title="Resume Management">
          <FileDropzone onFile={handleResumeFile} onExtracted={handleResumeExtracted} />

          {autoFillStage === "processing" && (
            <div className="mt-3 flex items-center gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15">
              <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" /><p className="text-xs text-primary font-medium">{autoFillMessage}</p>
            </div>
          )}
          {autoFillStage === "success" && (
            <div className="mt-3 flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0" /><p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">{autoFillMessage}</p>
            </div>
          )}
          {autoFillStage === "error" && (
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-amber-700 dark:text-amber-300 font-medium">{autoFillMessage}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => runResumeAutoFill(extractedText)} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Retry AI Auto-Fill</Button>
            </div>
          )}

          {(pendingResumeFile || extras.resumeFileName) && (
            <div className="mt-3 flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
              <span className="text-sm text-foreground truncate">{pendingResumeFile?.name ?? extras.resumeFileName}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={handleDownloadResume} className="gap-1"><Download className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={handleDeleteResume} className="gap-1 text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          )}
        </Card>

        {/* About Me */}
        <Card title="About Me">
          <Textarea value={bio} onChange={e => setBio(e.target.value)} className="min-h-[110px]" placeholder="Tell employers about yourself…" />
          <div className="flex gap-2 mt-2.5">
            <Button size="sm" variant="outline" onClick={handleGenerateBio} disabled={aiBioLoading} className="gap-1.5">
              {aiBioLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {bio ? "Regenerate" : "Generate with AI"}
            </Button>
          </div>
        </Card>

        {/* Skills */}
        <Card title="Skills">
          <div className="flex gap-2 mb-3">
            <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} placeholder="Type a skill and press Enter" />
            <Button variant="outline" size="sm" onClick={addSkill}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map(s => (
              <span key={s} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-secondary rounded-full text-foreground">
                {s}<button onClick={() => setSkills(skills.filter(x => x !== s))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </Card>

        {/* Education */}
        <Card title="Education" onAdd={addEducation}>
          {extras.education.length === 0 ? <EmptyNote text="No education added yet." /> : (
            <div className="space-y-3">
              {extras.education.map(ed => (
                <div key={ed.id} className="p-3.5 rounded-xl border border-border space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <GraduationCap className="w-4 h-4 text-primary mt-2.5 flex-shrink-0" />
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <Input value={ed.school} onChange={e => updateEducation(ed.id, { school: e.target.value })} placeholder="College / University" className="col-span-2" />
                      <Input value={ed.degree} onChange={e => updateEducation(ed.id, { degree: e.target.value })} placeholder="Degree" />
                      <Input value={ed.branch} onChange={e => updateEducation(ed.id, { branch: e.target.value })} placeholder="Branch / Specialization" />
                      <Input value={ed.cgpa} onChange={e => updateEducation(ed.id, { cgpa: e.target.value })} placeholder="CGPA" />
                      <Input value={ed.graduationYear} onChange={e => updateEducation(ed.id, { graduationYear: e.target.value })} placeholder="Graduation Year" />
                    </div>
                    <button onClick={() => removeEducation(ed.id)} className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Experience */}
        <Card title="Experience" onAdd={addExperience}>
          {extras.experience.length === 0 ? <EmptyNote text="No experience added yet." /> : (
            <div className="space-y-3">
              {extras.experience.map(ex => (
                <div key={ex.id} className="p-3.5 rounded-xl border border-border space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Building2 className="w-4 h-4 text-primary mt-2.5 flex-shrink-0" />
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <Input value={ex.role} onChange={e => updateExperience(ex.id, { role: e.target.value })} placeholder="Role" />
                      <Input value={ex.company} onChange={e => updateExperience(ex.id, { company: e.target.value })} placeholder="Company" />
                      <Input value={ex.duration} onChange={e => updateExperience(ex.id, { duration: e.target.value })} placeholder="Duration" className="col-span-2" />
                      <Textarea value={ex.description} onChange={e => updateExperience(ex.id, { description: e.target.value })} placeholder="Responsibilities…" className="col-span-2 min-h-[60px] text-sm" />
                    </div>
                    <button onClick={() => removeExperience(ex.id)} className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
          </Button>
          <Button variant="outline" onClick={handleCancel} className="gap-1.5"><X className="w-4 h-4" /> Cancel</Button>
          <Link href="/profile"><Button variant="outline" className="gap-1.5"><Eye className="w-4 h-4" /> Preview Profile</Button></Link>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="gap-1.5 text-destructive hover:text-destructive ml-auto"><Trash2 className="w-4 h-4" /> Remove Completely</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
                <AlertDialogDescription>This removes your account and profile data. This can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Account</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function Card({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h3>
        {onAdd && <button onClick={onAdd} className="text-xs font-medium text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="text-xs">{label}</Label><div className="mt-1">{children}</div></div>;
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground italic">{text}</p>;
}
