import { Link, useLocation } from "wouter";
import {
  Briefcase,
  Home,
  Building2,
  Bot,
  Bell,
  Heart,
  ClipboardList,
  LayoutDashboard,
  User,
  Settings,
  Pencil,
  Menu,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getInitials, cn } from "@/lib/utils";

const primaryLinks = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/jobs", label: "Find Jobs", icon: Briefcase },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/ai", label: "AI Career Tools", icon: Bot },
];

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    const path = href.split("?")[0];
    if (exact) return location === path;
    return location === path || (path !== "/" && location.startsWith(path));
  };

  // ── Pre-login: minimal navbar (Logo left, Sign In / Get Started right) ──
  if (!isAuthenticated || !user) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border glass-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-[72px] items-center justify-between">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-105 group-hover:rotate-3">
                  <Briefcase className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-base text-foreground tracking-tight">CareerConnect</span>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <button className="px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150">
                  Sign In
                </button>
              </Link>
              <Link href="/login?tab=register">
                <button className="px-4 py-1.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-sm hover:shadow transition-all duration-150 hover:-translate-y-px active:translate-y-0">
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ── Post-login: full, role-aware navigation ──
  const isRecruiterLike = user.role === "recruiter" || user.role === "admin";
  const dashboardHref = user.role === "recruiter" ? "/recruiter" : user.role === "admin" ? "/admin" : "/dashboard";
  const dashboardLabel = user.role === "recruiter" ? "Recruiter Dashboard" : user.role === "admin" ? "Admin Panel" : "Dashboard";

  const accountLinks = isRecruiterLike
    ? [
        { href: dashboardHref, label: dashboardLabel, icon: LayoutDashboard },
        { href: "/notifications", label: "Notifications", icon: Bell, dot: true },
      ]
    : [
        { href: dashboardHref, label: dashboardLabel, icon: LayoutDashboard },
        { href: "/applications", label: "My Applications", icon: ClipboardList },
        { href: "/saved-jobs", label: "Saved Jobs", icon: Heart },
        { href: "/notifications", label: "Notifications", icon: Bell, dot: true },
      ];

  const goTo = (href: string) => {
    setLocation(href);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 3-column grid: logo (auto) | nav (centered, 1fr) | avatar (auto).
            Using fixed grid columns instead of flex+gaps means the middle
            section's content (which changes length between roles) never
            shifts the logo or avatar — that was the source of the alignment
            bug. */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-[72px] gap-4">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-105 group-hover:rotate-3">
                <Briefcase className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="hidden sm:inline font-bold text-base text-foreground tracking-tight">CareerConnect</span>
            </div>
          </Link>

          {/* Centered nav (desktop) */}
          <nav aria-label="Primary" className="hidden min-[1500px]:flex items-center justify-center gap-1">
            {primaryLinks.map((link) => {
              const active = isActive(link.href, link.exact);
              const Icon = link.icon;
              return (
                <Link key={link.label} href={link.href}>
                  <span
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer whitespace-nowrap",
                      active ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted hover:-translate-y-px"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                    {active && <span className="absolute left-4 right-4 -bottom-[11px] h-0.5 rounded-full bg-primary" />}
                  </span>
                </Link>
              );
            })}
            <div className="w-px h-5 bg-border mx-2" />
            {accountLinks.map((link) => {
              const active = isActive(link.href);
              const Icon = link.icon;
              return (
                <Link key={link.label} href={link.href}>
                  <span
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer whitespace-nowrap",
                      active ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                    {link.dot && <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Right: avatar (always far right — third grid column, never shifts) */}
          <div className="flex items-center justify-end gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-muted hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Open profile menu"
                >
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={user.avatar ?? ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-64 rounded-2xl p-1.5 glass-panel border-border shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center gap-3 px-2.5 py-2.5">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={user.avatar ?? ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="rounded-lg gap-2 py-2">
                  <User className="h-4 w-4" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/profile/edit")} className="rounded-lg gap-2 py-2">
                  <Pencil className="h-4 w-4" /> Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/settings")} className="rounded-lg gap-2 py-2">
                  <Settings className="h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <ThemeToggle variant="row" className="rounded-lg py-2" />
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  className="min-[1500px]:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-80 p-0 flex flex-col glass-panel">
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-base text-foreground">CareerConnect</span>
                </div>

                <nav aria-label="Mobile primary" className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                  {primaryLinks.map((link) => {
                    const active = isActive(link.href, link.exact);
                    const Icon = link.icon;
                    return (
                      <button
                        key={link.label}
                        onClick={() => goTo(link.href)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 text-left",
                          active ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                        {link.label}
                      </button>
                    );
                  })}

                  <div className="my-3 h-px bg-border" />
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your account</p>
                  {accountLinks.map((link) => {
                    const active = isActive(link.href);
                    const Icon = link.icon;
                    return (
                      <button
                        key={link.label}
                        onClick={() => goTo(link.href)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150",
                          active ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="w-[18px] h-[18px]" /> {link.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goTo("/profile")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
                  >
                    <User className="w-[18px] h-[18px]" /> Profile
                  </button>
                  <button
                    onClick={() => goTo("/settings")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
                  >
                    <Settings className="w-[18px] h-[18px]" /> Settings
                  </button>
                </nav>

                <div className="border-t border-border px-4 py-4">
                  <ThemeToggle variant="row" className="px-2" />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
