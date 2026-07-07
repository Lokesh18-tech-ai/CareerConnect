export interface ExtractedFile {
  fileName: string;
  /** Extracted plain text, or "" if this format couldn't be parsed client-side */
  text: string;
  /** True when we could not extract text and the caller should prompt the user to paste it */
  needsManualPaste: boolean;
}

const TEXT_EXTENSIONS = [".txt", ".md"];
const DOCX_EXTENSIONS = [".docx"];
const PDF_EXTENSIONS = [".pdf"];
const UNSUPPORTED_EXTENSIONS = [".doc"];

export const ACCEPTED_RESUME_EXTENSIONS = [...TEXT_EXTENSIONS, ...DOCX_EXTENSIONS, ...PDF_EXTENSIONS, ...UNSUPPORTED_EXTENSIONS];

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

/**
 * Extracts readable text from an uploaded resume file, entirely client-side.
 * - .txt/.md: read directly.
 * - .docx: parsed with mammoth (dynamically imported so it never bloats the
 *   main bundle for people who don't use the upload feature).
 * - .pdf: parsed with pdfjs-dist (also dynamically imported), extracting
 *   text from every page.
 * - .doc (legacy binary format): browsers can't parse this without a much
 *   heavier dependency, so we're honest about it — the file is accepted so
 *   the drag-and-drop UX stays real, but the caller should prompt the user
 *   to paste the text instead (or re-save as .docx/.pdf).
 */
export async function extractResumeText(file: File): Promise<ExtractedFile> {
  const ext = extOf(file.name);

  if (TEXT_EXTENSIONS.includes(ext)) {
    const text = await file.text();
    return { fileName: file.name, text, needsManualPaste: false };
  }

  if (DOCX_EXTENSIONS.includes(ext)) {
    try {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { fileName: file.name, text: result.value ?? "", needsManualPaste: !result.value };
    } catch {
      return { fileName: file.name, text: "", needsManualPaste: true };
    }
  }

  if (PDF_EXTENSIONS.includes(ext)) {
    try {
      const pdfjs = await import("pdfjs-dist");
      // Vite-native worker URL — bundled and hashed like any other asset,
      // no manual public/ copy step required.
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;

      const arrayBuffer = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const pageTexts: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
        pageTexts.push(pageText);
      }
      const text = pageTexts.join("\n\n").trim();
      // Some PDFs are scanned images with no embedded text layer — in that
      // case pdf.js successfully "parses" the file but returns nothing.
      return { fileName: file.name, text, needsManualPaste: text.length === 0 };
    } catch {
      return { fileName: file.name, text: "", needsManualPaste: true };
    }
  }

  // .doc or anything else unrecognized
  return { fileName: file.name, text: "", needsManualPaste: true };
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
