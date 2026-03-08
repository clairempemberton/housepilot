import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowLeft, Brain, AlertTriangle } from "lucide-react-native";

const GREEN = "#6666f7";

export default function MentalLoadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: memoryData, isLoading } = useQuery({
    queryKey: ["ai-memory"],
    queryFn: async () => {
      const res = await fetch("/api/ai/memory");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const memory = memoryData?.memory;
  const mentalLoad = memory?.mentalLoad || [];
  const frictionPoints = memory?.frictionPoints || [];
  const patterns = memory?.patterns;
  const categoryRates = memory?.categoryRates || [];

  const assignedMembers = mentalLoad.filter(
    (m) => m.memberType !== "system" && m.tasksAssigned > 0,
  );
  const maxLoadMember =
    assignedMembers.length > 0
      ? assignedMembers.reduce((a, b) =>
          a.loadPercentage > b.loadPercentage ? a : b,
        )
      : null;

  const loadFriction = frictionPoints.filter(
    (f) =>
      f.type === "mental_load_imbalance" || f.type === "postponed_category",
  );

  const postponedCats = categoryRates
    .filter((c) => c.postponed > 0)
    .sort((a, b) => b.postponed - a.postponed);

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
              Mental Load
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
            Who carries the planning & execution load.
          </Text>

          {isLoading ? (
            <ActivityIndicator color="#9ca3af" style={{ marginTop: 40 }} />
          ) : !memory ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Brain size={32} color="#d1d5db" />
              <Text
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                Complete some tasks and assign members to see mental load
                analysis.
              </Text>
            </View>
          ) : (
            <View>
              {/* Friction Alerts */}
              {loadFriction.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  {loadFriction.map((f, i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: "row",
                        backgroundColor: "#fefce8",
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 6,
                      }}
                    >
                      <AlertTriangle
                        size={14}
                        color="#ca8a04"
                        style={{ marginRight: 8, marginTop: 2 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: "#854d0e",
                          }}
                        >
                          {f.message}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#a16207",
                            marginTop: 2,
                          }}
                        >
                          {f.suggestion}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Task Distribution */}
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
                    marginBottom: 14,
                  }}
                >
                  Task Distribution
                </Text>
                {mentalLoad.length === 0 ? (
                  <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                    No tasks assigned to members yet.
                  </Text>
                ) : (
                  mentalLoad.map((member) => {
                    const isHighest =
                      maxLoadMember &&
                      member.memberId === maxLoadMember.memberId &&
                      assignedMembers.length >= 2;
                    return (
                      <View
                        key={member.memberId || "unassigned"}
                        style={{ marginBottom: 14 }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <View
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor:
                                  member.memberType === "system"
                                    ? "#e5e7eb"
                                    : "#111",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 8,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: "600",
                                  color:
                                    member.memberType === "system"
                                      ? "#6b7280"
                                      : "#fff",
                                }}
                              >
                                {member.memberName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <Text
                              style={{
                                fontSize: 13,
                                color: "#111",
                                fontWeight: "500",
                              }}
                            >
                              {member.memberName}
                            </Text>
                            {isHighest && (
                              <View
                                style={{
                                  backgroundColor: "#fefce8",
                                  paddingHorizontal: 6,
                                  paddingVertical: 1,
                                  borderRadius: 6,
                                  marginLeft: 6,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 9,
                                    color: "#ca8a04",
                                    fontWeight: "600",
                                  }}
                                >
                                  Highest
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: "#111",
                            }}
                          >
                            {member.loadPercentage}%
                          </Text>
                        </View>
                        <View
                          style={{
                            height: 6,
                            backgroundColor: "#e5e7eb",
                            borderRadius: 3,
                            marginBottom: 4,
                          }}
                        >
                          <View
                            style={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: isHighest ? "#eab308" : "#111",
                              width: member.loadPercentage + "%",
                            }}
                          />
                        </View>
                        <Text style={{ fontSize: 10, color: "#9ca3af" }}>
                          {member.tasksAssigned} assigned ·{" "}
                          {member.tasksCompleted} completed
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>

              {/* Household Rhythm */}
              {patterns && (
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
                    Household Rhythm
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    {[
                      {
                        label: "Most productive",
                        val: patterns.mostProductiveDay,
                      },
                      {
                        label: "Least productive",
                        val: patterns.leastProductiveDay,
                      },
                      { label: "Peak time", val: patterns.peakTimeBucket },
                      {
                        label: "Total completions",
                        val: patterns.totalCompletions,
                      },
                    ].map((item) => (
                      <View key={item.label} style={{ width: "46%" }}>
                        <Text style={{ fontSize: 10, color: "#9ca3af" }}>
                          {item.label}
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#111",
                            textTransform: "capitalize",
                            marginTop: 1,
                          }}
                        >
                          {item.val || "—"}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Weekly rhythm bars */}
                  {patterns.completionsByDay && (
                    <View style={{ marginTop: 16 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#9ca3af",
                          marginBottom: 8,
                        }}
                      >
                        Weekly rhythm
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-end",
                          justifyContent: "space-between",
                          height: 50,
                        }}
                      >
                        {patterns.completionsByDay.map((d) => {
                          const max = Math.max(
                            ...patterns.completionsByDay.map((x) => x.count),
                            1,
                          );
                          const pct = (d.count / max) * 100;
                          return (
                            <View
                              key={d.day}
                              style={{
                                flex: 1,
                                alignItems: "center",
                                marginHorizontal: 2,
                              }}
                            >
                              <View
                                style={{
                                  width: 14,
                                  height: Math.max(pct * 0.45, 3),
                                  borderRadius: 3,
                                  backgroundColor:
                                    d.count > 0 ? "#111" : "#d1d5db",
                                }}
                              />
                              <Text
                                style={{
                                  fontSize: 9,
                                  color: "#9ca3af",
                                  marginTop: 3,
                                }}
                              >
                                {d.day.slice(0, 2)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Friction Areas */}
              {postponedCats.length > 0 && (
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
                      marginBottom: 4,
                    }}
                  >
                    Friction Areas
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      marginBottom: 12,
                    }}
                  >
                    Categories most often postponed.
                  </Text>
                  {postponedCats.map((cat) => {
                    const pct =
                      cat.total > 0
                        ? Math.round((cat.completed / cat.total) * 100)
                        : 0;
                    return (
                      <View
                        key={cat.name}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: "#f3f4f6",
                        }}
                      >
                        <View>
                          <Text
                            style={{
                              fontSize: 13,
                              color: "#111",
                              textTransform: "capitalize",
                              fontWeight: "500",
                            }}
                          >
                            {cat.name}
                          </Text>
                          <Text style={{ fontSize: 10, color: "#9ca3af" }}>
                            {cat.total} tasks · {pct}% done
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: "#fef2f2",
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              color: "#dc2626",
                              fontWeight: "600",
                            }}
                          >
                            {cat.postponed} overdue
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Schedule Pressure */}
              {memory.scheduleAnalysis?.overloadedDays?.length > 0 && (
                <View
                  style={{
                    backgroundColor: "#f9fafb",
                    borderRadius: 16,
                    padding: 16,
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
                    Schedule Pressure
                  </Text>
                  {memory.scheduleAnalysis.overloadedDays.map((od) => (
                    <View
                      key={od.date}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: "#f3f4f6",
                      }}
                    >
                      <View>
                        <Text
                          style={{
                            fontSize: 13,
                            color: "#111",
                            fontWeight: "500",
                          }}
                        >
                          {od.dayName}
                        </Text>
                        <Text style={{ fontSize: 10, color: "#9ca3af" }}>
                          {od.date}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: "#fefce8",
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#ca8a04",
                            fontWeight: "600",
                          }}
                        >
                          {od.eventCount} events
                        </Text>
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
