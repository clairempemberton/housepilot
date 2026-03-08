import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Zap,
  CheckSquare,
  ShoppingCart,
  Wrench,
  ChefHat,
  Sparkles,
  RefreshCw,
} from "lucide-react-native";

const GREEN = "#6666f7";
const GREEN_LIGHT = "#ededfe";
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function Toggle({ isOn, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        backgroundColor: isOn ? "#111" : "#e5e7eb",
        justifyContent: "center",
        paddingHorizontal: 2,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: "#fff",
          alignSelf: isOn ? "flex-end" : "flex-start",
        }}
      />
    </Pressable>
  );
}

function ToggleRow({ icon, label, description, isOn, onToggle }) {
  const IconComp = icon;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: "#f3f4f6",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <IconComp size={16} color="#6b7280" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#111" }}>
            {label}
          </Text>
          <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
            {description}
          </Text>
        </View>
      </View>
      <Toggle isOn={isOn} onPress={onToggle} />
    </View>
  );
}

export default function AutopilotScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: autopilotData, isLoading } = useQuery({
    queryKey: ["autopilot"],
    queryFn: async () => {
      const res = await fetch("/api/autopilot");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const {
    data: briefingData,
    isLoading: briefingLoading,
    refetch: refetchBriefing,
  } = useQuery({
    queryKey: ["briefing"],
    queryFn: async () => {
      const res = await fetch("/api/briefing");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates) => {
      const res = await fetch("/api/autopilot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["autopilot"] }),
  });

  const regenerateBriefing = async () => {
    await fetch("/api/briefing", { method: "POST" });
    refetchBriefing();
  };

  const settings = autopilotData?.settings;
  const briefing = briefingData?.briefing;
  const toggleSetting = (key) => {
    if (!settings) return;
    updateSettings.mutate({ [key]: !settings[key] });
  };

  const cycleDayPref = (key) => {
    if (!settings) return;
    const current = settings[key] || "Saturday";
    const idx = DAYS.indexOf(current);
    const next = DAYS[(idx + 1) % DAYS.length];
    updateSettings.mutate({ [key]: next });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
              paddingTop: 8,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={{ marginRight: 12, padding: 4 }}
            >
              <ArrowLeft size={22} color="#111" />
            </Pressable>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#111" }}>
              Autopilot
            </Text>
          </View>
          <Text
            style={{
              fontSize: 13,
              color: "#9ca3af",
              marginBottom: 20,
              paddingLeft: 38,
            }}
          >
            Let HousePilot manage scheduling & reminders.
          </Text>

          {isLoading ? (
            <ActivityIndicator color="#9ca3af" style={{ marginTop: 40 }} />
          ) : (
            <View>
              {/* Master Toggle */}
              <Pressable
                onPress={() => toggleSetting("is_enabled")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: settings?.is_enabled ? "#111" : "#f3f4f6",
                  backgroundColor: settings?.is_enabled ? "#f9fafb" : "#fff",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: settings?.is_enabled
                        ? "#111"
                        : "#e5e7eb",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Zap
                      size={20}
                      color={settings?.is_enabled ? "#fff" : "#6b7280"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 15, fontWeight: "700", color: "#111" }}
                    >
                      Autopilot Mode
                    </Text>
                    <Text
                      style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}
                    >
                      {settings?.is_enabled
                        ? "Active — managing your household"
                        : "Off — enable to let AI help"}
                    </Text>
                  </View>
                </View>
                <Toggle
                  isOn={settings?.is_enabled || false}
                  onPress={() => toggleSetting("is_enabled")}
                />
              </Pressable>

              {/* Feature Toggles */}
              <View
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: 16,
                  marginBottom: 16,
                  overflow: "hidden",
                }}
              >
                <ToggleRow
                  icon={CheckSquare}
                  label="Auto-schedule chores"
                  description="Suggest optimal times"
                  isOn={settings?.auto_schedule_chores || false}
                  onToggle={() => toggleSetting("auto_schedule_chores")}
                />
                <View style={{ height: 1, backgroundColor: "#f3f4f6" }} />
                <ToggleRow
                  icon={ShoppingCart}
                  label="Grocery reminders"
                  description="Alert when supplies run low"
                  isOn={settings?.auto_grocery_reminders || false}
                  onToggle={() => toggleSetting("auto_grocery_reminders")}
                />
                <View style={{ height: 1, backgroundColor: "#f3f4f6" }} />
                <ToggleRow
                  icon={Wrench}
                  label="Maintenance reminders"
                  description="Track home maintenance"
                  isOn={settings?.auto_maintenance_reminders || false}
                  onToggle={() => toggleSetting("auto_maintenance_reminders")}
                />
                <View style={{ height: 1, backgroundColor: "#f3f4f6" }} />
                <ToggleRow
                  icon={ChefHat}
                  label="Meal suggestions"
                  description="Suggest weekly meal plans"
                  isOn={settings?.auto_meal_suggestions || false}
                  onToggle={() => toggleSetting("auto_meal_suggestions")}
                />
              </View>

              {/* Preferred Days */}
              <View
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
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
                  Preferred Days
                </Text>
                <Pressable
                  onPress={() => cycleDayPref("preferred_chore_day")}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>
                    Chore day
                  </Text>
                  <Text
                    style={{ fontSize: 13, fontWeight: "600", color: "#111" }}
                  >
                    {settings?.preferred_chore_day || "Saturday"} ›
                  </Text>
                </Pressable>
                <View style={{ height: 1, backgroundColor: "#f3f4f6" }} />
                <Pressable
                  onPress={() => cycleDayPref("preferred_grocery_day")}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>
                    Grocery day
                  </Text>
                  <Text
                    style={{ fontSize: 13, fontWeight: "600", color: "#111" }}
                  >
                    {settings?.preferred_grocery_day || "Sunday"} ›
                  </Text>
                </Pressable>
              </View>

              {/* Briefing */}
              <View
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Sparkles size={14} color="#9ca3af" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#111",
                        marginLeft: 6,
                      }}
                    >
                      Weekly Briefing
                    </Text>
                  </View>
                  <Pressable onPress={regenerateBriefing}>
                    <RefreshCw size={14} color="#d1d5db" />
                  </Pressable>
                </View>
                {briefingLoading ? (
                  <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                    Generating briefing...
                  </Text>
                ) : briefing ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#374151",
                      lineHeight: 18,
                    }}
                  >
                    {briefing.briefing_text}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                    Your weekly briefing will appear here.
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
