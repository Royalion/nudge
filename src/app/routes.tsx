import { createBrowserRouter } from "react-router";
import { RootLayout, DashboardLayout } from "./layouts";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage, SignupPage, ForgotPasswordPage } from "./pages/AuthPages";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GoalsPage } from "./pages/GoalsPage";
import { GoalDetailPage } from "./pages/GoalDetailPage";
import { NewGoalPage } from "./pages/NewGoalPage";
import { CheckInPage } from "./pages/CheckInPage";
import { CoachPage } from "./pages/CoachPage";
import { InsightsPage } from "./pages/InsightsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UpgradePage } from "./pages/UpgradePage";
import { DemoLabsPage } from "./pages/DemoLabsPage";
import { AdminPage } from "./pages/AdminPage";
import { AppStoreProvider } from "./lib/store";
import { AuthProvider } from "./lib/auth";
import { Outlet } from "react-router";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ErrorBoundary } from "./components/ErrorBoundary";

function AppProviders() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppStoreProvider>
          <Outlet />
        </AppStoreProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppProviders,
    children: [
      {
        Component: RootLayout,
        children: [
          { index: true, Component: LandingPage },
          { path: "login", Component: LoginPage },
          { path: "signup", Component: SignupPage },
          { path: "forgot-password", Component: ForgotPasswordPage },
          { path: "onboarding", Component: OnboardingPage },
          { path: "demo-labs", Component: DemoLabsPage },
          { path: "admin", Component: AdminPage },
          {
            path: "dashboard",
            Component: DashboardLayout,
            children: [
              { index: true, Component: DashboardPage },
              { path: "goals", Component: GoalsPage },
              { path: "goals/new", Component: NewGoalPage },
              { path: "goals/:id", Component: GoalDetailPage },
              { path: "check-in", Component: CheckInPage },
              { path: "coach", Component: CoachPage },
              { path: "insights", Component: InsightsPage },
              { path: "settings", Component: SettingsPage },
              { path: "upgrade", Component: UpgradePage },
            ],
          },
          { path: "*", Component: NotFoundPage },
        ],
      },
    ],
  },
]);