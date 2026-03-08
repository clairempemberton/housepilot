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
  ListTodo,
  ChevronRight,
  X,
  Check,
  Sparkles,
  Pencil,
  Trash2,
} from "lucide-react-native";

const GREEN = "#6666f7";
const GREEN_LIGHT = "#ededfe";

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

export default function ListsTab() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedList, setSelectedList] = useState(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [editItemText, setEditItemText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState([]);

  const { data: listsData, isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: async () => {
      const res = await fetch("/api/lists");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  const { data: itemsData } = useQuery({
    queryKey: ["list-items", selectedList],
    queryFn: async () => {
      const res = await fetch("/api/lists/items?list_id=" + selectedList);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedList,
  });

  const addList = useMutation({
    mutationFn: async ({ title, items }) => {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, items }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: async ({ title }) => {
      await queryClient.cancelQueries({ queryKey: ["lists"] });
      const prev = queryClient.getQueryData(["lists"]);
      const tempList = { id: Date.now(), title, items: [], _temp: true };
      queryClient.setQueryData(["lists"], (old) => {
        if (!old) return { lists: [tempList] };
        return { ...old, lists: [tempList, ...old.lists] };
      });
      setNewTitle("");
      setShowAdd(false);
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["lists"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["lists"] }),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/lists/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: selectedList, title: newItemTitle }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["list-items", selectedList],
      });
      const prev = queryClient.getQueryData(["list-items", selectedList]);
      const tempItem = {
        id: Date.now(),
        title: newItemTitle,
        is_checked: false,
        _temp: true,
      };
      queryClient.setQueryData(["list-items", selectedList], (old) => {
        if (!old) return { items: [tempItem] };
        return { ...old, items: [...old.items, tempItem] };
      });
      setNewItemTitle("");
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(["list-items", selectedList], ctx.prev);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["list-items", selectedList] }),
  });

  const toggleItem = useMutation({
    mutationFn: async (item) => {
      const res = await fetch("/api/lists/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_checked: !item.is_checked }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["list-items", selectedList] }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, title }) => {
      const res = await fetch("/api/lists/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-items", selectedList] });
      setEditingItem(null);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/lists/items?id=" + id, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["list-items", selectedList] }),
  });

  const deleteList = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/lists?id=" + id, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      setSelectedList(null);
    },
  });

  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: "lists" }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setDismissedSuggestions([]);
    } catch (e) {
      console.error(e);
    }
    setLoadingSuggestions(false);
  }, []);

  const acceptListSuggestion = useCallback(
    (s, idx) => {
      addList.mutate({ title: s.title, items: s.items || [] });
      setDismissedSuggestions((prev) => [...prev, idx]);
    },
    [addList],
  );

  const lists = listsData?.lists || [];
  const items = itemsData?.items || [];
  const visibleSuggestions = suggestions.filter(
    (_, i) => !dismissedSuggestions.includes(i),
  );

  // Detail view
  if (selectedList) {
    const currentList = lists.find((l) => l.id === selectedList);
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
            <TouchableOpacity
              onPress={() => setSelectedList(null)}
              style={{ marginBottom: 16 }}
            >
              <Text style={{ fontSize: 14, color: GREEN }}>
                ← Back to lists
              </Text>
            </TouchableOpacity>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 26, fontWeight: "700", color: "#111" }}>
                {currentList?.title || "List"}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    "Delete List",
                    "Remove this list and all items?",
                    [
                      { text: "Cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => deleteList.mutate(selectedList),
                      },
                    ],
                  )
                }
              >
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => toggleItem.mutate(item)}
                onLongPress={() =>
                  Alert.alert("Item", "", [
                    {
                      text: "Edit",
                      onPress: () => {
                        setEditingItem(item);
                        setEditItemText(item.title);
                      },
                    },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteItem.mutate(item.id),
                    },
                    { text: "Cancel", style: "cancel" },
                  ])
                }
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
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: item.is_checked ? GREEN : "#d1d5db",
                    backgroundColor: item.is_checked ? GREEN : "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  {item.is_checked && <Check size={14} color="#fff" />}
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    color: item.is_checked ? "#9ca3af" : "#111",
                    textDecorationLine: item.is_checked
                      ? "line-through"
                      : "none",
                    flex: 1,
                  }}
                >
                  {item.title}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingItem(item);
                    setEditItemText(item.title);
                  }}
                  hitSlop={8}
                  style={{ padding: 4 }}
                >
                  <Pencil size={14} color="#d1d5db" />
                </TouchableOpacity>
              </Pressable>
            ))}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 16,
              }}
            >
              <TextInput
                value={newItemTitle}
                onChangeText={setNewItemTitle}
                placeholder="Add item..."
                placeholderTextColor="#9ca3af"
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: "#111",
                  paddingVertical: 10,
                }}
                onSubmitEditing={() => newItemTitle.trim() && addItem.mutate()}
                returnKeyType="done"
              />
              <AnimBtn
                onPress={() => addItem.mutate()}
                disabled={!newItemTitle.trim()}
                style={{ opacity: !newItemTitle.trim() ? 0.3 : 1 }}
              >
                <Plus size={20} color={GREEN} />
              </AnimBtn>
            </View>
          </View>
        </ScrollView>

        {/* Edit Item Modal */}
        <Modal visible={!!editingItem} transparent animationType="slide">
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
                Edit Item
              </Text>
              <TextInput
                value={editItemText}
                onChangeText={setEditItemText}
                style={{
                  fontSize: 16,
                  color: "#111",
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                }}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <AnimBtn
                  onPress={() => setEditingItem(null)}
                  style={{
                    flex: 1,
                    backgroundColor: "#f3f4f6",
                    paddingVertical: 14,
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#6b7280",
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    Cancel
                  </Text>
                </AnimBtn>
                <AnimBtn
                  onPress={() =>
                    updateItem.mutate({
                      id: editingItem.id,
                      title: editItemText,
                    })
                  }
                  disabled={!editItemText.trim()}
                  style={{
                    flex: 1,
                    backgroundColor: GREEN,
                    paddingVertical: 14,
                    borderRadius: 10,
                    alignItems: "center",
                    opacity: !editItemText.trim() ? 0.5 : 1,
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

  // List overview
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
              Lists
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <AnimBtn
                onPress={fetchSuggestions}
                style={{
                  backgroundColor: GREEN_LIGHT,
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {loadingSuggestions ? (
                  <ActivityIndicator size="small" color={GREEN} />
                ) : (
                  <Sparkles size={18} color={GREEN} />
                )}
              </AnimBtn>
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
          </View>

          {/* AI Suggestions */}
          {visibleSuggestions.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: GREEN,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                AI Suggestions
              </Text>
              {visibleSuggestions.map((s, dispIdx) => {
                const realIdx = suggestions.indexOf(s);
                return (
                  <View
                    key={realIdx}
                    style={{
                      backgroundColor: GREEN_LIGHT,
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: "#111",
                        marginBottom: 2,
                      }}
                    >
                      {s.title}
                    </Text>
                    {s.items && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          marginBottom: 2,
                        }}
                      >
                        {s.items.join(" • ")}
                      </Text>
                    )}
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 8,
                      }}
                    >
                      {s.reason}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <AnimBtn
                        onPress={() => acceptListSuggestion(s, realIdx)}
                        style={{
                          backgroundColor: GREEN,
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: 8,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Plus size={14} color="#fff" />
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: "600",
                            marginLeft: 4,
                          }}
                        >
                          Create
                        </Text>
                      </AnimBtn>
                      <AnimBtn
                        onPress={() =>
                          setDismissedSuggestions((prev) => [...prev, realIdx])
                        }
                        style={{
                          backgroundColor: "#fff",
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: "#6b7280",
                            fontSize: 13,
                            fontWeight: "500",
                          }}
                        >
                          Dismiss
                        </Text>
                      </AnimBtn>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

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
                placeholder="List name"
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
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (newTitle.trim()) {
                    addList.mutate({ title: newTitle.trim() });
                  }
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
                  Create List
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator color="#9ca3af" style={{ marginTop: 40 }} />
          ) : lists.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <ListTodo size={32} color="#e5e7eb" />
              <Text style={{ fontSize: 14, color: "#9ca3af", marginTop: 8 }}>
                No lists yet
              </Text>
            </View>
          ) : (
            lists.map((list) => (
              <Pressable
                key={list.id}
                onPress={() => setSelectedList(list.id)}
                onLongPress={() =>
                  Alert.alert("Delete List", "Remove this list?", [
                    { text: "Cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteList.mutate(list.id),
                    },
                  ])
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  borderBottomWidth: 0.5,
                  borderBottomColor: "#f3f4f6",
                }}
              >
                <ListTodo size={18} color={GREEN} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 16, color: "#111" }}>
                    {list.title}
                  </Text>
                  {list.items && (
                    <Text
                      style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}
                    >
                      {list.items.length} item
                      {list.items.length !== 1 ? "s" : ""}
                    </Text>
                  )}
                </View>
                <ChevronRight size={16} color="#d1d5db" />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
