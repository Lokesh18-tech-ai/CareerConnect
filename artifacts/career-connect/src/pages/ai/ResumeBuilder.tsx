import { useState, useMemo } from "react";
import {
  FileText, Plus, Trash2, Download, Save, History, Sparkles, Loader2, X, Check,
  Linkedin, Github, Globe, AlertTriangle, CheckCircle2, RotateCcw, UploadCloud, Wand2,
} from "lucide-react";
import { AIPageHeader } from "@/components/ai/AIPageHeader";
import { FileDropzone } from "@/components/ai/FileDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  type ResumeData, emptyResume, getResumeVersions, saveResumeVersion, deleteResumeVersion,
  type SavedResumeVersion,
} from "@/lib/resumeStorage";
import { parseResumeText, isEmptyParsedResume, ResumeParseError, type ParsedResume } from "@/lib/resumeParser";
import { logAIActivity } from "@/lib/aiActivityLog";
import { notify } from "@/lib/toast";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const TEMPLATES: { id: ResumeData["template"]; label: string }[] = [
  { id: "modern", label: "Modern" },
  { id: "classic", label: "Classic" },
  { id: "minimal", label: "Minimal" },
];

// Upload → Extract → AI Processing → Generating → Complete
type AutoFillStage = "idle" | "extracting" | "processing" | "generating" | "success" | "error";

const STAGE_COPY: Record<Exclude<AutoFillStage, "idle" | "error">, string> = {
  extracting: "Extracting text from your file…",
  processing: "AI is reading your resume and identifying sections…",
  generating: "Generating your resume from the extracted content…",
  success: "Auto-fill complete — review the fields below.",
};

function applyParsedResume(resume: ResumeData, parsed: ParsedResume): ResumeData {
  return {
    ...resume,
    fullName: resume.fullName || parsed.fullName,
    title: resume.title || parsed.targetRole,
    email: resume.email || parsed.email,
    phone: resume.phone || parsed.phone,
    location: resume.location || parsed.location,
    summary: resume.summary || parsed.summary,
    linkedin: resume.linkedin || parsed.linkedin,
    github: resume.github || parsed.github,
    portfolio: resume.portfolio || parsed.portfolio || parsed.website,
    skills: resume.skills.length ? resume.skills : parsed.skills,
    certifications: resume.certifications.length ? resume.certifications : parsed.certifications,
    languages: resume.languages.length ? resume.languages : parsed.languages,
    education: resume.education.length ? resume.education : parsed.education.map(e => ({
      id: uid(),
      school: e.school,
      degree: [e.degree, e.field].filter(Boolean).join(", ") + (e.cgpa ? ` (CGPA: ${e.cgpa})` : ""),
      dates: e.graduationYear,
    })),
    experience: resume.experience.length ? resume.experience : parsed.experience.map(e => ({
      id: uid(), role: e.role, company: e.company, dates: e.duration, description: e.description,
    })),
    projects: resume.projects.length ? resume.projects : parsed.projects.map(p => ({
      id: uid(),
      name: p.name,
      description: [p.description, p.technologies && `Tech: ${p.technologies}`, p.githubLink && `GitHub: ${p.githubLink}`].filter(Boolean).join(" — "),
    })),
  };
}

