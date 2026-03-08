"use client";

import { useState } from "react";
import {
  Home,
  Check,
  ArrowRight,
  Shield,
  Sparkles,
  CheckSquare,
  Calendar,
  Package,
  BarChart3,
  Brain,
  Zap,
} from "lucide-react";
import useUser from "@/utils/useUser";
import useSubscription from "@/utils/useSubscription";

const FEATURES = [
  { icon: CheckSquare, label: "Unlimited tasks & lists" },
  { icon: Calendar, label: "Full calendar & scheduling" },
  { icon: Package, label: "Supply tracking & alerts" },
  { icon: BarChart3, label: "Progress analytics & streaks" },
  { icon: Brain, label: "Mental load analysis" },
  { icon: Zap, label: "Autopilot mode" },
  { icon: Sparkles, label: "AI assistant & suggestions" },
  { icon: Shield, label: "Home maintenance tracking" },
];

export default function UpgradePage() {
  const { data: user, loading: userLoading } = useUser();
  const {
    hasAccess,
    status,
    startCheckout,
    loading: subLoading,
  } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStartTrial = async () => {
    if (!user) {
      window.location.href = "/account/signup";
      return;
    }
    setCheckoutLoading(true);
    setError(null);
    try {
      await startCheckout();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // If user already has access, show a confirmation and link to dashboard
  if (!subLoading && hasAccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-4">
          <div className="w-12 h-12 bg-[#ededfe] rounded-2xl flex items-center justify-center mx-auto">
            <Check size={24} className="text-[#6666f7]" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            You're all set!
          </h1>
          <p className="text-sm text-gray-500">
            You have an active{" "}
            {status === "trialing" ? "free trial" : "subscription"}.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-[#6666f7] text-white rounded-xl font-medium hover:bg-[#4d4dc7] transition-colors text-sm"
          >
            <span>Go to Dashboard</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-4 sm:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#6666f7] rounded-xl flex items-center justify-center">
              <Home size={15} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">
              HousePilot
            </span>
          </a>
          {user && (
            <a
              href="/dashboard"
              className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
            >
              Back to Dashboard
            </a>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-12 sm:py-20">
        {/* Pricing Card */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-3">
            HousePilot Premium
          </h1>
          <p className="text-gray-500 max-w-sm mx-auto">
            Your AI-powered household operating system. Everything you need to
            keep your home running smoothly.
          </p>
        </div>

        <div className="border border-gray-200 rounded-2xl p-6 sm:p-8 mb-6">
          {/* Price */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center space-x-1 px-3 py-1 bg-[#ededfe] rounded-full text-xs font-medium text-[#4d4dc7] mb-4">
              <Sparkles size={12} />
              <span>3-Day Free Trial</span>
            </div>
            <div className="flex items-baseline justify-center space-x-1">
              <span className="text-4xl font-semibold text-gray-900">$10</span>
              <span className="text-gray-500">/month</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Cancel anytime</p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            {FEATURES.map((feature) => {
              const IconComp = feature.icon;
              return (
                <div
                  key={feature.label}
                  className="flex items-center space-x-3"
                >
                  <div className="w-6 h-6 bg-[#ededfe] rounded-lg flex items-center justify-center flex-shrink-0">
                    <IconComp size={12} className="text-[#4d4dc7]" />
                  </div>
                  <span className="text-sm text-gray-700">{feature.label}</span>
                </div>
              );
            })}
          </div>

          {/* CTA Button */}
          <button
            onClick={handleStartTrial}
            disabled={checkoutLoading || subLoading}
            className="w-full py-3.5 bg-[#6666f7] text-white rounded-xl font-medium hover:bg-[#4d4dc7] transition-all active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center space-x-2"
          >
            <span>{checkoutLoading ? "Loading..." : "Start Free Trial"}</span>
            {!checkoutLoading && <ArrowRight size={16} />}
          </button>

          {error && (
            <p className="text-xs text-red-500 text-center mt-3">{error}</p>
          )}

          <p className="text-[10px] text-gray-400 text-center mt-3">
            Your card will be charged $10/month after the 3-day free trial ends.
            Cancel anytime from the billing page.
          </p>
        </div>

        {/* Sign in link for unauthenticated users */}
        {!user && !userLoading && (
          <p className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <a
              href="/account/signin"
              className="text-[#6666f7] font-medium hover:underline"
            >
              Sign in
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
