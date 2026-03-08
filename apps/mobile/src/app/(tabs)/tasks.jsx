import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import {
  Plus,
  CheckCircle2,
  Circle,
  X,
  Sparkles,
  Pencil,
} from "lucide-react-native";

const GREEN = "#6666f7";
const GREEN_LIGHT = "#ededfe";

const PRIORITIES = [
  { value: "urgent", label: "Urgent", color: "#ef4444" },
  { value: "high", label: "High", color: "#f97316" },
  { value: "medium", label: "Medium", color: "#9ca3af" },
  { value: "low", label: "Low", color: "#d1d5db" },
];

function AnimBtn({ onPress, style, children, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const doIn = () => {
    if (Platform.OS !== "web")
      Animated.spring(scale, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
  };
  const doOut = () => {
    if (Platform.OS !== "web")
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }).start();
  };
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      onPressIn={doIn}
      onPressOut={doOut}
    >
      <Animated.View
        style={[
          style,
          Platform.OS !== "web" ? { transform: [{ scale }] } : undefined,
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function TasksTab() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("active");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [actionMenuTask, setActionMenuTask] = useState(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks", filter],
    queryFn: async () => {
      const params =
        filter === "active"
          ? "?completed=false"
          : filter === "completed"
            ? "?completed=true"
            : "";
      const res = await fetch("/api/tasks" + params);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  const addTask = useMutation({
    mutationFn: async ({ title, priority }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: async ({ title, priority }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", filter] });
      const prev = queryClient.getQueryData(["tasks", filter]);
      const tempTask = {
        id: Date.now(),
        title,
        priority,
        is_completed: false,
        _temp: true,
      };
      queryClient.setQueryData(["tasks", filter], (old) => {
        if (!old) return { tasks: [tempTask] };
        return { ...old, tasks: [tempTask, ...old.tasks] };
      });
      setNewTitle("");
      setNewPriority("medium");
      setShowAdd(false);
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["tasks", filter], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
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
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", filter] });
      const prev = queryClient.getQueryData(["tasks", filter]);
      queryClient.setQueryData(["tasks", filter], (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === task.id ? { ...t, is_completed: !t.is_completed } : t,
          ),
        };
      });
      return { prev };
    },
    onError: (err, task, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["tasks", filter], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const updateTask = useMutation({
    mutationFn: async (updates) => {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTask(null);
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/tasks?id=" + id, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", filter] });
      const prev = queryClient.getQueryData(["tasks", filter]);
      queryClient.setQueryData(["tasks", filter], (old) => {
        if (!old) return old;
        return { ...old, tasks: old.tasks.filter((t) => t.id !== id) };
      });
      setDeleteConfirmTask(null);
      return { prev };
    },
    onError: (err, id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["tasks", filter], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const openEdit = (task) => {
    setActionMenuTask(null);
    setEditingTask(task);
    setEditTitle(task.title);
    setEditPriority(task.priority || "medium");
  };

  const tasks = tasksData?.tasks || [];
  const filters = [
    { value: "active", label: "Active" },
    { value: "completed", label: "Done" },
    { value: "all", label: "All" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 26, fontWeight: "700", color: "#111" }}>
              Tasks
            </Text>
            <AnimBtn
              onPress={() => setShowAdd(!showAdd)}
              style={{
                backgroundColor: GREEN,
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {showAdd ? (
                <X size={18} color="#fff" />
              ) : (
                <Plus size={18} color="#fff" />
              )}
            </AnimBtn>
          </View>

          {showAdd && (
            <View
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="What needs to be done?"
                placeholderTextColor="#9ca3af"
                style={{
                  fontSize: 15,
                  color: "#111",
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "#e5e7eb",
                  marginBottom: 12,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => setNewPriority(p.value)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: newPriority === p.value ? GREEN : "#fff",
                      borderWidth: 1,
                      borderColor: newPriority === p.value ? GREEN : "#e5e7eb",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: newPriority === p.value ? "#fff" : "#6b7280",
                        fontWeight: "500",
                      }}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (newTitle.trim())
                    addTask.mutate({ title: newTitle, priority: newPriority });
                }}
                style={{
                  backgroundColor: GREEN,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: !newTitle.trim() ? 0.5 : 1,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}
                >
                  Add Task
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#f3f4f6",
              borderRadius: 10,
              padding: 3,
              marginBottom: 16,
            }}
          >
            {filters.map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => setFilter(f.value)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: filter === f.value ? "#fff" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: filter === f.value ? "#111" : "#9ca3af",
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <ActivityIndicator color="#9ca3af" style={{ marginTop: 40 }} />
          ) : tasks.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <CheckCircle2 size={32} color="#e5e7eb" />
              <Text style={{ fontSize: 14, color: "#9ca3af", marginTop: 8 }}>
                {filter === "active" ? "All caught up!" : "No tasks found."}
              </Text>
            </View>
          ) : (
            tasks.map((task) => {
              const pri =
                PRIORITIES.find((p) => p.value === task.priority) ||
                PRIORITIES[2];
              return (
                <View
                  key={task.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 4,
                    borderBottomWidth: 0.5,
                    borderBottomColor: "#f3f4f6",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => toggleTask.mutate(task)}
                    style={{ marginRight: 10 }}
                  >
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: pri.color,
                        position: "absolute",
                        left: -8,
                        top: 8,
                      }}
                    />
                    {task.is_completed ? (
                      <CheckCircle2 size={20} color={GREEN} />
                    ) : (
                      <Circle size={20} color="#d1d5db" />
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        color: task.is_completed ? "#9ca3af" : "#111",
                        textDecorationLine: task.is_completed
                          ? "line-through"
                          : "none",
                      }}
                    >
                      {task.title}
                    </Text>
                    {task.assigned_name && (
                      <Text
                        style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}
                      >
                        {task.assigned_name}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      setActionMenuTask(
                        actionMenuTask?.id === task.id ? null : task,
                      )
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 6 }}
                  >
                    <Pencil size={14} color="#d1d5db" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Action Menu Modal */}
      <Modal visible={!!actionMenuTask} transparent animationType="fade">
        <Pressable
          onPress={() => setActionMenuTask(null)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 8,
              width: 200,
            }}
          >
            <TouchableOpacity
              onPress={() => openEdit(actionMenuTask)}
              style={{ paddingVertical: 14, paddingHorizontal: 16 }}
            >
              <Text style={{ fontSize: 15, color: "#111" }}>Edit</Text>
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: "#f3f4f6" }} />
            <TouchableOpacity
              onPress={() => {
                setActionMenuTask(null);
                setDeleteConfirmTask(actionMenuTask);
              }}
              style={{ paddingVertical: 14, paddingHorizontal: 16 }}
            >
              <Text style={{ fontSize: 15, color: "#ef4444" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Delete Confirmation */}
      <Modal visible={!!deleteConfirmTask} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 24,
              width: "100%",
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#111",
                marginBottom: 8,
              }}
            >
              Delete this task?
            </Text>
            <Text style={{ fontSize: 14, color: "#9ca3af", marginBottom: 20 }}>
              This action cannot be undone.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <AnimBtn
                onPress={() => setDeleteConfirmTask(null)}
                style={{
                  flex: 1,
                  backgroundColor: "#f3f4f6",
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#6b7280", fontSize: 15, fontWeight: "600" }}
                >
                  Cancel
                </Text>
              </AnimBtn>
              <AnimBtn
                onPress={() => deleteTask.mutate(deleteConfirmTask?.id)}
                style={{
                  flex: 1,
                  backgroundColor: "#ef4444",
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}
                >
                  Delete
                </Text>
              </AnimBtn>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editingTask} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: insets.bottom + 24,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#111",
                marginBottom: 16,
              }}
            >
              Edit Task
            </Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              style={{
                fontSize: 16,
                color: "#111",
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setEditPriority(p.value)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: editPriority === p.value ? GREEN : "#fff",
                    borderWidth: 1,
                    borderColor: editPriority === p.value ? GREEN : "#e5e7eb",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: editPriority === p.value ? "#fff" : "#6b7280",
                      fontWeight: "500",
                    }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <AnimBtn
                onPress={() => setEditingTask(null)}
                style={{
                  flex: 1,
                  backgroundColor: "#f3f4f6",
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#6b7280", fontSize: 15, fontWeight: "600" }}
                >
                  Cancel
                </Text>
              </AnimBtn>
              <AnimBtn
                onPress={() =>
                  updateTask.mutate({
                    id: editingTask.id,
                    title: editTitle,
                    priority: editPriority,
                  })
                }
                disabled={!editTitle.trim()}
                style={{
                  flex: 1,
                  backgroundColor: GREEN,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: !editTitle.trim() ? 0.5 : 1,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}
                >
                  Save
                </Text>
              </AnimBtn>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
