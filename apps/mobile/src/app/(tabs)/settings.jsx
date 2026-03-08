import { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import {
  User,
  CreditCard,
  LogOut,
  ChevronRight,
  Home,
} from "lucide-react-native";

const GREEN = "#6666f7";
const GREEN_LIGHT = "#ededfe";

function AnimBtn({ onPress, style, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scale, {
          toValue: 0.97,
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

export default function SettingsTab() {
  const insets = useSafeAreaInsets();
  const { signOut, isAuthenticated } = useAuth();
  const { data: user } = useUser();
  const router = useRouter();

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
  const planLabel = isInTrial
    ? "Free Trial"
    : hasAccess
      ? "Premium"
      : "No Plan";
  const planDetail = isInTrial
    ? trialDays + " day" + (trialDays !== 1 ? "s" : "") + " remaining"
    : hasAccess
      ? "$10/month"
      : "Subscribe to continue";

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "700",
              color: "#111",
              marginBottom: 24,
            }}
          >
            Account
          </Text>

          {/* User Info */}
          <View
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                backgroundColor: GREEN,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <User size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#111" }}>
                {user?.name || "User"}
              </Text>
              <Text style={{ fontSize: 13, color: "#9ca3af" }}>
                {user?.email || ""}
              </Text>
            </View>
          </View>

          {/* Subscription */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            Subscription
          </Text>
          <AnimBtn
            onPress={() => router.push("/paywall")}
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 14,
              padding: 16,
              marginBottom: 20,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <CreditCard size={20} color={GREEN} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111" }}>
                {planLabel}
              </Text>
              <Text style={{ fontSize: 13, color: "#9ca3af" }}>
                {planDetail}
              </Text>
            </View>
            <ChevronRight size={16} color="#d1d5db" />
          </AnimBtn>

          {/* App */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            App
          </Text>
          <View
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 14,
              padding: 16,
              marginBottom: 20,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                backgroundColor: GREEN,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Home size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111" }}>
                HousePilot
              </Text>
              <Text style={{ fontSize: 13, color: "#9ca3af" }}>
                Your AI household operating system
              </Text>
            </View>
          </View>

          {/* Sign Out */}
          <AnimBtn
            onPress={() => signOut()}
            style={{
              backgroundColor: "#fef2f2",
              borderRadius: 14,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogOut size={18} color="#ef4444" />
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#ef4444",
                marginLeft: 8,
              }}
            >
              Sign Out
            </Text>
          </AnimBtn>
        </View>
      </ScrollView>
    </View>
  );
}
