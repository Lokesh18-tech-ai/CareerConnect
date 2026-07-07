import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { MapPin, Globe, Users, Calendar, Star, ArrowLeft, Briefcase, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobCard } from "@/components/JobCard";
import { getInitials, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

interface Company { id: number; name: string; logo?: string | null; industry?: string | null; location?: string | null; size?: string | null; website?: string | null; description?: string | null; founded?: number | null; openPositions?: number | null; rating?: number | null; reviewCount?: number | null; }
interface Job { id: number; title: string; companyName?: string | null; companyLogo?: string | null; location: string; type: string; level: string; salary?: string | null; featured: boolean; createdAt: string; }
interface Review { id: number; rating: number; title?: string | null; pros?: string | null; cons?: string | null; recommend: boolean; reviewerName?: string | null; createdAt: string; }

export default function CompanyDetailPage() {
  const [, params] = useRoute("/companies/:id");
  const { user, token } = useAuth();
  const id = parseInt(params?.id ?? "0", 10);

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", pros: "", cons: "", recommend: true });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`${API}/companies/${id}`).then(r => r.json()),
      fetch(`${API}/jobs?companyId=${id}&limit=20`).then(r => r.json()),
      fetch(`${API}/reviews?companyId=${id}`).then(r => r.json()),
    ]).then(([co, jobData, rev]) => {
      setCompany(co as Company);
      setJobs(Array.isArray((jobData as { jobs: Job[] }).jobs) ? (jobData as { jobs: Job[] }).jobs : []);
      setReviews(Array.isArray(rev) ? rev as Review[] : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) return;
    setSubmittingReview(true);
    const res = await fetch(`${API}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({ ...reviewForm, companyId: id, userId: user.id }),
    });
    if (res.ok) {
      const newReview = await res.json() as Review;
      setReviews(prev => [newReview, ...prev]);
      setReviewForm({ rating: 5, title: "", pros: "", cons: "", recommend: true });
    }
    setSubmittingReview(false);
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-secondary rounded w-1/2" /><div className="h-40 bg-secondary rounded" /></div></div>;
  if (!company) return <div className="max-w-5xl mx-auto px-4 py-8 text-center"><h2 className="text-xl font-semibold">Company not found</h2><Link href="/companies"><Button variant="outline" className="mt-4">Back</Button></Link></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/companies">
        <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Companies
        </button>
      </Link>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 mb-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-secondary border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
            {company.logo ? <img src={company.logo} alt={company.name} className="w-full h-full object-contain p-2" /> : <span className="text-2xl font-bold text-muted-foreground">{getInitials(company.name)}</span>}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-company-name">{company.name}</h1>
            {company.industry && <p className="text-muted-foreground text-sm mt-0.5">{company.industry}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              {company.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{company.location}</span>}
              {company.size && <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{company.size} employees</span>}
              {company.founded && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Founded {company.founded}</span>}
              {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Globe className="w-3.5 h-3.5" />Website</a>}
            </div>
            <div className="flex items-center gap-4 mt-4">
              {company.rating != null && (
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                  <span className="font-semibold text-foreground">{Number(company.rating).toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">({company.reviewCount ?? 0} reviews)</span>
                </div>
              )}
              <span className="flex items-center gap-1.5 text-primary font-medium text-sm"><Briefcase className="w-4 h-4" />{company.openPositions ?? 0} open positions</span>
            </div>
          </div>
        </div>
        {company.description && <p className="mt-4 text-muted-foreground leading-relaxed">{company.description}</p>}
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-4">
          {jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No open positions at this time</div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-amber-400 stroke-amber-400" : "stroke-muted-foreground"}`} />)}
                    <span className="text-sm font-medium text-foreground ml-1">{review.rating}/5</span>
                  </div>
                  {review.title && <h4 className="font-semibold text-foreground mt-1">{review.title}</h4>}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{review.reviewerName ?? "Anonymous"}</p>
                  <p>{formatDate(review.createdAt)}</p>
                </div>
              </div>
              {review.pros && <div className="mt-3"><p className="text-xs font-medium text-green-600 mb-0.5">Pros</p><p className="text-sm text-muted-foreground">{review.pros}</p></div>}
              {review.cons && <div className="mt-2"><p className="text-xs font-medium text-red-600 mb-0.5">Cons</p><p className="text-sm text-muted-foreground">{review.cons}</p></div>}
              {review.recommend && <div className="mt-3 flex items-center gap-1 text-xs text-green-600"><ThumbsUp className="w-3 h-3" />Would recommend</div>}
            </div>
          ))}

          {user && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h4 className="font-semibold text-foreground mb-4">Write a Review</h4>
              <form onSubmit={handleReview} className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Rating:</label>
                  <select value={reviewForm.rating} onChange={e => setReviewForm(f => ({ ...f, rating: parseInt(e.target.value, 10) }))}
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} stars</option>)}
                  </select>
                </div>
                <input placeholder="Review title" value={reviewForm.title} onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <textarea placeholder="Pros..." value={reviewForm.pros} onChange={e => setReviewForm(f => ({ ...f, pros: e.target.value }))}
                  rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                <textarea placeholder="Cons..." value={reviewForm.cons} onChange={e => setReviewForm(f => ({ ...f, cons: e.target.value }))}
                  rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                <div className="flex items-center gap-2 text-sm">
                  <input type="checkbox" id="rec" checked={reviewForm.recommend} onChange={e => setReviewForm(f => ({ ...f, recommend: e.target.checked }))} className="rounded" />
                  <label htmlFor="rec" className="text-muted-foreground">I recommend this company</label>
                </div>
                <Button type="submit" size="sm" disabled={submittingReview}>{submittingReview ? "Submitting..." : "Submit Review"}</Button>
              </form>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
