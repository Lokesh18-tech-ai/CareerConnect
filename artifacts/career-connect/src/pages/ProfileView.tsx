import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  MapPin, Mail, Pencil, FileText, Download, Briefcase, GraduationCap,
  Building2, CalendarDays,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials, computeProfileCompletion } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { getProfileExtras, type ProfileExtras } from "@/lib/profileExtras";

export default function ProfileViewPage() {
  const { user } = useAuth();
  const [extras, setExtras] = useState<ProfileExtras | null>(null);

  useEffect(() => {
    if (user) setExtras(getProfileExtras(user.id));
  }, [user]);

  if (!user) {
    return <div className="text-center py-20"><p>Please <Link href="/login"><span className="text-primary underline cursor-pointer">sign in</span></Link> to view your profile.</p></div>;
  }
  if (!extras) {
    return <div className="max-w-3xl mx-auto px-4 py-8"><Skeleton className="h-64 rounded-2xl" /></div>;
  }

  const completion = computeProfileCompletion({
    name: user.name, avatar: user.avatar, bio: user.bio, location: user.location,
    resumeUrl: user.resumeUrl, skills: user.skills, headline: extras.headline, phone: extras.phone,
    hasEducation: extras.education.length > 0, hasExperience: extras.experience.length > 0,
  });
  const skills = (user.skills ?? "").split(",").map(s => s.trim()).filter(Boolean);

  const downloadResume = () => {
    if (!extras.resumeDataUrl) return;
    const a = document.createElement("a");
    a.href = extras.resumeDataUrl;
    a.download = extras.resumeFileName || "resume";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">A read-only overview of your professional profile</p>
        </div>
        <Link href="/profile/edit">
          <Button className="gap-1.5"><Pencil className="w-4 h-4" /> Edit Profile</Button>
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/90 to-indigo-700 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar className="w-20 h-20 border-2 border-white/30 shadow-lg">
              <AvatarImage src={user.avatar ?? ""} />
              <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white truncate">{user.name}</h2>
              {extras.headline && <p className="text-indigo-100 font-medium mt-0.5">{extras.headline}</p>}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-indigo-100">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
                {user.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {user.location}</span>}
              </div>
            </div>
            <div className="sm:text-right flex-shrink-0">
              <div className="text-3xl font-extrabold text-white">{completion.percent}%</div>
              <div className="text-xs text-indigo-100">Profile complete</div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* About */}
          <Section title="About Me">
            {user.bio ? <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{user.bio}</p> : <EmptyNote text="No about-me section added yet." />}
          </Section>

          {/* Skills */}
          <Section title="Skills">
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map(s => <span key={s} className="text-xs px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full font-medium">{s}</span>)}
              </div>
            ) : <EmptyNote text="No skills added yet." />}
          </Section>

          {/* Education */}
          <Section title="Education">
            {extras.education.length > 0 ? (
              <div className="space-y-3">
                {extras.education.map(ed => (
                  <div key={ed.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/30">
                    <GraduationCap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{ed.degree}{ed.branch && `, ${ed.branch}`}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ed.school}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{[ed.cgpa && `CGPA: ${ed.cgpa}`, ed.graduationYear].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyNote text="No education added yet." />}
          </Section>

          {/* Experience */}
          <Section title="Experience">
            {extras.experience.length > 0 ? (
              <div className="space-y-3">
                {extras.experience.map(ex => (
                  <div key={ex.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/30">
                    <Building2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{ex.role}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ex.company} <span className="text-muted-foreground/70">· {ex.duration}</span></p>
                      {ex.description && <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap">{ex.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyNote text="No experience added yet." />}
          </Section>

          {/* Resume */}
          <Section title="Resume">
            {extras.resumeFileName || user.resumeUrl ? (
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/30">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{extras.resumeFileName || user.resumeUrl}</p>
                  {extras.resumeUpdatedAt && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <CalendarDays className="w-3 h-3" /> Last updated {new Date(extras.resumeUpdatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {extras.resumeDataUrl && (
                  <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={downloadResume}>
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                )}
              </div>
            ) : <EmptyNote text="No resume uploaded yet." />}
          </Section>

          <Link href="/profile/edit">
            <Button variant="outline" className="w-full gap-1.5"><Briefcase className="w-4 h-4" /> Complete or update your profile</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground italic">{text}</p>;
}
