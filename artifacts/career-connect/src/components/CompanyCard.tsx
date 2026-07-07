import { Link } from "wouter";
import { MapPin, Star, Briefcase } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface Company {
  id: number;
  name: string;
  logo?: string | null;
  industry?: string | null;
  location?: string | null;
  openPositions?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  description?: string | null;
}

export function CompanyCard({ company }: { company: Company }) {
  return (
    <Link href={`/companies/${company.id}`}>
      <div
        data-testid={`card-company-${company.id}`}
        className="group bg-card border border-white/8 rounded-xl p-5 transition-all duration-200 hover:border-primary/40 hover:bg-white/5 cursor-pointer h-full"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-base font-bold text-white/60 flex-shrink-0 overflow-hidden">
            {company.logo
              ? <img src={company.logo} alt={company.name} className="w-full h-full object-contain p-1.5" />
              : getInitials(company.name)
            }
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate" data-testid={`text-company-name-${company.id}`}>
              {company.name ?? "Unknown"}
            </h3>
            {company.industry && (
              <p className="text-xs text-muted-foreground mt-0.5">{company.industry}</p>
            )}
          </div>
        </div>

        {company.description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
            {company.description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          {company.location && (
            <span className="flex items-center gap-1" data-testid={`text-company-location-${company.id}`}>
              <MapPin className="w-3 h-3" />{company.location}
            </span>
          )}
          {company.openPositions != null && company.openPositions > 0 && (
            <span className="flex items-center gap-1 text-primary font-medium">
              <Briefcase className="w-3 h-3" />{company.openPositions} open
            </span>
          )}
          {company.rating != null && (
            <span className="flex items-center gap-1 text-amber-400 font-medium ml-auto">
              <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
              {Number(company.rating).toFixed(1)}
              {company.reviewCount ? <span className="text-muted-foreground font-normal">({company.reviewCount})</span> : null}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
