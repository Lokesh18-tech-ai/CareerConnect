import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/AuthProvider";
import { useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/Navbar";
import HomePage from "@/pages/Home";
import JobsPage from "@/pages/Jobs";
import JobDetailPage from "@/pages/JobDetail";
import CompaniesPage from "@/pages/Companies";
import CompanyDetailPage from "@/pages/CompanyDetail";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import ApplicationsPage from "@/pages/Applications";
import SavedJobsPage from "@/pages/SavedJobs";
import NotificationsPage from "@/pages/Notifications";
import RecruiterDashboardPage from "@/pages/RecruiterDashboard";
import AdminPage from "@/pages/Admin";
import AIDashboardPage from "@/pages/ai/AIDashboard";
import ResumeBuilderPage from "@/pages/ai/ResumeBuilder";
import ResumeAnalyzerPage from "@/pages/ai/ResumeAnalyzer";
import ATSCheckerPage from "@/pages/ai/ATSChecker";
import CoverLetterGeneratorPage from "@/pages/ai/CoverLetterGenerator";
import CareerRoadmapPage from "@/pages/ai/CareerRoadmap";
import InterviewCoachPage from "@/pages/ai/InterviewCoach";
import MockInterviewPage from "@/pages/ai/MockInterview";
import ProfileViewPage from "@/pages/ProfileView";
import ProfileEditPage from "@/pages/ProfileEdit";
import SettingsPage from "@/pages/Settings";
import ChangePasswordPage from "@/pages/ChangePassword";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Router() {
  const { isAuthenticated } = useAuth();

  // Unauthenticated visitors always land on the premium auth page, regardless
  // of which path they requested — this is the new default entry point.
  // Once authenticated, the full route table below becomes available again.
  if (!isAuthenticated) {
    return (
      <main>
        <LoginPage />
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/jobs" component={JobsPage} />
          <Route path="/jobs/:id" component={JobDetailPage} />
          <Route path="/companies" component={CompaniesPage} />
          <Route path="/companies/:id" component={CompanyDetailPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/applications" component={ApplicationsPage} />
          <Route path="/saved-jobs" component={SavedJobsPage} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/recruiter" component={RecruiterDashboardPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/ai" component={AIDashboardPage} />
          <Route path="/ai/resume-builder" component={ResumeBuilderPage} />
          <Route path="/ai/resume-analyzer" component={ResumeAnalyzerPage} />
          <Route path="/ai/ats-checker" component={ATSCheckerPage} />
          <Route path="/ai/cover-letter" component={CoverLetterGeneratorPage} />
          <Route path="/ai/career-roadmap" component={CareerRoadmapPage} />
          <Route path="/ai/interview-coach" component={InterviewCoachPage} />
          <Route path="/ai/mock-interview" component={MockInterviewPage} />
          <Route path="/profile" component={ProfileViewPage} />
          <Route path="/profile/edit" component={ProfileEditPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/settings/change-password" component={ChangePasswordPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
