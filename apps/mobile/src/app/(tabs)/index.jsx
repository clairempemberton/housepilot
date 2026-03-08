import { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import { CheckCircle2, Circle, Calendar } from "lucide-react-native";

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

export default function HomeTab() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { data: user } = useUser();
  const queryClient = useQueryClient();
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

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks", "active"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?completed=false");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  const { data: eventsData } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const next = new Date(Date.now() + 7 * 86400000)
        .toISOString()
        .split("T")[0];
      const res = await fetch("/api/calendar?start=" + today + "&end=" + next);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  const toggleTask = useMutation({
    mutationFn: async (task) => {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, is_completed: !task.is_completed }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const tasks = tasksData?.tasks?.slice(0, 5) || [];
  const events = eventsData?.events?.slice(0, 3) || [];
  const firstName = user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const isInTrial = subData?.isInTrial;
  const trialDays = subData?.trialDaysRemaining || 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
          {/* Trial Banner */}
          {isInTrial && (
            <AnimBtn
              onPress={() => router.push("/paywall")}
              style={{
                backgroundColor: GREEN_LIGHT,
                borderRadius: 12,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 13, color: "#374151" }}>
                Free trial — {trialDays} day{trialDays !== 1 ? "s" : ""}{" "}
                remaining
              </Text>
              <Text style={{ fontSize: 13, color: GREEN, fontWeight: "600" }}>
                Manage Plan
              </Text>
            </AnimBtn>
          )}

          {/* Greeting */}
          <Text
            style={{
              fontSize: 26,
              fontWeight: "700",
              color: "#111",
              marginBottom: 4,
            }}
          >
            {greeting}, {firstName}
          </Text>
          <Text style={{ fontSize: 14, color: "#9ca3af", marginBottom: 24 }}>
            Here is what needs your attention.
          </Text>

          {/* Tasks */}
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Tasks
              </Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/tasks")}>
                <Text style={{ fontSize: 13, color: GREEN }}>View all</Text>
              </TouchableOpacity>
            </View>
            {isLoading ? (
              <ActivityIndicator color="#9ca3af" />
            ) : tasks.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: 16,
                  padding: 24,
                  alignItems: "center",
                }}
              >
                <CheckCircle2 size={24} color="#d1d5db" />
                <Text style={{ fontSize: 14, color: "#9ca3af", marginTop: 8 }}>
                  No active tasks
                </Text>
              </View>
            ) : (
              tasks.map((task) => (
                <Pressable
                  key={task.id}
                  onPress={() => toggleTask.mutate(task)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 4,
                  }}
                >
                  {task.is_completed ? (
                    <CheckCircle2 size={18} color={GREEN} />
                  ) : (
                    <Circle size={18} color="#d1d5db" />
                  )}
                  <Text
                    style={{
                      fontSize: 15,
                      color: task.is_completed ? "#9ca3af" : "#111",
                      marginLeft: 10,
                      flex: 1,
                      textDecorationLine: task.is_completed
                        ? "line-through"
                        : "none",
                    }}
                  >
                    {task.title}
                  </Text>
                  {task.priority === "urgent" && (
                    <View
                      style={{
                        backgroundColor: "#fef2f2",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#ef4444",
                          fontWeight: "600",
                        }}
                      >
                        Urgent
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))
            )}
          </View>

          {/* Events */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              Upcoming
            </Text>
            {events.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: 16,
                  padding: 24,
                  alignItems: "center",
                }}
              >
                <Calendar size={24} color="#d1d5db" />
                <Text style={{ fontSize: 14, color: "#9ca3af", marginTop: 8 }}>
                  No upcoming events
                </Text>
              </View>
            ) : (
              events.map((event) => (
                <View
                  key={event.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 4,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: GREEN,
                      marginRight: 10,
                    }}
                  />
                  <Text style={{ fontSize: 15, color: "#111", flex: 1 }}>
                    {event.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                    {event.event_date}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
