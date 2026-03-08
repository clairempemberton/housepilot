import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Plus,
  Target,
  TrendingUp,
  Trash2,
  X,
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

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newFreq, setNewFreq] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addGoal = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          frequency_target: newFreq,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setNewTitle("");
      setNewDesc("");
      setNewFreq("");
      setShowAdd(false);
    },
  });

  const incrementStreak = useMutation({
    mutationFn: async (goal) => {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: goal.id,
          current_streak: (goal.current_streak || 0) + 1,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/goals?id=" + id, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });

  const handleLongPress = (goal) => {
    Alert.alert(goal.title, null, [
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteGoal.mutate(goal.id),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const goals = data?.goals || [];

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
              justifyContent: "space-between",
              marginBottom: 20,
              paddingTop: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Pressable
                onPress={() => router.back()}
                style={{ marginRight: 12, padding: 4 }}
              >
                <ArrowLeft size={22} color="#111" />
              </Pressable>
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#111" }}>
                Goals
              </Text>
            </View>
            <AnimBtn
              onPress={() => setShowAdd(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#111",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 12,
              }}
            >
              <Plus size={16} color="#fff" />
              <Text
                style={{
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: "600",
                  marginLeft: 4,
                }}
              >
                Add
              </Text>
            </AnimBtn>
          </View>

          {isLoading ? (
            <ActivityIndicator color="#9ca3af" style={{ marginTop: 40 }} />
          ) : goals.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Target size={32} color="#d1d5db" />
              <Text style={{ fontSize: 14, color: "#9ca3af", marginTop: 10 }}>
                Set goals for your family to work towards.
              </Text>
            </View>
          ) : (
            goals.map((goal) => (
              <Pressable
                key={goal.id}
                onLongPress={() => handleLongPress(goal)}
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#111" }}
                >
                  {goal.title}
                </Text>
                {goal.description && (
                  <Text
                    style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}
                  >
                    {goal.description}
                  </Text>
                )}
                {goal.frequency_target && (
                  <Text
                    style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}
                  >
                    Target: {goal.frequency_target}
                  </Text>
                )}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: "#f3f4f6",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <TrendingUp size={14} color="#9ca3af" />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#111",
                        marginLeft: 6,
                      }}
                    >
                      {goal.current_streak || 0}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                        marginLeft: 4,
                      }}
                    >
                      streak
                    </Text>
                  </View>
                  <AnimBtn
                    onPress={() => incrementStreak.mutate(goal)}
                    style={{
                      backgroundColor: GREEN_LIGHT,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: GREEN,
                      }}
                    >
                      +1 Done
                    </Text>
                  </AnimBtn>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <Pressable
          onPress={() => setShowAdd(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: insets.bottom + 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#111" }}>
                Add Goal
              </Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <X size={20} color="#9ca3af" />
              </Pressable>
            </View>

            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Goal title (e.g., Exercise 3x per week)"
              placeholderTextColor="#9ca3af"
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                color: "#111",
                marginBottom: 10,
              }}
              autoFocus
            />
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Description (optional)"
              placeholderTextColor="#9ca3af"
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                color: "#111",
                marginBottom: 10,
              }}
            />
            <TextInput
              value={newFreq}
              onChangeText={setNewFreq}
              placeholder="Frequency (e.g., 3x per week)"
              placeholderTextColor="#9ca3af"
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                color: "#111",
                marginBottom: 20,
              }}
            />

            <AnimBtn
              onPress={() => {
                if (newTitle.trim()) addGoal.mutate();
              }}
              style={{
                backgroundColor: newTitle.trim() ? GREEN : "#e5e7eb",
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: newTitle.trim() ? "#fff" : "#9ca3af",
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                {addGoal.isPending ? "Adding..." : "Add Goal"}
              </Text>
            </AnimBtn>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
