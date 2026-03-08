import { useCallback, useEffect } from "react";
import { create } from "zustand";

const useSubscriptionStore = create((set, get) => ({
  data: null,
  loading: true,
  lastFetched: null,

  fetchSubscription: async (force) => {
    const state = get();
    // Don't refetch if we fetched less than 30 seconds ago (unless forced)
    if (
      !force &&
      state.lastFetched &&
      Date.now() - state.lastFetched < 30000 &&
      state.data
    ) {
      return;
    }

    try {
      const response = await fetch("/api/subscription");
      if (!response.ok) {
        throw new Error("Failed to check subscription");
      }
      const result = await response.json();
      set({ data: result, loading: false, lastFetched: Date.now() });
    } catch (error) {
      console.error("Error checking subscription:", error);
      set({ loading: false });
    }
  },

  refetch: async () => {
    set({ loading: true });
    const state = get();
    try {
      const response = await fetch("/api/subscription");
      if (!response.ok) {
        throw new Error("Failed to check subscription");
      }
      const result = await response.json();
      set({ data: result, loading: false, lastFetched: Date.now() });
    } catch (error) {
      console.error("Error refetching subscription:", error);
      set({ loading: false });
    }
  },
}));

export function useSubscription() {
  const { data, loading, fetchSubscription, refetch } = useSubscriptionStore();

  useEffect(() => {
    fetchSubscription(false);
  }, [fetchSubscription]);

  const startCheckout = useCallback(async () => {
    try {
      const response = await fetch("/api/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirectURL:
            typeof window !== "undefined" ? window.location.origin : "",
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to start checkout");
      }
      const result = await response.json();
      if (result.url) {
        window.open(result.url, "_blank", "popup");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      throw error;
    }
  }, []);

  const openBillingPortal = useCallback(async () => {
    try {
      const response = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to open billing portal");
      }
      const result = await response.json();
      if (result.url) {
        window.open(result.url, "_blank", "popup");
      }
    } catch (error) {
      console.error("Billing portal error:", error);
      throw error;
    }
  }, []);

  return {
    hasAccess: data?.hasAccess || false,
    isInTrial: data?.isInTrial || false,
    trialDaysRemaining: data?.trialDaysRemaining || 0,
    status: data?.status || "none",
    currentPeriodEnd: data?.currentPeriodEnd || null,
    loading,
    startCheckout,
    openBillingPortal,
    refetch,
  };
}

export default useSubscription;
