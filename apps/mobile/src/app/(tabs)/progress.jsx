import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { useRouter } from "expo-router";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Flame,
  CheckCircle2,
  Clock,
  AlertCircle,
  Target,
  User,
  Settings,
} from "lucide-react-native";

const GREEN = "#6666f7";
const GREEN_LIGHT = "#ededfe";

function AnimBtn({ onPress, style, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (Platform.OS !== "web")
          Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
          }).start();
      }}
      onPressOut={() => {
        if (Platform.OS !== "web")
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 8,
          }).start();
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <View
      style={{
        backgroundColor: "#f9fafb",
        borderRadius: 14,
        padding: 16,
        flex: 1,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
      >
        <Icon size={14} color="#9ca3af" />
        <Text style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: "700", color: color || "#111" }}>
        {value}
      </Text>
      {sub && (
        <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

export default function ProgressTab() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState("week");

  const { data: progressData, isLoading } = useQuery({
    queryKey: ["progress", period],
    queryFn: async () => {
      const res = await fetch(`/api/progress?period=${period}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  const { data: memoryData } = useQuery({
    queryKey: ["ai-memory"],
    queryFn: async () => {
      const res = await fetch("/api/ai/memory");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  const progress = progressData?.progress;
  const memory = memoryData?.memory;
  const patterns = memory?.patterns;
  const categoryRates = memory?.categoryRates || [];

  const healthScore = (() => {
    if (!progress) return 0;
    const completionRate = progress.completionRate || 0;
    const overdueTasks = progress.overdueTasks || 0;
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          completionRate * 0.7 + Math.max(0, 100 - overdueTasks * 15) * 0.3,
        ),
      ),
    );
  })();

  const healthColor =
    healthScore >= 80
      ? GREEN
      : healthScore >= 60
        ? "#111"
        : healthScore >= 40
          ? "#f97316"
          : "#ef4444";
  const healthLabel =
    healthScore >= 80
      ? "Great"
      : healthScore >= 60
        ? "Good"
        : healthScore >= 40
          ? "Needs attention"
          : "Needs help";

  const maxBarCount = progress?.dayBreakdown
    ? Math.max(...progress.dayBreakdown.map((d) => d.count), 1)
    : 1;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 26, fontWeight: "700", color: "#111" }}>
              Progress
            </Text>
            <AnimBtn
              onPress={() => router.push("/(tabs)/settings")}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "#f3f4f6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Settings size={18} color="#9ca3af" />
            </AnimBtn>
          </View>

          {/* Period Selector */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#f3f4f6",
              borderRadius: 10,
              padding: 3,
              marginBottom: 20,
            }}
          >
            {[
              { value: "day", label: "Today" },
              { value: "week", label: "This Week" },
              { value: "month", label: "Month" },
            ].map((p) => (
              <TouchableOpacity
                key={p.value}
                onPress={() => setPeriod(p.value)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: period === p.value ? "#fff" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: period === p.value ? "#111" : "#9ca3af",
                  }}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <ActivityIndicator color="#9ca3af" style={{ marginTop: 40 }} />
          ) : !progress ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <BarChart3 size={32} color="#e5e7eb" />
              <Text style={{ fontSize: 14, color: "#9ca3af", marginTop: 8 }}>
                Complete some tasks to see your progress.
              </Text>
            </View>
          ) : (
            <View>
              {/* Health Score */}
              <View
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: 16,
                  padding: 20,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  Health Score
                </Text>
                <Text
                  style={{
                    fontSize: 40,
                    fontWeight: "700",
                    color: healthColor,
                  }}
                >
                  {healthScore}
                </Text>
                <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
                  {healthLabel}
                </Text>
              </View>

              {/* Stats Grid */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <StatCard
                  icon={CheckCircle2}
                  label="Completed"
                  value={progress.completedInPeriod}
                  sub={
                    progress.trend !== 0
                      ? `${progress.trend > 0 ? "+" : ""}${progress.trend}%`
                      : undefined
                  }
                  color={
                    progress.trend > 0
                      ? GREEN
                      : progress.trend < 0
                        ? "#ef4444"
                        : "#111"
                  }
                />
                <StatCard
                  icon={Flame}
                  label="Streak"
                  value={progress.currentStreak}
                  sub="days"
                />
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                <StatCard
                  icon={Clock}
                  label="Active"
                  value={progress.activeTasks}
                  sub="tasks left"
                />
                <StatCard
                  icon={AlertCircle}
                  label="Overdue"
                  value={progress.overdueTasks}
                  sub="need attention"
                  color={progress.overdueTasks > 0 ? "#ef4444" : "#111"}
                />
              </View>

              {/* Completion Rate */}
              <View
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: "#111" }}
                  >
                    Completion Rate
                  </Text>
                  <Text
                    style={{ fontSize: 14, fontWeight: "700", color: "#111" }}
                  >
                    {progress.completionRate}%
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    backgroundColor: "#e5e7eb",
                    borderRadius: 3,
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      backgroundColor: GREEN,
                      borderRadius: 3,
                      width: `${progress.completionRate}%`,
                    }}
                  />
                </View>
                <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                  {progress.completedTasks} of {progress.totalTasks} total tasks
                  completed
                </Text>
              </View>

              {/* Activity by Day */}
              {progress.dayBreakdown && (
                <View
                  style={{
                    backgroundColor: "#f9fafb",
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{ fontSize: 14, fontWeight: "600", color: "#111" }}
                    >
                      Activity by Day
                    </Text>
                    {progress.bestDay !== "-" && (
                      <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                        Best: {progress.bestDay}
                      </Text>
                    )}
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      height: 80,
                    }}
                  >
                    {progress.dayBreakdown.map((item) => {
                      const heightPercent =
                        maxBarCount > 0 ? (item.count / maxBarCount) * 100 : 0;
                      return (
                        <View
                          key={item.day}
                          style={{ flex: 1, alignItems: "center" }}
                        >
                          <View
                            style={{
                              width: "60%",
                              height: 60,
                              justifyContent: "flex-end",
                            }}
                          >
                            <View
                              style={{
                                width: "100%",
                                borderTopLeftRadius: 4,
                                borderTopRightRadius: 4,
                                height: `${Math.max(heightPercent, 4)}%`,
                                backgroundColor:
                                  item.count > 0 ? GREEN : "#e5e7eb",
                              }}
                            />
                          </View>
                          <Text
                            style={{
                              fontSize: 10,
                              color: "#9ca3af",
                              fontWeight: "600",
                              marginTop: 4,
                            }}
                          >
                            {item.day}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Household Memory */}
              {patterns && (
                <View
                  style={{
                    backgroundColor: "#f9fafb",
                    borderRadius: 14,
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
                    Household Memory
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                  >
                    {[
                      {
                        label: "Best day",
                        value: patterns.mostProductiveDay || "—",
                      },
                      {
                        label: "Weakest day",
                        value: patterns.leastProductiveDay || "—",
                      },
                      {
                        label: "Peak time",
                        value: patterns.peakTimeBucket || "—",
                      },
                      { label: "All-time", value: patterns.totalCompletions },
                    ].map((s) => (
                      <View key={s.label} style={{ width: "47%" }}>
                        <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                          {s.label}
                        </Text>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "600",
                            color: "#111",
                            marginTop: 2,
                            textTransform: "capitalize",
                          }}
                        >
                          {s.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Category Breakdown */}
              {categoryRates.length > 0 && (
                <View
                  style={{
                    backgroundColor: "#f9fafb",
                    borderRadius: 14,
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
                    By Category
                  </Text>
                  {categoryRates.map((cat) => {
                    const widthPct =
                      cat.total > 0
                        ? Math.round((cat.completed / cat.total) * 100)
                        : 0;
                    return (
                      <View
                        key={cat.name}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            width: 80,
                            textTransform: "capitalize",
                          }}
                        >
                          {cat.name}
                        </Text>
                        <View
                          style={{
                            flex: 1,
                            height: 4,
                            backgroundColor: "#e5e7eb",
                            borderRadius: 2,
                            marginHorizontal: 8,
                          }}
                        >
                          <View
                            style={{
                              height: 4,
                              backgroundColor: GREEN,
                              borderRadius: 2,
                              width: `${widthPct}%`,
                            }}
                          />
                        </View>
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            width: 32,
                            textAlign: "right",
                          }}
                        >
                          {widthPct}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Goals */}
              {progress.goalsSummary && progress.goalsSummary.length > 0 && (
                <View
                  style={{
                    backgroundColor: "#f9fafb",
                    borderRadius: 14,
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
                    Goals
                  </Text>
                  {progress.goalsSummary.map((goal, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 8,
                        borderBottomWidth:
                          idx < progress.goalsSummary.length - 1 ? 0.5 : 0,
                        borderBottomColor: "#e5e7eb",
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#111", flex: 1 }}>
                        {goal.title}
                      </Text>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Flame size={12} color={GREEN} />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#111",
                            marginLeft: 4,
                          }}
                        >
                          {goal.streak}
                        </Text>
                        {goal.target && (
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#9ca3af",
                              marginLeft: 4,
                            }}
                          >
                            / {goal.target}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
