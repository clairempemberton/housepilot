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
import { Package, Minus, Plus, X, Sparkles, Pencil } from "lucide-react-native";

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

export default function SuppliesTab() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [editingSupply, setEditingSupply] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState([]);

  const CATEGORIES = [
    "kitchen",
    "bathroom",
    "cleaning",
    "laundry",
    "pet",
    "general",
  ];

  const { data: suppliesData, isLoading } = useQuery({
    queryKey: ["supplies"],
    queryFn: async () => {
      const res = await fetch("/api/supplies");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  const addSupply = useMutation({
    mutationFn: async ({ item_name, category }) => {
      const res = await fetch("/api/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_name, category }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      setNewName("");
      setNewCategory("general");
      setShowAdd(false);
    },
  });

  const updateSupply = useMutation({
    mutationFn: async (updates) => {
      const res = await fetch("/api/supplies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      setEditingSupply(null);
    },
  });

  const deleteSupply = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/supplies?id=" + id, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplies"] }),
  });

  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: "supplies" }),
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

  const acceptSupplySuggestion = useCallback(
    (s, idx) => {
      addSupply.mutate({
        item_name: s.item_name,
        category: s.category || "general",
      });
      setDismissedSuggestions((prev) => [...prev, idx]);
    },
    [addSupply],
  );

  const supplies = suppliesData?.supplies || [];
  const getStatusColor = (qty) =>
    qty < 20 ? "#ef4444" : qty < 50 ? "#f97316" : GREEN;
  const visibleSuggestions = suggestions.filter(
    (_, i) => !dismissedSuggestions.includes(i),
  );

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
              Supplies
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
                      {s.item_name}
                    </Text>
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
                        onPress={() => acceptSupplySuggestion(s, realIdx)}
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
                          Track
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

          {/* Add Form */}
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
                value={newName}
                onChangeText={setNewName}
                placeholder="Supply name"
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, marginBottom: 12 }}
              >
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setNewCategory(c)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: newCategory === c ? GREEN : "#fff",
                        borderWidth: 1,
                        borderColor: newCategory === c ? GREEN : "#e5e7eb",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: newCategory === c ? "#fff" : "#6b7280",
                          fontWeight: "500",
                          textTransform: "capitalize",
                        }}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <AnimBtn
                onPress={() =>
                  addSupply.mutate({
                    item_name: newName,
                    category: newCategory,
                  })
                }
                disabled={!newName.trim()}
                style={{
                  backgroundColor: GREEN,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: !newName.trim() ? 0.5 : 1,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}
                >
                  Add Supply
                </Text>
              </AnimBtn>
            </View>
          )}

          {/* Supplies List */}
          {isLoading ? (
            <ActivityIndicator color="#9ca3af" style={{ marginTop: 40 }} />
          ) : supplies.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Package size={32} color="#e5e7eb" />
              <Text style={{ fontSize: 14, color: "#9ca3af", marginTop: 8 }}>
                No supplies tracked yet
              </Text>
            </View>
          ) : (
            supplies.map((supply) => {
              const color = getStatusColor(supply.quantity_remaining);
              return (
                <Pressable
                  key={supply.id}
                  onLongPress={() =>
                    Alert.alert("Supply", "", [
                      {
                        text: "Edit",
                        onPress: () => {
                          setEditingSupply(supply);
                          setEditName(supply.item_name);
                          setEditCategory(supply.category || "general");
                        },
                      },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => deleteSupply.mutate(supply.id),
                      },
                      { text: "Cancel", style: "cancel" },
                    ])
                  }
                  style={{
                    backgroundColor: "#f9fafb",
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: "#111",
                        flex: 1,
                      }}
                    >
                      {supply.item_name}
                    </Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#9ca3af",
                          marginRight: 8,
                        }}
                      >
                        {supply.category}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingSupply(supply);
                          setEditName(supply.item_name);
                          setEditCategory(supply.category || "general");
                        }}
                        hitSlop={8}
                      >
                        <Pencil size={14} color="#d1d5db" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: "#e5e7eb",
                      borderRadius: 3,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        height: 6,
                        backgroundColor: color,
                        borderRadius: 3,
                        width: supply.quantity_remaining + "%",
                      }}
                    />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 13, color, fontWeight: "600" }}>
                      {supply.quantity_remaining}%
                    </Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <AnimBtn
                        onPress={() =>
                          updateSupply.mutate({
                            id: supply.id,
                            quantity_remaining: Math.max(
                              0,
                              supply.quantity_remaining - 10,
                            ),
                          })
                        }
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          backgroundColor: "#fff",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 6,
                        }}
                      >
                        <Minus size={14} color="#6b7280" />
                      </AnimBtn>
                      <AnimBtn
                        onPress={() =>
                          updateSupply.mutate({
                            id: supply.id,
                            quantity_remaining: Math.min(
                              100,
                              supply.quantity_remaining + 10,
                            ),
                          })
                        }
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          backgroundColor: "#fff",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Plus size={14} color="#6b7280" />
                      </AnimBtn>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={!!editingSupply} transparent animationType="slide">
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
              Edit Supply
            </Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 16 }}
            >
              <View style={{ flexDirection: "row", gap: 6 }}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setEditCategory(c)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: editCategory === c ? GREEN : "#fff",
                      borderWidth: 1,
                      borderColor: editCategory === c ? GREEN : "#e5e7eb",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: editCategory === c ? "#fff" : "#6b7280",
                        fontWeight: "500",
                        textTransform: "capitalize",
                      }}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <AnimBtn
                onPress={() => setEditingSupply(null)}
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
                  updateSupply.mutate({
                    id: editingSupply.id,
                    item_name: editName,
                    category: editCategory,
                  })
                }
                disabled={!editName.trim()}
                style={{
                  flex: 1,
                  backgroundColor: GREEN,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: !editName.trim() ? 0.5 : 1,
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
