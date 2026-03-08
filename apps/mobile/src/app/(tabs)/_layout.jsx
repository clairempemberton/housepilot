import { Tabs } from "expo-router";
import {
  Home,
  CheckSquare,
  ListTodo,
  Calendar,
  MoreHorizontal,
} from "lucide-react-native";

const GREEN = "#6666f7";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderColor: "#f3f4f6",
          paddingTop: 4,
        },
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color }) => <CheckSquare size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: "Lists",
          tabBarIcon: ({ color }) => <ListTodo size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => <Calendar size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color }) => <MoreHorizontal size={22} color={color} />,
        }}
      />
      {/* Hidden routes — accessible via navigation but not in tab bar */}
      <Tabs.Screen name="supplies" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="assistant" options={{ href: null }} />
      <Tabs.Screen name="maintenance" options={{ href: null }} />
      <Tabs.Screen name="mental-load" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="autopilot" options={{ href: null }} />
    </Tabs>
  );
}
