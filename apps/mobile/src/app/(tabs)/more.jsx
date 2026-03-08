import { View, Text, ScrollView, Pressable, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useRef } from "react";
import {
  Package,
  MessageSquare,
  Brain,
  Wrench,
  BarChart3,
  Target,
  Zap,
  Settings,
  ChevronRight,
  Home,
} from "lucide-react-native";

const GREEN = "#6666f7";
const GREEN_LIGHT = "#ededfe";

function MenuRow({ icon, label, subtitle, onPress, color }) {
  const scale = useRef(new Animated.Value(1)).current;
  const IconComp = icon;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scale, {
          toValue: 0.98,
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
      <Animated.View
        style={{
          transform: [{ scale }],
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: "#fff",
          borderRadius: 14,
          marginBottom: 2,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: color || GREEN_LIGHT,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <IconComp size={20} color={GREEN} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#111" }}>
            {label}
          </Text>
          {subtitle && (
            <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
              {subtitle}
            </Text>
          )}
        </View>
        <ChevronRight size={18} color="#d1d5db" />
      </Animated.View>
    </Pressable>
  );
}

export default function MoreTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const sections = [
    {
      title: "Modules",
      items: [
        {
          icon: Package,
          label: "Supplies",
          subtitle: "Track household supplies",
          route: "/(tabs)/supplies",
        },
        {
          icon: Wrench,
          label: "Maintenance",
          subtitle: "Home maintenance schedule",
          route: "/(tabs)/maintenance",
        },
        {
          icon: Target,
          label: "Goals",
          subtitle: "Family goals & streaks",
          route: "/(tabs)/goals",
        },
        {
          icon: BarChart3,
          label: "Progress",
          subtitle: "Analytics & insights",
          route: "/(tabs)/progress",
        },
        {
          icon: Brain,
          label: "Mental Load",
          subtitle: "Workload distribution",
          route: "/(tabs)/mental-load",
        },
      ],
    },
    {
      title: "AI & Automation",
      items: [
        {
          icon: MessageSquare,
          label: "AI Assistant",
          subtitle: "Chat with HousePilot",
          route: "/(tabs)/assistant",
        },
        {
          icon: Zap,
          label: "Autopilot",
          subtitle: "Smart scheduling & reminders",
          route: "/(tabs)/autopilot",
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          icon: Settings,
          label: "Settings",
          subtitle: "Account & subscription",
          route: "/(tabs)/settings",
        },
      ],
    },
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
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: "#111",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Home size={16} color="#fff" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#111" }}>
              More
            </Text>
          </View>

          {sections.map((section) => (
            <View key={section.title} style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 8,
                  paddingHorizontal: 4,
                }}
              >
                {section.title}
              </Text>
              <View
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                {section.items.map((item) => (
                  <MenuRow
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    subtitle={item.subtitle}
                    onPress={() => router.push(item.route)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
