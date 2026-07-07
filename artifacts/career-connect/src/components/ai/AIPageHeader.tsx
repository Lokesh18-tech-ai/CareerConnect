import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: string;
}

export function AIPageHeader({ icon: Icon, title, description, gradient = "from-primary to-blue-400" }: AIPageHeaderProps) {
  return (
    <div className="mb-8">
      <Link href="/ai">
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group">
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to AI Dashboard
        </button>
      </Link>
      <div className="flex items-start gap-4">
        <div className={cn("flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-sm", gradient)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{description}</p>
        </div>
      </div>
    </div>
  );
}
