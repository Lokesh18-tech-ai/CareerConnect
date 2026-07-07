import { useState } from "react";
import { Mail, Sparkles, Loader2, Copy, Check, Download, Pencil } from "lucide-react";
import { AIPageHeader } from "@/components/ai/AIPageHeader";
import { FileDropzone } from "@/components/ai/FileDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { downloadTextFile } from "@/lib/aiFileReader";
import { logAIActivity } from "@/lib/aiActivityLog";
import { notify } from "@/lib/toast";

import API from "@/lib/api";


export default function CoverLetterGeneratorPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [result, setResult] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!resumeText || !jobTitle || !company) return;
    setLoading(true); setResult(""); setEditing(false);
    try {
      const res = await fetch(`${API}/ai/cover-letter`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription: jobDesc, jobTitle, companyName: company }),
      });
      const data = await res.json() as { coverLetter: string };
      setResult(data.coverLetter ?? "");
      notify.success("Cover letter generated");
      logAIActivity({
        type: "cover_letter", title: "Cover Letter Generated",
        description: `A cover letter for ${jobTitle} at ${company} is ready to review.`, href: "/ai/cover-letter",
      });
    } catch {
      notify.error("Couldn't generate cover letter", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AIPageHeader
        icon={Mail}
        title="Cover Letter Generator"
        description="Generate a personalized, ready-to-send cover letter tailored to your target role."
        gradient="from-amber-500 to-orange-500"
      />

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <FileDropzone onExtracted={(text) => setResumeText(text)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Job Title</Label>
            <Input className="mt-1.5" placeholder="Software Engineer" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
          </div>
          <div>
            <Label>Company Name</Label>
            <Input className="mt-1.5" placeholder="Acme Inc." value={company} onChange={e => setCompany(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Your Resume</Label>
          <Textarea placeholder="Paste your resume here…" className="mt-1.5 min-h-[120px]" value={resumeText} onChange={e => setResumeText(e.target.value)} />
        </div>
        <div>
          <Label>Job Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Textarea placeholder="Paste the job description…" className="mt-1.5 min-h-[90px]" value={jobDesc} onChange={e => setJobDesc(e.target.value)} />
        </div>
        <Button onClick={generate} disabled={!resumeText || !jobTitle || !company || loading} className="gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</> : <><Sparkles className="w-4 h-4" />Generate Cover Letter</>}
        </Button>
      </div>

      {result && (
        <div className="mt-6 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Your Cover Letter</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> {editing ? "Done" : "Edit"}
              </Button>
              <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" onClick={() => downloadTextFile(`cover-letter-${company || "draft"}.txt`, result)} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Download
              </Button>
            </div>
          </div>
          {editing ? (
            <Textarea value={result} onChange={(e) => setResult(e.target.value)} className="min-h-[320px] text-sm leading-relaxed" />
          ) : (
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed bg-muted/40 rounded-xl p-5">{result}</pre>
          )}
        </div>
      )}
    </div>
  );
}
