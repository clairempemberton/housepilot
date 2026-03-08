import {
  Home,
  CheckSquare,
  ListTodo,
  Calendar,
  Users,
  MessageSquare,
  LogOut,
  Menu,
  X,
  BarChart3,
  Package,
  Zap,
  Wrench,
  Target,
  Brain,
  CreditCard,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import useSubscription from "../utils/useSubscription";
import useUser from "../utils/useUser";

const GREEN = "#6666f7";

const PRIMARY_NAV = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/dashboard/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/dashboard/lists", icon: ListTodo, label: "Lists" },
  { href: "/dashboard/supplies", icon: Package, label: "Supplies" },
  { href: "/dashboard/calendar", icon: Calendar, label: "Calendar" },
  { href: "/dashboard/maintenance", icon: Wrench, label: "Maintenance" },
];

const SECONDARY_NAV = [
  { href: "/dashboard/progress", icon: BarChart3, label: "Progress" },
  { href: "/dashboard/goals", icon: Target, label: "Goals" },
  { href: "/dashboard/mental-load", icon: Brain, label: "Mental Load" },
  { href: "/dashboard/household", icon: Users, label: "Household" },
  { href: "/dashboard/autopilot", icon: Zap, label: "Autopilot" },
  { href: "/dashboard/assistant", icon: MessageSquare, label: "AI Assistant" },
];

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

// Pages that should NOT be blocked by the subscription guard
const EXEMPT_PATHS = [
  "/upgrade",
  "/dashboard/billing",
  "/onboarding",
  "/account",
];

export default function AppShell({ children, activeTab }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const { data: user, loading: userLoading } = useUser();
  const {
    hasAccess,
    isInTrial,
    trialDaysRemaining,
    status,
    loading: subLoading,
  } = useSubscription();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  // Subscription guard — redirect to /upgrade if no access
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (userLoading || subLoading) return;
    if (!user) return; // let the page-level auth guard handle unauthenticated users

    const path = window.location.pathname;
    // Don't redirect if on an exempt path
    const isExempt = EXEMPT_PATHS.some(
      (ep) => path === ep || path.startsWith(ep + "/"),
    );
    if (isExempt) return;

    if (!hasAccess) {
      setRedirecting(true);
      window.location.href = "/upgrade";
    }
  }, [userLoading, subLoading, user, hasAccess]);

  const activePath = activeTab || currentPath;

  const renderNavItem = (item) => {
    const isActive =
      activePath === item.href || activePath.startsWith(item.href + "/");
    const IconComponent = item.icon;
    return (
      <a
        key={item.href}
        href={item.href}
        className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-sm transition-colors ${
          isActive
            ? "bg-[#ededfe] text-[#4d4dc7] font-medium"
            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
        }`}
      >
        <IconComponent size={16} />
        <span>{item.label}</span>
      </a>
    );
  };

  // Don't render the full shell while redirecting — prevents jarring flash
  if (redirecting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  // Trial/subscription banner logic
  const showTrialBanner = !subLoading && user && isInTrial;
  const showExpiredBanner =
    !subLoading &&
    user &&
    !hasAccess &&
    status !== "none" &&
    status !== "loading";

  return (
    <div className="min-h-screen bg-white flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-gray-100 bg-white">
        <div className="px-5 py-5 border-b border-gray-100">
          <a href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#6666f7] rounded-xl flex items-center justify-center">
              <Home size={15} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">
              HousePilot
            </span>
          </a>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {PRIMARY_NAV.map(renderNavItem)}
          <div className="h-px bg-gray-100 my-3" />
          <p className="px-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
            Insights & AI
          </p>
          {SECONDARY_NAV.map(renderNavItem)}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
          <a
            href="/dashboard/billing"
            className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-sm transition-colors ${
              activePath === "/dashboard/billing"
                ? "bg-[#ededfe] text-[#4d4dc7] font-medium"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <CreditCard size={16} />
            <span>Billing</span>
          </a>
          <a
            href="/account/logout"
            className="flex items-center space-x-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </a>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <a href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#6666f7] rounded-xl flex items-center justify-center">
              <Home size={15} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">
              HousePilot
            </span>
          </a>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-600"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 space-y-0.5">
            {ALL_NAV.map((item) => {
              const isActive = activePath === item.href;
              const IconComponent = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-sm ${isActive ? "bg-[#ededfe] text-[#4d4dc7] font-medium" : "text-gray-500"}`}
                >
                  <IconComponent size={16} />
                  <span>{item.label}</span>
                </a>
              );
            })}
            <a
              href="/dashboard/billing"
              className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-sm ${activePath === "/dashboard/billing" ? "bg-[#ededfe] text-[#4d4dc7] font-medium" : "text-gray-500"}`}
            >
              <CreditCard size={16} />
              <span>Billing</span>
            </a>
            <a
              href="/account/logout"
              className="flex items-center space-x-3 px-3 py-2 rounded-xl text-sm text-gray-500"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </a>
          </div>
        )}

        {/* Trial Banner */}
        {showTrialBanner && (
          <div className="bg-[#ededfe] border-b border-[#c4c4fb] px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock size={14} className="text-[#4d4dc7]" />
              <p className="text-xs text-[#4d4dc7] font-medium">
                You're on a free trial. {trialDaysRemaining}{" "}
                {trialDaysRemaining === 1 ? "day" : "days"} left. Then
                $10/month.
              </p>
            </div>
            <a
              href="/dashboard/billing"
              className="text-xs text-[#4d4dc7] font-medium hover:underline"
            >
              View plan
            </a>
          </div>
        )}

        {/* Expired Banner */}
        {showExpiredBanner && (
          <div className="bg-red-50 border-b border-red-100 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={14} className="text-red-500" />
              <p className="text-xs text-red-700 font-medium">
                Your trial has ended. Upgrade to continue using HousePilot.
              </p>
            </div>
            <a
              href="/upgrade"
              className="text-xs px-3 py-1 bg-[#6666f7] text-white rounded-lg font-medium hover:bg-[#4d4dc7] transition-colors"
            >
              Upgrade
            </a>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
