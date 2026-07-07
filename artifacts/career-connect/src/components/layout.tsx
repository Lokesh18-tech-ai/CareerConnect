import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { 
  Briefcase, 
  Building2, 
  LayoutDashboard, 
  Menu, 
  Search, 
  UserCircle,
  LogOut,
  Bot
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const navigation = [
    { name: "Find Jobs", href: "/jobs", icon: Search },
    { name: "Companies", href: "/companies", icon: Building2 },
    { name: "AI Tools", href: "/ai", icon: Bot },
  ];

  if (user?.role === "admin") {
    navigation.push({ name: "Admin", href: "/admin", icon: LayoutDashboard });
  } else if (user?.role === "recruiter") {
    navigation.push({ name: "Dashboard", href: "/recruiter", icon: LayoutDashboard });
  } else if (isAuthenticated) {
    navigation.push({ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg group-hover:scale-105 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight">CareerConnect</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = location === item.href || location.startsWith(`${item.href}/`);
                return (
                  <Link key={item.name} href={item.href}>
                    <Button 
                      variant={isActive ? "secondary" : "ghost"} 
                      className={`text-sm font-medium ${isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link href="/login">
                  <Button>Sign up</Button>
                </Link>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {user?.name?.charAt(0) || "U"}
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/profile")}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  {user?.role === "jobseeker" && (
                    <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                  )}
                  {user?.role === "recruiter" && (
                    <DropdownMenuItem onClick={() => setLocation("/recruiter")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Recruiter Dashboard</span>
                    </DropdownMenuItem>
                  )}
                  {user?.role === "admin" && (
                    <DropdownMenuItem onClick={() => setLocation("/admin")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Admin Panel</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-4 mt-6">
                  {navigation.map((item) => (
                    <Link key={item.name} href={item.href}>
                      <Button variant="ghost" className="w-full justify-start text-lg">
                        <item.icon className="mr-2 h-5 w-5" />
                        {item.name}
                      </Button>
                    </Link>
                  ))}
                  {!isAuthenticated ? (
                    <>
                      <div className="h-px bg-border my-2" />
                      <Link href="/login">
                        <Button variant="outline" className="w-full">Log in</Button>
                      </Link>
                      <Link href="/login">
                        <Button className="w-full">Sign up</Button>
                      </Link>
                    </>
                  ) : null}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t bg-muted/40 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary text-primary-foreground p-1 rounded">
                  <Briefcase className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm">CareerConnect</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Where ambition meets opportunity. The professional network for the modern age.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-4">For Job Seekers</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/jobs" className="hover:text-foreground transition-colors">Browse Jobs</Link></li>
                <li><Link href="/companies" className="hover:text-foreground transition-colors">Company Directory</Link></li>
                <li><Link href="/ai" className="hover:text-foreground transition-colors">AI Resume Review</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4">For Employers</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground transition-colors">Post a Job</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Recruiter Dashboard</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} CareerConnect. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
