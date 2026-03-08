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
  Wrench,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Clock,
  X,
} from "lucide-react-native";

const GREEN = "#6666f7";
const GREEN_LIGHT = "#ededfe";

const CATEGORIES = [
  "hvac",
  "plumbing",
  "electrical",
  "exterior",
  "interior",
  "safety",
  "appliances",
  "general",
];

function formatDate(dateStr) {
  if (!dateStr) return "Not set";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

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

function StatusBadge({ task }) {
  const d = getDaysUntil(task.next_due);
  if (d === null)
    return (
      <View
        style={{
          backgroundColor: "#f3f4f6",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 6,
        }}
      >
        <Text style={{ fontSize: 10, color: "#6b7280" }}>No schedule</Text>
      </View>
    );
  if (d < 0)
    return (
      <View
        style={{
          backgroundColor: "#fef2f2",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 6,
        }}
      >
        <Text style={{ fontSize: 10, color: "#dc2626", fontWeight: "600" }}>
          Overdue
        </Text>
      </View>
    );
  if (d <= 7)
    return (
      <View
        style={{
          backgroundColor: "#fefce8",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 6,
        }}
      >
        <Text style={{ fontSize: 10, color: "#ca8a04" }}>Due soon</Text>
      </View>
    );
  if (d <= 30)
    return (
      <View
        style={{
          backgroundColor: "#eff6ff",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 6,
        }}
      >
        <Text style={{ fontSize: 10, color: "#2563eb" }}>Upcoming</Text>
      </View>
    );
  return (
    <View
      style={{
        backgroundColor: GREEN_LIGHT,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
      }}
    >
      <Text style={{ fontSize: 10, color: GREEN }}>On track</Text>
    </View>
  );
}

export default function MaintenanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newFreq, setNewFreq] = useState(3);

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const res = await fetch("/api/maintenance");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addTask = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          frequency_months: newFreq,
          category: newCategory,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setNewTitle("");
      setNewCategory("general");
      setNewFreq(3);
      setShowAdd(false);
    },
  });

  const markDone = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, mark_done: true }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/maintenance?id=" + id, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  const handleLongPress = (task) => {
    Alert.alert(task.title, null, [
      {
        text: "Mark Done",
        onPress: () => markDone.mutate(task.id),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTask.mutate(task.id),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const tasks = data?.tasks || [];
  const overdue = tasks.filter(
    (t) => t.next_due && getDaysUntil(t.next_due) < 0,
  );
  const upcoming = tasks.filter(
    (t) =>
      t.next_due &&
      getDaysUntil(t.next_due) >= 0 &&
      getDaysUntil(t.next_due) <= 30,
  );
  const later = tasks.filter(
    (t) => !t.next_due || getDaysUntil(t.next_due) > 30,
  );

  const freqLabels = {
    1: "Monthly",
    3: "Quarterly",
    6: "Biannual",
    12: "Yearly",
  };

  const renderSection = (title, items, IconComp) => {
    if (items.length === 0) return null;
    return (
      <View style={{ marginBottom: 20 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <IconComp size={14} color="#9ca3af" />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginLeft: 6,
            }}
          >
            {title} ({items.length})
          </Text>
        </View>
        {items.map((task) => (
          <Pressable
            key={task.id}
            onLongPress={() => handleLongPress(task)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 12,
              backgroundColor: "#f9fafb",
              borderRadius: 14,
              marginBottom: 6,
            }}
          >
            <Pressable
              onPress={() => markDone.mutate(task.id)}
              style={{ marginRight: 10 }}
            >
              <CheckCircle2 size={20} color="#d1d5db" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text
                  style={{ fontSize: 14, color: "#111", fontWeight: "500" }}
                >
                  {task.title}
                </Text>
                <StatusBadge task={task} />
              </View>
              <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                {task.category} · Every {task.frequency_months}mo
                {task.last_completed
                  ? " · Last: " + formatDate(task.last_completed)
                  : ""}
              </Text>
            </View>
            {task.next_due && (
              <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                {formatDate(task.next_due)}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
    );
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
                Maintenance
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
          ) : tasks.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Wrench size={32} color="#d1d5db" />
              <Text style={{ fontSize: 14, color: "#9ca3af", marginTop: 10 }}>
                Track home maintenance tasks
              </Text>
            </View>
          ) : (
            <View>
              {renderSection("Overdue", overdue, AlertCircle)}
              {renderSection("Due Soon", upcoming, Clock)}
              {renderSection("Scheduled", later, Wrench)}
            </View>
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
                Add Maintenance Task
              </Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <X size={20} color="#9ca3af" />
              </Pressable>
            </View>

            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Task title (e.g., Replace air filter)"
              placeholderTextColor="#9ca3af"
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                color: "#111",
                marginBottom: 12,
              }}
              autoFocus
            />

            <Text
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginBottom: 6,
                fontWeight: "500",
              }}
            >
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 12 }}
            >
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNewCategory(c)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    backgroundColor: newCategory === c ? "#111" : "#f3f4f6",
                    marginRight: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: newCategory === c ? "#fff" : "#374151",
                      textTransform: "capitalize",
                    }}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginBottom: 6,
                fontWeight: "500",
              }}
            >
              Frequency
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 20 }}
            >
              {[
                { val: 1, label: "Monthly" },
                { val: 3, label: "Quarterly" },
                { val: 6, label: "Biannual" },
                { val: 12, label: "Yearly" },
              ].map((f) => (
                <Pressable
                  key={f.val}
                  onPress={() => setNewFreq(f.val)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    backgroundColor: newFreq === f.val ? "#111" : "#f3f4f6",
                    marginRight: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: newFreq === f.val ? "#fff" : "#374151",
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <AnimBtn
              onPress={() => {
                if (newTitle.trim()) addTask.mutate();
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
                {addTask.isPending ? "Adding..." : "Add Task"}
              </Text>
            </AnimBtn>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
