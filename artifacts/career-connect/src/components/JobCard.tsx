import { Link } from "wouter";
import { MapPin, Clock, Bookmark, BookmarkCheck, IndianRupee, Briefcase } from "lucide-react";
import { cn, timeAgo, getInitials, avatarColor, typeColor, levelColor, cleanSalary } from "@/lib/utils";

interface Job {
  id: number;
  title: string;
  companyName?: string | null;
  companyLogo?: string | null;
  location: string;
  type: string;
  level: string;
  salary?: string | null;
  featured: boolean;
  createdAt: string;
}

interface JobCardProps {
  job: Job;
  isSaved?: boolean;
  onSave?: (jobId: number) => void;
  onUnsave?: (jobId: number) => void;
  showSave?: boolean;
  compact?: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
};
const LEVEL_LABEL: Record<string, string> = {
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior",
  lead: "Lead",
};

export function JobCard({ job, isSaved, onSave, onUnsave, showSave, compact }: JobCardProps) {
  const colors = avatarColor(job.companyName);

  return (
    <div
      data-testid={`card-job-${job.id}`}
      className={cn(
        "group relative flex flex-col bg-card border rounded-2xl transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30",
        "hover:border-primary/40",
        job.featured
          ? "border-primary/30 shadow-sm shadow-primary/5 ring-1 ring-primary/15"
          : "border-border",
        compact ? "p-4" : "p-5"
      )}
    >
      {/* Featured ribbon */}
      {job.featured && (
        <span className="absolute top-3.5 left-0 -ml-px px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-primary text-primary-foreground rounded-r-full rounded-l-none shadow-sm">
          Featured
        </span>
      )}

      {/* Save button */}
      {showSave && (
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); isSaved ? onUnsave?.(job.id) : onSave?.(job.id); }}
          aria-label={isSaved ? "Unsave job" : "Save job"}
          className={cn(
            "absolute top-3.5 right-3.5 p-1.5 rounded-lg transition-all",
            isSaved
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-primary hover:bg-primary/10"
          )}
          data-testid={`button-save-job-${job.id}`}
        >
          {isSaved
            ? <BookmarkCheck className="w-4 h-4" />
            : <Bookmark className="w-4 h-4" />}
        </button>
      )}

      {/* Header */}
      <div className={cn("flex items-start gap-3", compact ? "mb-3 mt-1" : "mb-4", job.featured && "mt-5")}>
        {/* Avatar */}
        <div className={cn(
          "rounded-xl border flex items-center justify-center font-bold flex-shrink-0 overflow-hidden",
          colors.bg, colors.text, colors.border,
          compact ? "w-9 h-9 text-xs" : "w-11 h-11 text-sm"
        )}>
          {job.companyLogo
            ? <img src={job.companyLogo} alt={job.companyName ?? ""} className="w-full h-full object-contain p-1.5" />
            : getInitials(job.companyName)
          }
        </div>

        {/* Title + company */}
        <div className="min-w-0 flex-1" style={{ paddingRight: showSave ? "2rem" : 0 }}>
          <Link href={`/jobs/${job.id}`}>
            <h3
              className={cn(
                "font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer leading-snug",
                compact ? "text-sm" : "text-[0.9375rem]"
              )}
              data-testid={`text-job-title-${job.id}`}
            >
              {job.title}
            </h3>
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate" data-testid={`text-company-${job.id}`}>
            <Briefcase className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{job.companyName ?? "Company"}</span>
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className={cn("flex flex-wrap items-center gap-1.5", compact ? "mb-3" : "mb-4")}>
        <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap", typeColor(job.type))}>
          {TYPE_LABEL[job.type] ?? job.type}
        </span>
        <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap", levelColor(job.level))}>
          {LEVEL_LABEL[job.level] ?? job.level}
        </span>
        {job.salary && !compact && (
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-0.5 ml-auto">
            <IndianRupee className="w-3 h-3" />
            {cleanSalary(job.salary).replace(/^[₹$]/, "")}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1" data-testid={`text-location-${job.id}`}>
          <MapPin className="w-3 h-3 flex-shrink-0 text-primary/60" />
          <span className="truncate max-w-[130px]">{job.location}</span>
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          <Clock className="w-3 h-3" />
          {timeAgo(job.createdAt)}
        </span>
      </div>
    </div>
  );
}

/** Shimmer skeleton matching the card layout */
export function JobCardSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className={cn(
      "relative flex flex-col bg-card border border-border rounded-2xl animate-pulse",
      compact ? "p-4" : "p-5"
    )}>
      <div className={cn("flex gap-3", compact ? "mb-3" : "mb-4")}>
        <div className={cn("rounded-xl bg-muted flex-shrink-0", compact ? "w-9 h-9" : "w-11 h-11")} />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 bg-muted rounded-full w-3/4" />
          <div className="h-3 bg-muted rounded-full w-1/2" />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-5 w-20 bg-muted rounded-full" />
        <div className="h-5 w-16 bg-muted rounded-full" />
      </div>
      <div className="flex justify-between mt-auto">
        <div className="h-3 w-28 bg-muted rounded-full" />
        <div className="h-3 w-14 bg-muted rounded-full" />
      </div>
    </div>
  );
}
