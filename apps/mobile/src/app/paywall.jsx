import { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Pressable,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import {
  Home,
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  CreditCard,
} from "lucide-react-native";

const GREEN = "#6666f7";
const GREEN_LIGHT = "#ededfe";

const FEATURES = [
  "Household task management",
  "Shared lists and organization",
  "Supply and grocery tracking",
  "Member assignments",
  "Progress tracking and streaks",
  "AI suggestions for tasks and lists",
  "Calendar organization",
  "Priority-based task ordering",
];

function AnimBtn({ onPress, style, children, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scale, {
          toValue: 0.96,
          useNativeDriver: true,
          speed: 50,
          bounciness: 4,
        }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 8,
        }).start()
      }
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);

  const { data: subData } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscription");
      if (!res.ok)
        return { hasAccess: false, isInTrial: false, trialDaysRemaining: 0 };
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  const isInTrial = subData?.isInTrial;
  const trialDays = subData?.trialDaysRemaining || 0;
  const hasAccess = subData?.hasAccess;
  const status = subData?.status;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const baseUrl =
        Platform.OS === "web"
          ? typeof window !== "undefined"
            ? window.location.origin
            : ""
          : process.env.EXPO_PUBLIC_BASE_URL || "";

      const res = await fetch("/api/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirectURL: baseUrl,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to start checkout");
      }

      const data = await res.json();
      if (data.url) {
        if (Platform.OS === "web") {
          const popup = window.open(data.url, "_blank", "popup");
          // Poll for popup close
          const checkClosed = setInterval(() => {
            try {
              if (popup.closed) {
                clearInterval(checkClosed);
                queryClient.invalidateQueries({ queryKey: ["subscription"] });
                setLoading(false);
              }
            } catch (e) {
              // cross-origin, ignore
            }
          }, 1000);
        } else {
          await Linking.openURL(data.url);
          // After returning from browser, refetch subscription
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["subscription"] });
            setLoading(false);
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Subscription error:", error);
      Alert.alert(
        "Error",
        error.message || "Could not start checkout. Please try again.",
      );
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const res = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl:
            Platform.OS === "web"
              ? typeof window !== "undefined"
                ? window.location.href
                : ""
              : process.env.EXPO_PUBLIC_BASE_URL || "",
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to open billing");
      }

      const data = await res.json();
      if (data.url) {
        if (Platform.OS === "web") {
          window.open(data.url, "_blank", "popup");
        } else {
          await Linking.openURL(data.url);
        }
      }
    } catch (error) {
      console.error("Billing portal error:", error);
      Alert.alert(
        "Error",
        error.message || "Could not open billing. Please try again.",
      );
    } finally {
      setManagingBilling(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              alignSelf: "flex-end",
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#f3f4f6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} color="#6b7280" />
          </TouchableOpacity>

          <View
            style={{ alignItems: "center", paddingTop: 24, paddingBottom: 32 }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                backgroundColor: GREEN,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Home size={28} color="#fff" />
            </View>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "700",
                color: "#111",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              HousePilot{"\n"}Premium
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: "#6b7280",
                textAlign: "center",
                lineHeight: 24,
                maxWidth: 300,
              }}
            >
              Your AI-powered household operating system. Everything you need to
              keep your home running smoothly.
            </Text>
          </View>

          {isInTrial && (
            <View
              style={{
                backgroundColor: GREEN_LIGHT,
                borderRadius: 12,
                padding: 14,
                marginBottom: 20,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Sparkles size={16} color={GREEN} />
              <Text
                style={{
                  fontSize: 14,
                  color: "#312e81",
                  marginLeft: 8,
                  flex: 1,
                }}
              >
                Free trial — {trialDays} day{trialDays !== 1 ? "s" : ""}{" "}
                remaining
              </Text>
            </View>
          )}

          {hasAccess && !isInTrial && (
            <View
              style={{
                backgroundColor: GREEN_LIGHT,
                borderRadius: 12,
                padding: 14,
                marginBottom: 20,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <CheckCircle2 size={16} color={GREEN} />
              <Text style={{ fontSize: 14, color: "#312e81", marginLeft: 8 }}>
                You have an active subscription
              </Text>
            </View>
          )}

          <View
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#111",
                marginBottom: 12,
              }}
            >
              Everything included:
            </Text>
            {FEATURES.map((feature, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <CheckCircle2 size={16} color={GREEN} />
                <Text
                  style={{ fontSize: 14, color: "#374151", marginLeft: 10 }}
                >
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <View
              style={{
                backgroundColor: GREEN_LIGHT,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 4,
                marginBottom: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Sparkles size={12} color={GREEN} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: GREEN,
                  marginLeft: 4,
                }}
              >
                3-Day Free Trial
              </Text>
            </View>
            <Text style={{ fontSize: 40, fontWeight: "700", color: "#111" }}>
              $10
              <Text
                style={{ fontSize: 18, fontWeight: "500", color: "#9ca3af" }}
              >
                /month
              </Text>
            </Text>
            <Text style={{ fontSize: 14, color: "#9ca3af", marginTop: 4 }}>
              Cancel anytime
            </Text>
          </View>

          {(!hasAccess || isInTrial) && !hasAccess && (
            <AnimBtn
              onPress={handleSubscribe}
              disabled={loading}
              style={{
                backgroundColor: GREEN,
                paddingVertical: 18,
                borderRadius: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                marginBottom: 12,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 17,
                      fontWeight: "600",
                      marginRight: 8,
                    }}
                  >
                    Start Free Trial
                  </Text>
                  <ArrowRight size={18} color="#fff" />
                </>
              )}
            </AnimBtn>
          )}

          {/* Manage billing for active subscribers */}
          {(hasAccess || isInTrial) && (
            <AnimBtn
              onPress={handleManageBilling}
              disabled={managingBilling}
              style={{
                backgroundColor: "#f9fafb",
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                marginBottom: 12,
                opacity: managingBilling ? 0.7 : 1,
              }}
            >
              {managingBilling ? (
                <ActivityIndicator color="#6b7280" />
              ) : (
                <>
                  <CreditCard size={18} color="#6b7280" />
                  <Text
                    style={{
                      color: "#374151",
                      fontSize: 16,
                      fontWeight: "600",
                      marginLeft: 8,
                    }}
                  >
                    Manage Subscription
                  </Text>
                </>
              )}
            </AnimBtn>
          )}

          <Text
            style={{
              fontSize: 11,
              color: "#d1d5db",
              textAlign: "center",
              marginTop: 16,
              lineHeight: 16,
            }}
          >
            Your card will be charged $10/month after the 3-day free trial ends.
            Cancel anytime from the billing page.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
