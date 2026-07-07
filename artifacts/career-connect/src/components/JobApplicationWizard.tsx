import { useState, useEffect } from "react";
import {
  Check, Loader2, Send, Sparkles, AlertTriangle, CheckCircle2, RotateCcw,
  User, GraduationCap, FileText, ClipboardCheck, Pencil, Briefcase, MapPin,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileDropzone } from "@/components/ai/FileDropzone";
import { cn, typeColor } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { notify } from "@/lib/toast";
import { parseResumeText, isEmptyParsedResume, ResumeParseError, type ParsedResume } from "@/lib/resumeParser";
import { logAIActivity } from "@/lib/aiActivityLog";
import { emptyWizardData, getCachedWizardData, cacheWizardData, type ApplicationWizardData } from "@/lib/applicationWizardStorage";

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

interface JobSummary {
  id: number; title: string; companyName?: string | null; location: string; type: string;
}

interface JobApplicationWizardProps {
  job: JobSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const STEPS = [
  { label: "Personal Info", icon: User },
  { label: "Education", icon: GraduationCap },
  { label: "Resume & Letter", icon: FileText },
  { label: "Review & Submit", icon: ClipboardCheck },
] as const;

type AutoFillStage = "idle" | "processing" | "success" | "error";

function applyParsedToWizard(data: ApplicationWizardData, parsed: ParsedResume): ApplicationWizardData {
  const firstEdu = parsed.education[0];
  return {
    ...data,
    fullName: data.fullName || parsed.fullName,
    email: data.email || parsed.email,
    phone: data.phone || parsed.phone,
    location: data.location || parsed.location,
    skills: data.skills || parsed.skills.join(", "),
    college: data.college || firstEdu?.school || "",
    degree: data.degree || firstEdu?.degree || "",
    branch: data.branch || firstEdu?.field || "",
    cgpa: data.cgpa || firstEdu?.cgpa || "",
    expectedGraduationYear: data.expectedGraduationYear || firstEdu?.graduationYear || "",
  };
}

function buildFinalCoverLetter(data: ApplicationWizardData): string {
  const letterBody = data.coverLetter.trim() || "I'm excited to apply for this role and would welcome the opportunity to discuss my fit further.";
  const eduLine = [data.degree, data.branch].filter(Boolean).join(", ");
  const details = [
    data.phone && `Phone: ${data.phone}`,
    data.location && `Location: ${data.location}`,
    (data.college || eduLine) && `Education: ${[eduLine, data.college, data.cgpa && `CGPA ${data.cgpa}`, data.expectedGraduationYear && `Class of ${data.expectedGraduationYear}`].filter(Boolean).join(" — ")}`,
    data.skills && `Skills: ${data.skills}`,
  ].filter(Boolean);
  return details.length > 0 ? `${letterBody}\n\n---\nCandidate Details\n${details.join("\n")}` : letterBody;
}

export default function JobApplicationWizard({ job, open, onOpenChange, onSuccess }: JobApplicationWizardProps) {
  const { user, token } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ApplicationWizardData>(emptyWizardData());
  const [errors, setErrors] = useState<Partial<Record<keyof ApplicationWizardData, string>>>({});
  const [autoFillStage, setAutoFillStage] = useState<AutoFillStage>("idle");
  const [autoFillMessage, setAutoFillMessage] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) return;
    const cached = getCachedWizardData();
    setData({
      ...emptyWizardData(),
      ...cached,
      fullName: user?.name || cached.fullName || "",
      email: user?.email || cached.email || "",
      location: user?.location || cached.location || "",
      skills: user?.skills || cached.skills || "",
    });
    setStep(1);
    setErrors({});
    setAutoFillStage("idle");
    setExtractedText("");
    setSubmitSuccess(false);
    setSubmitError("");
  }, [open, user]);

  const update = (key: keyof ApplicationWizardData, value: string) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validateStep1 = () => {
    const e: typeof errors = {};
    if (!data.fullName.trim()) e.fullName = "Full name is required";
    if (!data.email.trim() || !/\S+@\S+\.\S+/.test(data.email)) e.email = "A valid email is required";
    if (!data.phone.trim()) e.phone = "Phone number is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: typeof errors = {};
    if (!data.college.trim()) e.college = "College/University is required";
    if (!data.degree.trim()) e.degree = "Degree is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    cacheWizardData(data);
    setStep((s) => Math.min(s + 1, 4));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const runAutoFill = async (text: string) => {
    setAutoFillStage("processing");
    setAutoFillMessage("AI is reading your resume and identifying sections…");
    try {
      const parsed = await parseResumeText(text);
      if (isEmptyParsedResume(parsed)) {
        setAutoFillStage("error");
        setAutoFillMessage("Couldn't confidently extract fields from this file. Your extracted text is kept — retry, or fill fields manually.");
        return;
      }
      setData((d) => applyParsedToWizard(d, parsed));
      setAutoFillStage("success");
      setAutoFillMessage("Auto-filled from your resume — review Steps 1 & 2.");
      notify.success("AI Auto-Fill complete", "Your details were pre-filled from your resume.");
      logAIActivity({ type: "profile_autofilled", title: "Application Auto-Filled", description: `Your application for ${job.title} was auto-filled from your resume.`, href: "/applications" });
    } catch (err) {
      setAutoFillStage("error");
      setAutoFillMessage(err instanceof ResumeParseError ? err.message : "AI Auto-Fill failed unexpectedly. Your extracted text is kept — you can retry.");
      notify.error("AI Auto-Fill failed", err instanceof ResumeParseError ? err.message : "Please try again.");
    }
  };

  const handleGenerateCoverLetter = async () => {
    setGeneratingLetter(true);
    try {
      const res = await fetch(`${API}/ai/cover-letter`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: extractedText || `${data.fullName}, skills: ${data.skills}`, jobTitle: job.title, companyName: job.companyName ?? "" }),
      });
      const json = await res.json() as { coverLetter?: string };
      if (json.coverLetter) {
        update("coverLetter", json.coverLetter);
        notify.success("Cover letter generated");
        logAIActivity({ type: "cover_letter", title: "Cover Letter Generated", description: `A cover letter for ${job.title} is ready to review.`, href: "/applications" });
      }
    } catch {
      notify.error("Couldn't generate cover letter", "Please try again.");
    } finally {
      setGeneratingLetter(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !token) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const finalCoverLetter = buildFinalCoverLetter(data);
      const res = await fetch(`${API}/applications`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ jobId: job.id, userId: user.id, coverLetter: finalCoverLetter }),
      });
      if (!res.ok) throw new Error("Failed to submit application");

      // Persist what the real schema supports back to the user's profile,
      // so Step 2 details aren't just discarded after submission.
      const mergedSkills = Array.from(new Set([...(user.skills ?? "").split(",").map(s => s.trim()).filter(Boolean), ...data.skills.split(",").map(s => s.trim()).filter(Boolean)])).join(", ");
      fetch(`${API}/users/${user.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: data.location || user.location, skills: mergedSkills || user.skills }),
      }).catch(() => {});

      cacheWizardData(data);
      setSubmitSuccess(true);
      notify.success("Application submitted successfully", `Your application for ${job.title} is on its way.`);
      onSuccess();
    } catch {
      setSubmitError("Something went wrong submitting your application. Please try again.");
      notify.error("Couldn't submit application", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const goToStepAndEdit = (s: number) => setStep(s);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:w-full max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">Apply for {job.title}</DialogTitle>

        {submitSuccess ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-50 duration-300">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Application Submitted!</h3>
            <p className="text-sm text-muted-foreground mt-1.5">Your application for {job.title} at {job.companyName} is in. We'll notify you of any updates.</p>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <>
            {/* Header + stepper */}
            <div className="p-6 pb-4 border-b border-border flex-shrink-0">
              <h3 className="text-lg font-semibold text-foreground">Apply for {job.title}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Briefcase className="w-3.5 h-3.5" /> {job.companyName}
                <span>·</span><MapPin className="w-3.5 h-3.5" /> {job.location}
                <span className={cn("ml-1 text-[11px] px-2 py-0.5 rounded-full border", typeColor(job.type))}>{job.type}</span>
              </p>

              <div className="flex items-center mt-5">
                {STEPS.map((s, i) => {
                  const idx = i + 1;
                  const Icon = s.icon;
                  const done = idx < step;
                  const active = idx === step;
                  return (
                    <div key={s.label} className="flex items-center flex-1 last:flex-initial">
                      <div className="flex flex-col items-center gap-1">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0",
                          done ? "bg-primary border-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground"
                        )}>
                          {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                        </div>
                        <span className={cn("text-[10px] whitespace-nowrap", done || active ? "text-foreground font-medium" : "text-muted-foreground")}>{s.label}</span>
                      </div>
                      {i < STEPS.length - 1 && <div className={cn("h-0.5 flex-1 mx-2 mb-4", done ? "bg-primary" : "bg-border")} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step content */}
            <div className="p-6 overflow-y-auto flex-1">
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full Name" error={errors.fullName}><Input value={data.fullName} onChange={e => update("fullName", e.target.value)} placeholder="Jane Doe" /></Field>
                    <Field label="Email Address" error={errors.email}><Input type="email" value={data.email} onChange={e => update("email", e.target.value)} placeholder="jane@email.com" /></Field>
                    <Field label="Phone Number" error={errors.phone}><Input value={data.phone} onChange={e => update("phone", e.target.value)} placeholder="+1 555 123 4567" /></Field>
                    <Field label="Current Location"><Input value={data.location} onChange={e => update("location", e.target.value)} placeholder="San Francisco, CA" /></Field>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="College / University" error={errors.college} className="sm:col-span-2"><Input value={data.college} onChange={e => update("college", e.target.value)} placeholder="State University" /></Field>
                    <Field label="Degree" error={errors.degree}><Input value={data.degree} onChange={e => update("degree", e.target.value)} placeholder="B.Tech / B.Sc / M.S." /></Field>
                    <Field label="Branch / Specialization"><Input value={data.branch} onChange={e => update("branch", e.target.value)} placeholder="Computer Science" /></Field>
                    <Field label="Current Year / Semester"><Input value={data.currentYear} onChange={e => update("currentYear", e.target.value)} placeholder="Final Year / Graduated" /></Field>
                    <Field label="Overall CGPA"><Input value={data.cgpa} onChange={e => update("cgpa", e.target.value)} placeholder="8.5 / 10" /></Field>
                    <Field label="Expected Graduation Year"><Input value={data.expectedGraduationYear} onChange={e => update("expectedGraduationYear", e.target.value)} placeholder="2026" /></Field>
                    <Field label="Technical Skills" className="sm:col-span-2"><Input value={data.skills} onChange={e => update("skills", e.target.value)} placeholder="Java, Python, React, SQL" /></Field>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                  <div>
                    <Label className="mb-2 block">Upload Resume (PDF or DOCX)</Label>
                    <FileDropzone onExtracted={(text) => { setExtractedText(text); runAutoFill(text); }} />

                    {autoFillStage === "processing" && (
                      <div className="mt-3 flex items-center gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15">
                        <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                        <p className="text-xs text-primary font-medium">{autoFillMessage}</p>
                      </div>
                    )}
                    {autoFillStage === "success" && (
                      <div className="mt-3 flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">{autoFillMessage}</p>
                      </div>
                    )}
                    {autoFillStage === "error" && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">{autoFillMessage}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => runAutoFill(extractedText)} className="gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" /> Retry AI Auto-Fill
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Cover Letter <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                      <Button size="sm" variant="outline" onClick={handleGenerateCoverLetter} disabled={generatingLetter} className="gap-1.5">
                        {generatingLetter ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI Generate
                      </Button>
                    </div>
                    <Textarea value={data.coverLetter} onChange={e => update("coverLetter", e.target.value)} placeholder="Tell the employer why you're a great fit…" className="min-h-[140px]" />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                  {submitError && <div className="p-3 bg-destructive/10 border border-destructive/25 rounded-lg text-sm text-destructive">{submitError}</div>}
                  <ReviewSection title="Personal Information" onEdit={() => goToStepAndEdit(1)}>
                    <ReviewRow label="Name" value={data.fullName} />
                    <ReviewRow label="Email" value={data.email} />
                    <ReviewRow label="Phone" value={data.phone} />
                    <ReviewRow label="Location" value={data.location} />
                  </ReviewSection>
                  <ReviewSection title="Education" onEdit={() => goToStepAndEdit(2)}>
                    <ReviewRow label="College" value={data.college} />
                    <ReviewRow label="Degree" value={[data.degree, data.branch].filter(Boolean).join(", ")} />
                    <ReviewRow label="CGPA" value={data.cgpa} />
                    <ReviewRow label="Graduation Year" value={data.expectedGraduationYear} />
                    <ReviewRow label="Skills" value={data.skills} />
                  </ReviewSection>
                  <ReviewSection title="Resume & Cover Letter" onEdit={() => goToStepAndEdit(3)}>
                    <ReviewRow label="Resume" value={extractedText ? "Uploaded & extracted ✓" : "Not uploaded"} />
                    <ReviewRow label="Cover Letter" value={data.coverLetter ? `${data.coverLetter.slice(0, 100)}${data.coverLetter.length > 100 ? "…" : ""}` : "Not provided (a brief default will be used)"} />
                  </ReviewSection>
                </div>
              )}
            </div>

            {/* Footer nav */}
            <div className="p-6 pt-4 border-t border-border flex items-center justify-between flex-shrink-0">
              <Button variant="outline" onClick={step === 1 ? () => onOpenChange(false) : goBack} disabled={submitting}>
                {step === 1 ? "Cancel" : "Back"}
              </Button>
              {step < 4 ? (
                <Button onClick={goNext} className="gap-1.5">Next</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit Application</>}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-muted/30">
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <button onClick={onEdit} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <span className="text-foreground flex-1 break-words">{value}</span>
    </div>
  );
}
