import { Outlet, Navigate, useLocation, NavLink, useNavigate } from 'react-router';
import { useAuth } from './lib/auth';
import { Target, Settings, LogOut, ArrowUpRight, Zap, CheckCircle2, Menu, X, MessageSquare, BarChart3 } from 'lucide-react';
import { cn } from './components/shared';
import { useAppStore } from './lib/store';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';
import newSvgPaths from "../imports/svg-ouag2489bx";
import { isLoggedToday } from './lib/constants';

export function RootLayout() {
  return (
    <div className="min-h-screen bg-[#F7FAFA] flex flex-col font-['Manrope',system-ui,sans-serif] text-stride-900 antialiased">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'Manrope, system-ui, sans-serif',
            borderRadius: '14px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 24px rgba(59,136,149,0.10)',
            border: '1px solid rgba(59,136,149,0.08)',
          },
        }}
      />
      <Outlet />
    </div>
  );
}

const navItems = [
  { icon: MessageSquare, label: 'Agent', to: '/dashboard', end: true },
  { icon: Target, label: 'Goals', to: '/dashboard/goals' },
  { icon: CheckCircle2, label: 'Check-in', to: '/dashboard/check-in' },
  { icon: BarChart3, label: 'Insights', to: '/dashboard/insights' },
];

// Brand logo SVG component
function NudgeLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className="shrink-0"
    >
      <path d={newSvgPaths.pf24700} fill="url(#nlg0)" />
      <path d={newSvgPaths.p3dc95c00} fill="url(#nlg1)" />
      <defs>
        <radialGradient cx="0" cy="0" gradientTransform="translate(24 25.5) rotate(92.0096) scale(28.5175)" gradientUnits="userSpaceOnUse" id="nlg0" r="1">
          <stop stopColor="#56EFFF" />
          <stop offset="1" stopColor="#004A53" />
        </radialGradient>
        <radialGradient cx="0" cy="0" gradientTransform="translate(24 25.5) rotate(92.0096) scale(28.5175)" gradientUnits="userSpaceOnUse" id="nlg1" r="1">
          <stop stopColor="#56EFFF" />
          <stop offset="1" stopColor="#004A53" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function DashboardLayout() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const allLoggedToday = (() => {
    const active = state.goals.filter(g => g.status === 'active');
    if (active.length === 0) return false;
    return active.every(g => isLoggedToday(g));
  })();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Show loading screen during auth check or state hydration
  if (loading || (user && state._hydrating)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7FAFA]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-11 h-11 flex items-center justify-center animate-pulse">
            <NudgeLogo size={40} />
          </div>
          <span className="text-sm font-medium text-stride-400">
            {state._hydrating ? 'Restoring your data...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-[#F7FAFA] font-['Manrope',system-ui,sans-serif] text-stride-900 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-white/90 backdrop-blur-xl border-b border-stride-100/80 z-50 shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 active:opacity-70 transition-opacity"
        >
          <span className="text-stride-800"><NudgeLogo size={28} /></span>
          <span className="text-base font-extrabold tracking-tight bg-gradient-to-br from-[#3B8895] to-[#004A53] bg-clip-text text-transparent">Nudge</span>
        </button>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-stride-50 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5 text-stride-700" /> : <Menu className="w-5 h-5 text-stride-700" />}
        </button>
      </div>

      {/* Mobile Slide-down Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stride-900/15 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="fixed top-14 left-0 right-0 bg-white z-50 md:hidden border-b border-stride-100 shadow-xl shadow-stride-900/5 rounded-b-2xl overflow-hidden"
            >
              <nav className="p-3 space-y-0.5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all",
                        isActive
                          ? "bg-stride-800 text-white"
                          : "text-stride-600 hover:bg-stride-50 active:bg-stride-100"
                      )
                    }
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    {item.label}
                  </NavLink>
                ))}

                <div className="h-px bg-stride-100 my-2" />

                <NavLink
                  to="/dashboard/settings"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all",
                      isActive ? "bg-stride-800 text-white" : "text-stride-600 hover:bg-stride-50"
                    )
                  }
                >
                  <Settings className="w-[18px] h-[18px]" />
                  Settings
                </NavLink>

                {/* Upgrade CTA - Mobile */}
                {!state.userState?.isPremium && (
                  <NavLink
                    to="/dashboard/upgrade"
                    className="flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-bold text-stride-800 bg-gradient-to-r from-stride-50 to-stride-100 border border-stride-200/50 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 text-stride-600 fill-stride-600" />
                      Upgrade to Pro
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-stride-600" />
                  </NavLink>
                )}
                {state.userState?.isPremium && (
                  <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-sm font-bold text-stride-700 bg-stride-50">
                    <Zap className="w-4 h-4 fill-current" />
                    Pro Member
                  </div>
                )}

                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-stride-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[240px] flex-col bg-white border-r border-stride-100/60 z-10 shrink-0">
        <div className="p-5 pb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <span className="text-stride-800"><NudgeLogo size={32} /></span>
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-br from-[#3B8895] to-[#004A53] bg-clip-text text-transparent">Nudge</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150",
                  isActive
                    ? "bg-stride-800 text-white shadow-sm shadow-stride-800/15"
                    : "text-stride-500 hover:text-stride-800 hover:bg-stride-50"
                )
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-stride-100/60 space-y-1">
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors",
                isActive
                  ? "text-stride-800 bg-stride-100"
                  : "text-stride-500 hover:text-stride-800 hover:bg-stride-50"
              )
            }
          >
            <Settings className="w-[18px] h-[18px]" /> Settings
          </NavLink>

          {state.userState?.isPremium ? (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-stride-700 bg-stride-50">
              <Zap className="w-4 h-4 fill-current" /> Pro Member
            </div>
          ) : (
            <NavLink
              to="/dashboard/upgrade"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-stride-800 bg-gradient-to-r from-stride-50 to-stride-100 hover:from-stride-100 hover:to-stride-200 transition-colors border border-stride-200/40"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-stride-600 fill-stride-600" /> Upgrade Pro
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-stride-600" />
            </NavLink>
          )}

          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-stride-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="w-full min-h-full pb-20 md:pb-0">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-stride-100/60 pb-[env(safe-area-inset-bottom)] z-50">
        <nav className="flex items-center justify-around px-1 h-16">
          {navItems.slice(0, 4).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors rounded-xl",
                  isActive ? "text-stride-800" : "text-stride-400"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    isActive ? "bg-stride-100" : ""
                  )}>
                    <item.icon className={cn("w-5 h-5", isActive && "text-stride-700")} />
                    {item.label === 'Check-in' && allLoggedToday && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <span className={cn("text-[10px] font-semibold -mt-0.5", isActive && "text-stride-700")}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}