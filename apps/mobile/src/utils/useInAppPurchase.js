import Purchases, { LOG_LEVEL, PRODUCT_CATEGORY } from "react-native-purchases";
import { useAuth } from "@/utils/auth/useAuth";
import { Platform } from "react-native";
import { create } from "zustand";
import { useCallback, useState } from "react";

const useInAppPurchaseStore = create((set) => ({
  isReady: false,
  offerings: null,
  isSubscribed: false,
  setIsSubscribed: (isSubscribed) => set({ isSubscribed }),
  setOfferings: (offerings) => set({ offerings }),
  setIsReady: (isReady) => set({ isReady }),
}));

function useInAppPurchase() {
  const { auth } = useAuth();
  const {
    isReady,
    offerings,
    setOfferings,
    setIsSubscribed,
    isSubscribed,
    setIsReady,
  } = useInAppPurchaseStore();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/revenue-cat/get-subscription-status", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to check subscription status");
      }
      const data = await response.json();
      const isActive = data.hasAccess;
      setIsSubscribed(isActive);
    } catch (error) {
      console.error("Error refetching subscription:", error);
      setIsSubscribed(false);
    }
  }, [setIsSubscribed]);

  const initiateInAppPurchase = useCallback(async () => {
    try {
      Purchases.setLogLevel(LOG_LEVEL.INFO);
      const apiKey =
        process.env.EXPO_PUBLIC_CREATE_ENV === "DEVELOPMENT"
          ? process.env.EXPO_PUBLIC_REVENUE_CAT_TEST_STORE_API_KEY
          : Platform.select({
              ios: process.env.EXPO_PUBLIC_REVENUE_CAT_APP_STORE_API_KEY,
              android: process.env.EXPO_PUBLIC_REVENUE_CAT_PLAY_STORE_API_KEY,
              web: process.env.EXPO_PUBLIC_REVENUE_CAT_TEST_STORE_API_KEY,
            });
      if (apiKey) {
        Purchases.configure({ apiKey });
        Promise.allSettled([
          Purchases.getOfferings().then(setOfferings),
          fetchSubscriptionStatus(),
        ]);
      }
    } catch (error) {
      console.warn("Failed to initialize RevenueCat:", error);
    } finally {
      setIsReady(true);
    }
  }, [auth, setIsReady, setOfferings, fetchSubscriptionStatus]);

  const getAvailableSubscriptions = useCallback(() => {
    const offering = offerings?.current;
    if (!offering) return [];
    return offering.availablePackages.filter(
      (pkg) => pkg.product.productCategory === PRODUCT_CATEGORY.SUBSCRIPTION,
    );
  }, [offerings]);

  const startSubscription = useCallback(
    async ({ subscription }) => {
      try {
        setIsPurchasing(true);
        if (!auth?.user?.id) throw new Error("User not authenticated");
        await Purchases.setAttributes({ userId: String(auth.user.id) });
        await Purchases.logIn(String(auth.user.id));
        await Purchases.purchasePackage(subscription);
        await fetchSubscriptionStatus();
        return true;
      } catch (error) {
        console.error("Failed to start subscription:", error);
        return false;
      } finally {
        setIsPurchasing(false);
      }
    },
    [auth, setIsPurchasing, fetchSubscriptionStatus],
  );

  const restorePurchases = useCallback(async () => {
    try {
      await Purchases.restorePurchases();
      await fetchSubscriptionStatus();
    } catch (error) {
      console.error("Failed to restore purchases:", error);
    }
  }, [fetchSubscriptionStatus]);

  return {
    isReady,
    initiateInAppPurchase,
    getAvailableSubscriptions,
    startSubscription,
    isSubscribed,
    isPurchasing,
    restorePurchases,
    fetchSubscriptionStatus,
  };
}

export default useInAppPurchase;
