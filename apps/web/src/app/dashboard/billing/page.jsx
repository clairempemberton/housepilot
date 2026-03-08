"use client";

import { useState } from "react";
import {
  CreditCard,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import useUser from "@/utils/useUser";
import useSubscription from "@/utils/useSubscription";
import AppShell from "../../../components/AppShell";

export default function BillingPage() {
  const { data: user, loading: userLoading } = useUser();
  const {
    hasAccess,
    isInTrial,
    trialDaysRemaining,
    status,
    currentPeriodEnd,
    openBillingPortal,
    startCheckout,
    loading: subLoading,
  } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      await openBillingPortal();
    } catch (err) {
      setError(err.message || "Could not open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    setError(null);
    try {
      await startCheckout();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const formattedPeriodEnd = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const statusLabel =
    status === "active"
      ? "Active"
      : status === "trialing"
        ? "Free Trial"
        : status === "past_due"
          ? "Past Due"
          : status === "canceled"
            ? "Canceled"
            : "No Plan";

  const StatusIcon =
    status === "active"
      ? CheckCircle2
      : status === "trialing"
        ? Clock
        : AlertTriangle;

  const statusColor =
    status === "active"
      ? "text-[#6666f7]"
      : status === "trialing"
        ? "text-[#6666f7]"
        : status === "past_due"
          ? "text-red-500"
          : "text-gray-400";

  const isLoading = userLoading || subLoading;

  return (
    <AppShell activeTab="/dashboard/billing">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Billing</h1>

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-12">
            Loading billing info...
          </p>
        ) : (
          <div className="space-y-6">
            {/* Current Plan Card */}
            <div className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-base font-medium text-gray-900">
                    HousePilot Premium
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">$10/month</p>
                </div>
                <div className={`flex items-center space-x-1.5 ${statusColor}`}>
                  <StatusIcon size={16} />
                  <span className="text-sm font-medium">{statusLabel}</span>
                </div>
              </div>

              {/* Trial info */}
              {isInTrial && (
                <div className="bg-[#ededfe] rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Clock size={14} className="text-[#4d4dc7]" />
                    <p className="text-xs text-[#4d4dc7] font-medium">
                      Free trial — {trialDaysRemaining}{" "}
                      {trialDaysRemaining === 1 ? "day" : "days"} remaining
                    </p>
                  </div>
                  <p className="text-xs text-[#4d4dc7] mt-1 ml-6">
                    Your card will be charged $10/month when the trial ends.
                  </p>
                </div>
              )}

              {/* Active info */}
              {status === "active" && formattedPeriodEnd && (
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                  <Calendar size={14} />
                  <span>Next billing date: {formattedPeriodEnd}</span>
                </div>
              )}

              {/* Past due warning */}
              {status === "past_due" && (
                <div className="bg-red-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={14} className="text-red-500" />
                    <p className="text-xs text-red-700 font-medium">
                      Payment failed. Please update your payment method to keep
                      access.
                    </p>
                  </div>
                </div>
              )}

              {/* Canceled info */}
              {status === "canceled" && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-600">
                    Your subscription has been canceled.
                    {formattedPeriodEnd
                      ? ` You have access until ${formattedPeriodEnd}.`
                      : " You can resubscribe anytime."}
                  </p>
                </div>
              )}

              {/* Actions */}
              {(status === "active" ||
                status === "trialing" ||
                status === "past_due") && (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="flex items-center space-x-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <CreditCard size={14} />
                  <span>
                    {portalLoading ? "Opening..." : "Manage Subscription"}
                  </span>
                  <ExternalLink size={12} className="text-gray-400" />
                </button>
              )}

              {(status === "canceled" || status === "none") && (
                <button
                  onClick={handleSubscribe}
                  disabled={checkoutLoading}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#6666f7] text-white rounded-xl text-sm font-medium hover:bg-[#4d4dc7] transition-colors disabled:opacity-50"
                >
                  <span>
                    {checkoutLoading ? "Loading..." : "Subscribe — $10/month"}
                  </span>
                  <ArrowRight size={14} />
                </button>
              )}

              {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
            </div>

            {/* What's included */}
            <div className="border border-gray-100 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                What's included
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Unlimited tasks & lists",
                  "Calendar & scheduling",
                  "Supply tracking",
                  "Progress analytics",
                  "Mental load analysis",
                  "Autopilot mode",
                  "AI assistant",
                  "Home maintenance",
                ].map((feature) => (
                  <div key={feature} className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-[#6666f7]" />
                    <span className="text-xs text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Help section */}
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">
                Need help? Contact us at support@housepilot.com
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
