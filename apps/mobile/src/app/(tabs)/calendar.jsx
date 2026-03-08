import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Pencil,
  X,
  CheckCircle2,
  Circle,
} from "lucide-react-native";

const GREEN = "#6666f7";
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function AnimBtn({ onPress, style, children, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        if (Platform.OS !== "web")
          Animated.spring(scale, {
            toValue: 0.96,
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

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

function getWeekDays(date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(start.getDate() - day);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(start);
    dd.setDate(dd.getDate() + i);
    days.push(dd);
  }
  return days;
}

export default function CalendarTab() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const [viewMode, setViewMode] = useState("month");
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [actionEvent, setActionEvent] = useState(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState(null);

  const startDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const endDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${new Date(viewYear, viewMonth + 1, 0).getDate()}`;

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["calendar", viewYear, viewMonth],
    queryFn: async () => {
      const res = await fetch(
        `/api/calendar?start=${startDate}&end=${endDate}`,
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", "active"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?completed=false");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          event_date: selectedDate,
          event_time: newTime || null,
          calendar_type: "family",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      setNewTitle("");
      setNewTime("");
      setShowAdd(false);
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/calendar?id=" + id, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ["calendar", viewYear, viewMonth],
      });
      const prev = queryClient.getQueryData(["calendar", viewYear, viewMonth]);
      queryClient.setQueryData(["calendar", viewYear, viewMonth], (old) => {
        if (!old) return old;
        return { ...old, events: old.events.filter((e) => e.id !== id) };
      });
      setDeleteConfirmEvent(null);
      return { prev };
    },
    onError: (err, id, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(["calendar", viewYear, viewMonth], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
  });

  const events = eventsData?.events || [];
  const tasks = tasksData?.tasks || [];
  const days = getMonthDays(viewYear, viewMonth);
  const weekDays = getWeekDays(selectedDate);

  const getEventsForDate = (dateStr) =>
    events.filter((e) => {
      const eventDate = e.event_date ? e.event_date.split("T")[0] : "";
      return eventDate === dateStr;
    });
  const getTasksForDate = (dateStr) =>
    tasks.filter((t) => t.due_date && t.due_date.split("T")[0] === dateStr);
  const selectedEvents = getEventsForDate(selectedDate);
  const selectedTasks = getTasksForDate(selectedDate);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else setViewMonth(viewMonth + 1);
  };

  const makeDateStr = (day) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const selectedLabel = (() => {
    const d = new Date(selectedDate + "T12:00:00");
    if (selectedDate === todayStr) return "Today";
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  })();

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
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 26, fontWeight: "700", color: "#111" }}>
              Calendar
            </Text>
            <AnimBtn
              onPress={() => setShowAdd(true)}
              style={{
                backgroundColor: GREEN,
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={18} color="#fff" />
            </AnimBtn>
          </View>

          {/* View Toggle */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#f3f4f6",
              borderRadius: 10,
              padding: 3,
              marginBottom: 16,
            }}
          >
            {[
              { v: "month", l: "Month" },
              { v: "week", l: "Week" },
            ].map((m) => (
              <TouchableOpacity
                key={m.v}
                onPress={() => setViewMode(m.v)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: viewMode === m.v ? "#fff" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: viewMode === m.v ? "#111" : "#9ca3af",
                  }}
                >
                  {m.l}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Month Nav */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }}>
              <ChevronLeft size={20} color="#9ca3af" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#111" }}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }}>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {viewMode === "month" ? (
            /* Month Grid */
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                {DAYS.map((d) => (
                  <View key={d} style={{ flex: 1, alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                        fontWeight: "600",
                      }}
                    >
                      {d}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {days.map((day, i) => {
                  if (!day)
                    return (
                      <View
                        key={`e-${i}`}
                        style={{ width: "14.28%", height: 44 }}
                      />
                    );
                  const dateStr = makeDateStr(day);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const hasEvents = getEventsForDate(dateStr).length > 0;
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => setSelectedDate(dateStr)}
                      style={{
                        width: "14.28%",
                        height: 44,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSelected
                            ? GREEN
                            : isToday
                              ? "#f3f4f6"
                              : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: isToday || isSelected ? "700" : "400",
                            color: isSelected
                              ? "#fff"
                              : isToday
                                ? GREEN
                                : "#111",
                          }}
                        >
                          {day}
                        </Text>
                      </View>
                      {hasEvents && !isSelected && (
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: GREEN,
                            marginTop: 2,
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            /* Week View */
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", marginBottom: 4 }}>
                {weekDays.map((d) => {
                  const dateStr = d.toISOString().split("T")[0];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const dayEvents = getEventsForDate(dateStr);
                  return (
                    <TouchableOpacity
                      key={dateStr}
                      onPress={() => setSelectedDate(dateStr)}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        paddingVertical: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          fontWeight: "600",
                          marginBottom: 4,
                        }}
                      >
                        {DAYS[d.getDay()]}
                      </Text>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSelected
                            ? GREEN
                            : isToday
                              ? "#f3f4f6"
                              : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: isToday || isSelected ? "700" : "400",
                            color: isSelected
                              ? "#fff"
                              : isToday
                                ? GREEN
                                : "#111",
                          }}
                        >
                          {d.getDate()}
                        </Text>
                      </View>
                      {dayEvents.length > 0 && !isSelected && (
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: GREEN,
                            marginTop: 4,
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Selected Day */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#111",
                marginBottom: 12,
              }}
            >
              {selectedLabel}
            </Text>

            {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: 14,
                  padding: 24,
                  alignItems: "center",
                }}
              >
                <Calendar size={24} color="#d1d5db" />
                <Text style={{ fontSize: 14, color: "#9ca3af", marginTop: 8 }}>
                  Nothing scheduled
                </Text>
              </View>
            ) : (
              <View>
                {selectedEvents.map((event) => (
                  <View
                    key={event.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      borderBottomWidth: 0.5,
                      borderBottomColor: "#f3f4f6",
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
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, color: "#111" }}>
                        {event.title}
                      </Text>
                      {event.event_time && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#9ca3af",
                            marginTop: 2,
                          }}
                        >
                          {event.event_time.slice(0, 5)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => setActionEvent(event)}
                      hitSlop={8}
                      style={{ padding: 6 }}
                    >
                      <Pencil size={14} color="#d1d5db" />
                    </TouchableOpacity>
                  </View>
                ))}
                {selectedTasks.map((task) => (
                  <View
                    key={task.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      borderBottomWidth: 0.5,
                      borderBottomColor: "#f3f4f6",
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
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#111" }}>
                New Event
              </Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <X size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>
              {selectedLabel}
            </Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Event title"
              placeholderTextColor="#9ca3af"
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
            <View style={{ flexDirection: "row", gap: 10 }}>
              <AnimBtn
                onPress={() => setShowAdd(false)}
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
                onPress={() => addEvent.mutate()}
                disabled={!newTitle.trim()}
                style={{
                  flex: 1,
                  backgroundColor: GREEN,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: !newTitle.trim() ? 0.5 : 1,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}
                >
                  Add
                </Text>
              </AnimBtn>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action Menu */}
      <Modal visible={!!actionEvent} transparent animationType="fade">
        <Pressable
          onPress={() => setActionEvent(null)}
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
              onPress={() => {
                setActionEvent(null);
                setDeleteConfirmEvent(actionEvent);
              }}
              style={{ paddingVertical: 14, paddingHorizontal: 16 }}
            >
              <Text style={{ fontSize: 15, color: "#ef4444" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Delete Confirm */}
      <Modal visible={!!deleteConfirmEvent} transparent animationType="fade">
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
              Delete this event?
            </Text>
            <Text style={{ fontSize: 14, color: "#9ca3af", marginBottom: 20 }}>
              This action cannot be undone.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <AnimBtn
                onPress={() => setDeleteConfirmEvent(null)}
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
                onPress={() => deleteEvent.mutate(deleteConfirmEvent?.id)}
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
    </View>
  );
}