export default function ResumeBuilderPage() {
  const [resume, setResume] = useState<ResumeData>(emptyResume());
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [langInput, setLangInput] = useState("");
  const [versions, setVersions] = useState<SavedResumeVersion[]>(() => getResumeVersions());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [autoFillStage, setAutoFillStage] = useState<AutoFillStage>("idle");
  const [autoFillMessage, setAutoFillMessage] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const update = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) =>
    setResume((r) => ({ ...r, [key]: value }));

  const runAutoFill = async (text: string) => {
    setAutoFillStage("processing");
    setAutoFillMessage(STAGE_COPY.processing);
    try {
      const parsed = await parseResumeText(text);
      setAutoFillStage("generating");
      setAutoFillMessage(STAGE_COPY.generating);

      if (isEmptyParsedResume(parsed)) {
        setAutoFillStage("error");
        setAutoFillMessage("The AI couldn't confidently extract structured fields from this file. Your extracted text is kept below — you can retry, or fill the form manually.");
        notify.warning("AI Auto-Fill found little to work with", "Try retrying, or fill the form manually.");
        return;
      }

      setResume((r) => applyParsedResume(r, parsed));
      setAutoFillStage("success");
      setAutoFillMessage(STAGE_COPY.success);
      notify.success("Resume auto-filled successfully", "Review the pre-filled fields and adjust as needed.");
      logAIActivity({
        type: "resume_parsed", title: "Resume Parsing Completed",
        description: "Your uploaded resume was parsed and used to auto-fill the Resume Builder.",
        href: "/ai/resume-builder",
      });
    } catch (err) {
      setAutoFillStage("error");
      if (err instanceof ResumeParseError) {
        setAutoFillMessage(`${err.message} Your extracted text is kept below — you can retry once it's fixed, or fill the form manually.`);
        notify.error("AI Auto-Fill failed", err.message);
      } else {
        setAutoFillMessage("AI Auto-Fill failed unexpectedly. Your extracted text is kept below — you can retry, or fill the form manually.");
        notify.error("AI Auto-Fill failed", "Please try again.");
      }
    }
  };

  const handleFileExtracted = async (text: string) => {
    if (!text.trim()) return;
    setExtractedText(text);
    await runAutoFill(text);
  };

  const handleSave = () => {
    saveResumeVersion(resume);
    setVersions(getResumeVersions());
    setSavedFlash(true);
    notify.success("Resume saved", "A new version was added to your history.");
    logAIActivity({ type: "resume_autosaved", title: "Resume Saved", description: "A new version of your resume was saved.", href: "/ai/resume-builder" });
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleRestore = (v: SavedResumeVersion) => {
    setResume(v.data);
    setHistoryOpen(false);
    notify.info("Version restored");
  };

  const handleDeleteVersion = (id: string) => {
    deleteResumeVersion(id);
    setVersions(getResumeVersions());
  };

  const handleExportPDF = () => window.print();

  const addExperience = () => update("experience", [...resume.experience, { id: uid(), role: "", company: "", dates: "", description: "" }]);
  const addEducation = () => update("education", [...resume.education, { id: uid(), school: "", degree: "", dates: "" }]);
  const addProject = () => update("projects", [...resume.projects, { id: uid(), name: "", description: "" }]);

  const addTag = (key: "skills" | "certifications" | "languages", value: string, setValue: (v: string) => void) => {
    const v = value.trim();
    if (v && !resume[key].includes(v)) update(key, [...resume[key], v]);
    setValue("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="print:hidden">
        <AIPageHeader
          icon={FileText}
          title="Resume Builder"
          description="Build an ATS-friendly resume with a live preview, multiple templates, and one-click export."
          gradient="from-blue-500 to-indigo-500"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-xl p-1">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => update("template", t.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  resume.template === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen((o) => !o)} className="gap-1.5">
              <History className="w-3.5 h-3.5" /> History {versions.length > 0 && `(${versions.length})`}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5">
              {savedFlash ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5" />}
              {savedFlash ? "Saved" : "Save"}
            </Button>
            <Button size="sm" onClick={handleExportPDF} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export PDF
            </Button>
          </div>
        </div>

        {historyOpen && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Version History</h3>
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved versions yet. Click "Save" to create one.</p>
            ) : (
              <ul className="divide-y divide-border">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.label}</p>
                      <p className="text-xs text-muted-foreground">{new Date(v.savedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleRestore(v)}>Restore</Button>
                      <button onClick={() => handleDeleteVersion(v.id)} className="text-muted-foreground hover:text-destructive p-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-5 print:hidden">
          {/* AI Auto-Fill */}
          <Section title="AI Auto-Fill from Resume">
            <p className="text-xs text-muted-foreground mb-3">Upload a PDF or DOCX and AI will extract your contact info, experience, education, skills, and more.</p>
            <FileDropzone onExtracted={(text) => handleFileExtracted(text)} />

            {(autoFillStage === "processing" || autoFillStage === "generating") && (
              <div className="mt-3">
                <AutoFillStepper stage={autoFillStage} />
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
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => runAutoFill(extractedText)} className="gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Retry AI Auto-Fill
                  </Button>
                </div>
                {extractedText && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">Extracted text (kept — nothing is lost)</summary>
                    <Textarea value={extractedText} onChange={(e) => setExtractedText(e.target.value)} className="min-h-[100px] text-xs mt-2" />
                  </details>
                )}
              </div>
            )}
          </Section>

          {/* Contact */}
          <Section title="Contact Information">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name"><Input value={resume.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Jane Doe" /></Field>
              <Field label="Target Title"><Input value={resume.title} onChange={(e) => update("title", e.target.value)} placeholder="Senior Product Designer" /></Field>
              <Field label="Email"><Input value={resume.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@email.com" /></Field>
              <Field label="Phone"><Input value={resume.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 555 123 4567" /></Field>
              <Field label="Location" className="col-span-2"><Input value={resume.location} onChange={(e) => update("location", e.target.value)} placeholder="San Francisco, CA" /></Field>
            </div>
          </Section>

          {/* Links */}
          <Section title="Links">
            <div className="space-y-2.5">
              <Field label="LinkedIn"><Input value={resume.linkedin} onChange={(e) => update("linkedin", e.target.value)} placeholder="linkedin.com/in/janedoe" /></Field>
              <Field label="GitHub"><Input value={resume.github} onChange={(e) => update("github", e.target.value)} placeholder="github.com/janedoe" /></Field>
              <Field label="Portfolio"><Input value={resume.portfolio} onChange={(e) => update("portfolio", e.target.value)} placeholder="janedoe.dev" /></Field>
            </div>
          </Section>

          {/* Summary */}
          <Section title="Professional Summary">
            <Textarea value={resume.summary} onChange={(e) => update("summary", e.target.value)} className="min-h-[90px]" placeholder="A brief, compelling summary of your experience and goals…" />
          </Section>

          {/* Skills */}
          <Section title="Skills">
            <TagInput value={skillInput} setValue={setSkillInput} onAdd={() => addTag("skills", skillInput, setSkillInput)} placeholder="Type a skill and press Enter" />
            <TagList items={resume.skills} onRemove={(s) => update("skills", resume.skills.filter((x) => x !== s))} />
          </Section>

          {/* Certifications */}
          <Section title="Certifications">
            <TagInput value={certInput} setValue={setCertInput} onAdd={() => addTag("certifications", certInput, setCertInput)} placeholder="e.g. AWS Certified Solutions Architect" />
            <TagList items={resume.certifications} onRemove={(c) => update("certifications", resume.certifications.filter((x) => x !== c))} />
          </Section>

          {/* Languages */}
          <Section title="Languages">
            <TagInput value={langInput} setValue={setLangInput} onAdd={() => addTag("languages", langInput, setLangInput)} placeholder="e.g. Spanish (Fluent)" />
            <TagList items={resume.languages} onRemove={(l) => update("languages", resume.languages.filter((x) => x !== l))} />
          </Section>

          {/* Experience */}
          <Section title="Experience" onAdd={addExperience}>
            {resume.experience.map((exp, i) => (
              <div key={exp.id} className="p-3 rounded-xl border border-border mb-2.5 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <Input value={exp.role} onChange={(e) => updateArrayItem("experience", i, { ...exp, role: e.target.value })} placeholder="Role" />
                    <Input value={exp.company} onChange={(e) => updateArrayItem("experience", i, { ...exp, company: e.target.value })} placeholder="Company" />
                  </div>
                  <button onClick={() => update("experience", resume.experience.filter((x) => x.id !== exp.id))} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <Input value={exp.dates} onChange={(e) => updateArrayItem("experience", i, { ...exp, dates: e.target.value })} placeholder="Jan 2022 — Present" className="text-xs" />
                <Textarea value={exp.description} onChange={(e) => updateArrayItem("experience", i, { ...exp, description: e.target.value })} placeholder="Key achievements and responsibilities…" className="min-h-[70px] text-sm" />
              </div>
            ))}
          </Section>

          {/* Education */}
          <Section title="Education" onAdd={addEducation}>
            {resume.education.map((ed, i) => (
              <div key={ed.id} className="p-3 rounded-xl border border-border mb-2.5 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <Input value={ed.school} onChange={(e) => updateArrayItem("education", i, { ...ed, school: e.target.value })} placeholder="School" />
                    <Input value={ed.degree} onChange={(e) => updateArrayItem("education", i, { ...ed, degree: e.target.value })} placeholder="Degree" />
                  </div>
                  <button onClick={() => update("education", resume.education.filter((x) => x.id !== ed.id))} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <Input value={ed.dates} onChange={(e) => updateArrayItem("education", i, { ...ed, dates: e.target.value })} placeholder="2018 — 2022" className="text-xs" />
              </div>
            ))}
          </Section>

          {/* Projects */}
          <Section title="Projects" onAdd={addProject}>
            {resume.projects.map((p, i) => (
              <div key={p.id} className="p-3 rounded-xl border border-border mb-2.5 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <Input value={p.name} onChange={(e) => updateArrayItem("projects", i, { ...p, name: e.target.value })} placeholder="Project name" className="flex-1" />
                  <button onClick={() => update("projects", resume.projects.filter((x) => x.id !== p.id))} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <Textarea value={p.description} onChange={(e) => updateArrayItem("projects", i, { ...p, description: e.target.value })} placeholder="What did you build, and what was the impact?" className="min-h-[60px] text-sm" />
              </div>
            ))}
          </Section>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-24 self-start print:static print:w-full">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 print:hidden">Live Preview</p>
          <ResumePreview resume={resume} />
        </div>
      </div>
    </div>
  );

  function updateArrayItem<K extends "experience" | "education" | "projects">(key: K, index: number, value: ResumeData[K][number]) {
    const arr = [...resume[key]] as ResumeData[K];
    (arr as unknown[])[index] = value;
    update(key, arr);
  }
}

function TagInput({ value, setValue, onAdd, placeholder }: { value: string; setValue: (v: string) => void; onAdd: () => void; placeholder: string }) {
  return (
    <div className="flex gap-2 mb-3">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
        placeholder={placeholder}
      />
      <Button variant="outline" size="sm" onClick={onAdd}><Plus className="w-4 h-4" /></Button>
    </div>
  );
}

function TagList({ items, onRemove }: { items: string[]; onRemove: (item: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span key={s} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-secondary rounded-full text-foreground">
          {s}
          <button onClick={() => onRemove(s)}><X className="w-3 h-3" /></button>
        </span>
      ))}
    </div>
  );
}

function AutoFillStepper({ stage }: { stage: "processing" | "generating" }) {
  const steps = [
    { key: "upload", label: "Uploading", icon: UploadCloud },
    { key: "extract", label: "Extracting Text", icon: FileText },
    { key: "processing", label: "AI Processing", icon: Sparkles },
    { key: "generating", label: "Generating Resume", icon: Wand2 },
  ] as const;
  const activeIndex = stage === "processing" ? 2 : 3;

  return (
    <div className="flex items-center gap-1 p-3 rounded-xl bg-primary/5 border border-primary/15">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors",
                done ? "bg-primary border-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground"
              )}>
                {active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={cn("text-[10px] text-center leading-tight", done || active ? "text-foreground font-medium" : "text-muted-foreground")}>{step.label}</span>
            </div>
            {i < steps.length - 1 && <div className={cn("h-0.5 flex-1 mx-1 mb-4", i < activeIndex ? "bg-primary" : "bg-border")} />}
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {onAdd && (
          <button onClick={onAdd} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ResumePreview({ resume }: { resume: ResumeData }) {
  const initials = useMemo(() => resume.fullName.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "??", [resume.fullName]);
  const links = [resume.linkedin, resume.github, resume.portfolio].filter(Boolean);

  if (resume.template === "classic") {
    return (
      <div className="bg-white text-gray-900 rounded-xl shadow-lg border border-border overflow-hidden print:shadow-none print:border-none print:rounded-none">
        <div className="p-8 font-serif">
          <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
            <h2 className="text-2xl font-bold tracking-wide">{resume.fullName || "Your Name"}</h2>
            <p className="text-sm text-gray-600 mt-1">{resume.title || "Target Role"}</p>
            <p className="text-xs text-gray-500 mt-1">{[resume.email, resume.phone, resume.location].filter(Boolean).join(" · ")}</p>
            {links.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{links.join(" · ")}</p>}
          </div>
          {resume.summary && <PreviewSection title="Summary" serif><p className="text-sm leading-relaxed">{resume.summary}</p></PreviewSection>}
          {resume.experience.length > 0 && (
            <PreviewSection title="Experience" serif>
              {resume.experience.map((e) => (
                <div key={e.id} className="mb-3">
                  <div className="flex justify-between text-sm font-semibold"><span>{e.role || "Role"} · {e.company || "Company"}</span><span className="text-xs text-gray-500">{e.dates}</span></div>
                  <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{e.description}</p>
                </div>
              ))}
            </PreviewSection>
          )}
          {resume.education.length > 0 && (
            <PreviewSection title="Education" serif>
              {resume.education.map((e) => (
                <div key={e.id} className="flex justify-between text-sm mb-1"><span>{e.degree || "Degree"}, {e.school || "School"}</span><span className="text-xs text-gray-500">{e.dates}</span></div>
              ))}
            </PreviewSection>
          )}
          {resume.skills.length > 0 && <PreviewSection title="Skills" serif><p className="text-sm">{resume.skills.join(" · ")}</p></PreviewSection>}
          {resume.certifications.length > 0 && <PreviewSection title="Certifications" serif><p className="text-sm">{resume.certifications.join(" · ")}</p></PreviewSection>}
          {resume.languages.length > 0 && <PreviewSection title="Languages" serif><p className="text-sm">{resume.languages.join(" · ")}</p></PreviewSection>}
          {resume.projects.length > 0 && (
            <PreviewSection title="Projects" serif>
              {resume.projects.map((p) => (
                <div key={p.id} className="mb-2"><span className="text-sm font-semibold">{p.name || "Project"}</span><p className="text-xs text-gray-700">{p.description}</p></div>
              ))}
            </PreviewSection>
          )}
        </div>
      </div>
    );
  }

  if (resume.template === "minimal") {
    return (
      <div className="bg-white text-gray-900 rounded-xl shadow-lg border border-border overflow-hidden print:shadow-none print:border-none print:rounded-none">
        <div className="p-8">
          <h2 className="text-xl font-bold">{resume.fullName || "Your Name"}</h2>
          <p className="text-sm text-gray-500">{resume.title || "Target Role"}</p>
          <p className="text-[11px] text-gray-400 mt-1">{[resume.email, resume.phone, resume.location].filter(Boolean).join("  ·  ")}</p>
          {links.length > 0 && <p className="text-[11px] text-blue-500 mt-0.5">{links.join("  ·  ")}</p>}
          <div className="h-px bg-gray-200 my-4" />
          {resume.summary && <p className="text-sm text-gray-700 mb-4">{resume.summary}</p>}
          {resume.experience.length > 0 && (
            <PreviewSection title="Experience" minimal>
              {resume.experience.map((e) => (
                <div key={e.id} className="mb-3">
                  <p className="text-sm font-medium">{e.role || "Role"} <span className="text-gray-400 font-normal">— {e.company || "Company"}</span></p>
                  <p className="text-[11px] text-gray-400">{e.dates}</p>
                  <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{e.description}</p>
                </div>
              ))}
            </PreviewSection>
          )}
          {resume.skills.length > 0 && (
            <PreviewSection title="Skills" minimal>
              <div className="flex flex-wrap gap-1.5">{resume.skills.map((s) => <span key={s} className="text-[11px] px-2 py-0.5 bg-gray-100 rounded">{s}</span>)}</div>
            </PreviewSection>
          )}
          {resume.certifications.length > 0 && (
            <PreviewSection title="Certifications" minimal><p className="text-xs text-gray-700">{resume.certifications.join(", ")}</p></PreviewSection>
          )}
          {resume.languages.length > 0 && (
            <PreviewSection title="Languages" minimal><p className="text-xs text-gray-700">{resume.languages.join(", ")}</p></PreviewSection>
          )}
          {resume.education.length > 0 && (
            <PreviewSection title="Education" minimal>
              {resume.education.map((e) => <p key={e.id} className="text-xs text-gray-700 mb-1">{e.degree}, {e.school} <span className="text-gray-400">({e.dates})</span></p>)}
            </PreviewSection>
          )}
          {resume.projects.length > 0 && (
            <PreviewSection title="Projects" minimal>
              {resume.projects.map((p) => <p key={p.id} className="text-xs text-gray-700 mb-1"><span className="font-medium">{p.name}</span> — {p.description}</p>)}
            </PreviewSection>
          )}
        </div>
      </div>
    );
  }

  // modern (default)
  return (
    <div className="bg-white text-gray-900 rounded-xl shadow-lg border border-border overflow-hidden flex print:shadow-none print:border-none print:rounded-none">
      <div className="w-1/3 bg-gradient-to-b from-blue-600 to-indigo-700 text-white p-6">
        <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-lg font-bold mb-4">{initials}</div>
        <h2 className="text-lg font-bold leading-tight">{resume.fullName || "Your Name"}</h2>
        <p className="text-xs text-blue-100 mt-1">{resume.title || "Target Role"}</p>
        <div className="h-px bg-white/20 my-4" />
        <p className="text-[10px] uppercase tracking-wide text-blue-200 mb-1.5">Contact</p>
        <p className="text-[11px] text-blue-50 break-words">{resume.email}</p>
        <p className="text-[11px] text-blue-50">{resume.phone}</p>
        <p className="text-[11px] text-blue-50">{resume.location}</p>
        {links.length > 0 && (
          <>
            <div className="h-px bg-white/20 my-4" />
            <p className="text-[10px] uppercase tracking-wide text-blue-200 mb-1.5">Links</p>
            {resume.linkedin && <p className="text-[11px] text-blue-50 flex items-center gap-1 break-all"><Linkedin className="w-3 h-3 flex-shrink-0" /> {resume.linkedin}</p>}
            {resume.github && <p className="text-[11px] text-blue-50 flex items-center gap-1 break-all mt-0.5"><Github className="w-3 h-3 flex-shrink-0" /> {resume.github}</p>}
            {resume.portfolio && <p className="text-[11px] text-blue-50 flex items-center gap-1 break-all mt-0.5"><Globe className="w-3 h-3 flex-shrink-0" /> {resume.portfolio}</p>}
          </>
        )}
        {resume.skills.length > 0 && (
          <>
            <div className="h-px bg-white/20 my-4" />
            <p className="text-[10px] uppercase tracking-wide text-blue-200 mb-1.5">Skills</p>
            <div className="flex flex-wrap gap-1">
              {resume.skills.map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 bg-white/15 rounded">{s}</span>)}
            </div>
          </>
        )}
        {resume.languages.length > 0 && (
          <>
            <div className="h-px bg-white/20 my-4" />
            <p className="text-[10px] uppercase tracking-wide text-blue-200 mb-1.5">Languages</p>
            <p className="text-[11px] text-blue-50">{resume.languages.join(", ")}</p>
          </>
        )}
      </div>
      <div className="w-2/3 p-6">
        {resume.summary && <PreviewSection title="Summary"><p className="text-sm text-gray-700">{resume.summary}</p></PreviewSection>}
        {resume.experience.length > 0 && (
          <PreviewSection title="Experience">
            {resume.experience.map((e) => (
              <div key={e.id} className="mb-3">
                <p className="text-sm font-semibold text-gray-900">{e.role || "Role"}</p>
                <p className="text-xs text-blue-600">{e.company || "Company"} <span className="text-gray-400">· {e.dates}</span></p>
                <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{e.description}</p>
              </div>
            ))}
          </PreviewSection>
        )}
        {resume.education.length > 0 && (
          <PreviewSection title="Education">
            {resume.education.map((e) => <p key={e.id} className="text-xs text-gray-700 mb-1">{e.degree}, {e.school} <span className="text-gray-400">({e.dates})</span></p>)}
          </PreviewSection>
        )}
        {resume.certifications.length > 0 && (
          <PreviewSection title="Certifications"><p className="text-xs text-gray-700">{resume.certifications.join(" · ")}</p></PreviewSection>
        )}
        {resume.projects.length > 0 && (
          <PreviewSection title="Projects">
            {resume.projects.map((p) => <p key={p.id} className="text-xs text-gray-700 mb-1"><span className="font-medium">{p.name}</span> — {p.description}</p>)}
          </PreviewSection>
        )}
      </div>
    </div>
  );
}

function PreviewSection({ title, serif, minimal, children }: { title: string; serif?: boolean; minimal?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className={cn(
        "text-[11px] font-bold uppercase tracking-wide mb-1.5",
        serif ? "text-gray-800 border-b border-gray-300 pb-1" : minimal ? "text-gray-400" : "text-blue-700"
      )}>
        {title}
      </p>
      {children}
    </div>
  );
}
