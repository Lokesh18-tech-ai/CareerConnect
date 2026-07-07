import { useState, useEffect, useCallback } from "react";
import { Search, Building2 } from "lucide-react";
import { CompanyCard } from "@/components/CompanyCard";

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

interface Company { id: number; name: string; logo?: string | null; industry?: string | null; location?: string | null; openPositions?: number | null; rating?: number | null; reviewCount?: number | null; description?: string | null; }

const INDUSTRIES = ["all", "Technology", "Fintech", "Travel & Hospitality", "E-Commerce", "Productivity", "Healthcare", "Education"];

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (industry !== "all") q.set("industry", industry);
    try {
      const res = await fetch(`${API}/companies?${q}`);
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch { setCompanies([]); } finally { setLoading(false); }
  }, [search, industry]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Companies</h1>
        <p className="text-muted-foreground mt-1 text-sm">Discover {companies.length} companies hiring right now</p>
      </div>

      <div className="bg-card border border-white/8 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search companies..."
            className="w-full bg-muted border border-white/10 text-foreground text-sm rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
            value={search} onChange={e => setSearch(e.target.value)}
            data-testid="input-search-companies"
          />
        </div>
        <select
          className="bg-card border border-white/10 text-foreground text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
          value={industry} onChange={e => setIndustry(e.target.value)}
        >
          {INDUSTRIES.map(i => <option key={i} value={i}>{i === "all" ? "All industries" : i}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-white/8 rounded-xl p-5 animate-pulse h-44">
              <div className="flex gap-3"><div className="w-12 h-12 bg-white/8 rounded-xl" /><div className="space-y-2 flex-1 pt-1"><div className="h-4 bg-white/8 rounded w-2/3" /><div className="h-3 bg-white/8 rounded w-1/3" /></div></div>
            </div>
          ))}
        </div>
      ) : companies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(co => <CompanyCard key={co.id} company={co} />)}
        </div>
      ) : (
        <div className="text-center py-20 border border-white/6 rounded-2xl">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">No companies found</h3>
          <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
