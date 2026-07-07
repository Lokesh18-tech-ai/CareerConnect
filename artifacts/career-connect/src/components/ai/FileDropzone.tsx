import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractResumeText } from "@/lib/aiFileReader";

interface FileDropzoneProps {
  onExtracted: (text: string, fileName: string) => void;
  onManualPasteNeeded?: (fileName: string) => void;
  /** Optional: also receive the raw File (e.g. to store/preview it, not just its extracted text) */
  onFile?: (file: File) => void;
  className?: string;
}

export function FileDropzone({ onExtracted, onManualPasteNeeded, onFile, className }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; name: string; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setStatus(null);
    onFile?.(file);
    try {
      const result = await extractResumeText(file);
      if (result.needsManualPaste) {
        setStatus({ ok: false, name: file.name, message: "Couldn't auto-extract this format — paste the text below" });
        onManualPasteNeeded?.(file.name);
      } else {
        setStatus({ ok: true, name: file.name, message: `Extracted ${result.text.trim().split(/\s+/).length} words` });
        onExtracted(result.text, file.name);
      }
    } finally {
      setLoading(false);
    }
  }, [onExtracted, onManualPasteNeeded, onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200",
        dragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {loading ? (
        <>
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-foreground">Reading your file…</p>
        </>
      ) : status ? (
        <>
          {status.ok ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          )}
          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> {status.name}
          </p>
          <p className="text-xs text-muted-foreground">{status.message}</p>
          <p className="text-xs text-primary font-medium mt-1">Click or drop another file to replace</p>
        </>
      ) : (
        <>
          <UploadCloud className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Drag & drop your resume here</p>
          <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, or TXT — or click to browse</p>
        </>
      )}
    </div>
  );
}
