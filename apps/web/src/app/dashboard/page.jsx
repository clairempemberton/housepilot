"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sun,
  Moon,
  Cloud,
  CheckCircle2,
  Circle,
  Calendar,
  ArrowRight,
  Sparkles,
  Plus,
  BarChart3,
  AlertTriangle,
  Package,
  Wrench,
  Zap,
  Brain,
  Target,
  Focus,
  Battery,
  BatteryLow,
} from "lucide-react";
import useUser from "@/utils/useUser";
import AppShell from "../../components/AppShell";
import AIInsights from "../../components/AIInsights";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getGreetingIcon() {
  const hour = new Date().getHours();
  if (hour < 6 || hour >= 20) return Moon;
  if (hour < 12) return Sun;
  return Cloud;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const MODES = [
  {
    id: "today",
    label: "Today",
    icon: Focus,
    desc: "Focus on what matters today",
  },
  {
    id: "planning",
    label: "Planning",
    icon: Calendar,
    desc: "Organize the week ahead",
  },
  {
    id: "catchup",
    label: "Catch-Up",
    icon: Target,
    desc: "Clear your backlog",
  },
  {
    id: "low-energy",
    label: "Low-Energy",
    icon: BatteryLow,
    desc: "Keep it simple today",
  },
];

export default function DashboardPage() {
  const { data: user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("today");

  useEffect(() => {
    if (!userLoading && !user && typeof window !== "undefined") {
      window.location.href = "/account/signin";
    }
  }, [user, userLoading]);

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (
      profileData?.user &&
      profileData.user.onboarding_completed === false &&
      typeof window !== "undefined"
    ) {
      window.location.href = "/onboarding";
    }
  }, [profileData]);

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", "incomplete"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?completed=false");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: eventsData } = useQuery({
    queryKey: ["calendar", "upcoming"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000)
        .toISOString()
        .split("T")[0];
      const res = await fetch(`/api/calendar?start=${today}&end=${nextWeek}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: suppliesData } = useQuery({
    queryKey: ["supplies"],
    queryFn: async () => {
      const res = await fetch("/api/supplies");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: maintenanceData } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const res = await fetch("/api/maintenance");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: progressData } = useQuery({
    queryKey: ["progress", "week"],
    queryFn: async () => {
      const res = await fetch("/api/progress?period=week");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: memoryData } = useQuery({
    queryKey: ["ai-memory"],
    queryFn: async () => {
      const res = await fetch("/api/ai/memory");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
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

  const tasks = tasksData?.tasks || [];
  const events = eventsData?.events || [];
  const supplies = suppliesData?.supplies || [];
  const maintenanceTasks = maintenanceData?.tasks || [];
  const progress = progressData?.progress;
  const memory = memoryData?.memory;

  const lowSupplies = supplies.filter((s) => s.quantity_remaining < 30);
  const overdueMaint = maintenanceTasks.filter(
    (m) => m.next_due && new Date(m.next_due) < new Date(),
  );
  const upcomingMaint = maintenanceTasks.filter(
    (m) =>
      m.next_due &&
      new Date(m.next_due) >= new Date() &&
      new Date(m.next_due) <= new Date(Date.now() + 14 * 86400000),
  );

  const firstName = user?.name?.split(" ")[0] || "there";
  const GreetingIcon = getGreetingIcon();

  // Health Score
  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date(),
  ).length;
  const completionRate = progress?.completionRate || 0;
  const supplyHealth =
    supplies.length > 0
      ? Math.round(
          supplies.reduce((s, i) => s + i.quantity_remaining, 0) /
            supplies.length,
        )
      : 100;
  const maintIssues = overdueMaint.length;
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        completionRate * 0.4 +
          supplyHealth * 0.3 +
          Math.max(0, 100 - overdueTasks * 15) * 0.15 +
          Math.max(0, 100 - maintIssues * 20) * 0.15,
      ),
    ),
  );
  const healthLabel =
    healthScore >= 80
      ? "Great"
      : healthScore >= 60
        ? "Good"
        : healthScore >= 40
          ? "Needs attention"
          : "Needs help";
  const healthColor =
    healthScore >= 80
      ? "text-[#6666f7]"
      : healthScore >= 60
        ? "text-[#6666f7]"
        : healthScore >= 40
          ? "text-yellow-600"
          : "text-red-500";

  const alertCount = lowSupplies.length + overdueMaint.length + overdueTasks;
  const frictionPoints = memory?.frictionPoints || [];

  // Mode-specific filtering
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks =
    mode === "today"
      ? tasks
          .filter(
            (t) =>
              (t.due_date && t.due_date.toString().split("T")[0] <= todayStr) ||
              !t.due_date,
          )
          .slice(0, 5)
      : mode === "catchup"
        ? tasks
            .filter((t) => t.due_date && new Date(t.due_date) < new Date())
            .slice(0, 8)
        : mode === "low-energy"
          ? tasks.slice(0, 3)
          : tasks.slice(0, 6);

  const upcomingEvents =
    mode === "planning"
      ? events.slice(0, 8)
      : mode === "low-energy"
        ? events.filter((e) => e.event_date === todayStr).slice(0, 3)
        : events.slice(0, 5);

  const modeMessage =
    mode === "today"
      ? "Showing what needs your attention today."
      : mode === "planning"
        ? "Plan your week. Here's everything coming up."
        : mode === "catchup"
          ? "Time to clear the backlog. Focus on overdue items."
          : "Taking it easy. Only essentials today.";

  if (userLoading) {
    return (
      <AppShell activeTab="/dashboard">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="/dashboard">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
        {/* Greeting */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-1">
            <GreetingIcon size={20} className="text-gray-400" />
            <h1 className="text-2xl font-semibold text-gray-900">
              {getGreeting()}, {firstName}
            </h1>
          </div>
          <p className="text-sm text-gray-500">{modeMessage}</p>
        </div>

        {/* Household Modes */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-1">
          {MODES.map((m) => {
            const IconComp = m.icon;
            const isActive = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[#6666f7] text-white"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <IconComp size={14} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-6">
          {/* Household Status Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-400 mb-1">Health Score</p>
              <p className={`text-xl font-semibold ${healthColor}`}>
                {healthScore}
              </p>
              <p className="text-[10px] text-gray-400">{healthLabel}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-400 mb-1">Active Tasks</p>
              <p className="text-xl font-semibold text-gray-900">
                {tasks.length}
              </p>
              <p className="text-[10px] text-gray-400">
                {overdueTasks} overdue
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-400 mb-1">This Week</p>
              <p className="text-xl font-semibold text-gray-900">
                {events.length}
              </p>
              <p className="text-[10px] text-gray-400">events</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-400 mb-1">Streak</p>
              <p className="text-xl font-semibold text-gray-900">
                {progress?.currentStreak || 0}
              </p>
              <p className="text-[10px] text-gray-400">days</p>
            </div>
          </div>

          {/* Friction Alerts */}
          {(alertCount > 0 || frictionPoints.length > 0) && (
            <div className="space-y-2">
              {overdueMaint.length > 0 && (
                <a
                  href="/dashboard/maintenance"
                  className="flex items-center space-x-3 px-3 py-2.5 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                >
                  <Wrench size={14} className="text-red-500 flex-shrink-0" />
                  <span className="text-xs text-red-700 flex-1">
                    {overdueMaint.length} overdue maintenance:{" "}
                    {overdueMaint.map((m) => m.title).join(", ")}
                  </span>
                  <ArrowRight size={12} className="text-red-400" />
                </a>
              )}
              {lowSupplies.length > 0 && (
                <a
                  href="/dashboard/supplies"
                  className="flex items-center space-x-3 px-3 py-2.5 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors"
                >
                  <Package
                    size={14}
                    className="text-yellow-600 flex-shrink-0"
                  />
                  <span className="text-xs text-yellow-700 flex-1">
                    {lowSupplies.length} supplies running low:{" "}
                    {lowSupplies.map((s) => s.item_name).join(", ")}
                  </span>
                  <ArrowRight size={12} className="text-yellow-500" />
                </a>
              )}
              {frictionPoints
                .filter((f) => f.severity === "high")
                .slice(0, 2)
                .map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start space-x-3 px-3 py-2.5 bg-orange-50 rounded-xl"
                  >
                    <AlertTriangle
                      size={14}
                      className="text-orange-500 flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-xs text-orange-700">
                        {f.message}
                      </span>
                      <p className="text-[10px] text-orange-500 mt-0.5">
                        {f.suggestion}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* AI Smart Suggestions */}
          <AIInsights module="home" />

          {/* Tasks */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {mode === "catchup"
                  ? "Overdue Tasks"
                  : mode === "low-energy"
                    ? "Essential Tasks"
                    : "Tasks"}
              </h2>
              <a
                href="/dashboard/tasks"
                className="flex items-center space-x-1 text-sm text-gray-400 hover:text-[#6666f7] transition-colors"
              >
                <span>View all</span>
                <ArrowRight size={14} />
              </a>
            </div>
            {todayTasks.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <CheckCircle2
                  size={24}
                  className="text-gray-300 mx-auto mb-2"
                />
                <p className="text-sm text-gray-400">
                  {mode === "catchup"
                    ? "No overdue tasks — great work!"
                    : "No tasks yet."}
                </p>
                <a
                  href="/dashboard/tasks"
                  className="inline-flex items-center space-x-1 mt-3 text-sm text-[#6666f7] font-medium hover:underline"
                >
                  <Plus size={14} />
                  <span>Add tasks</span>
                </a>
              </div>
            ) : (
              <div className="space-y-1">
                {todayTasks.map((task) => {
                  const isOverdue =
                    task.due_date && new Date(task.due_date) < new Date();
                  return (
                    <button
                      key={task.id}
                      onClick={() => toggleTask.mutate(task)}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      {task.is_completed ? (
                        <CheckCircle2
                          size={18}
                          className="text-gray-300 flex-shrink-0"
                        />
                      ) : (
                        <Circle
                          size={18}
                          className={`flex-shrink-0 ${isOverdue ? "text-red-300" : "text-gray-300"}`}
                        />
                      )}
                      <span
                        className={`text-sm flex-1 ${task.is_completed ? "text-gray-400 line-through" : "text-gray-900"}`}
                      >
                        {task.title}
                      </span>
                      {task.due_date && (
                        <span
                          className={`text-xs ${isOverdue ? "text-red-400" : "text-gray-400"}`}
                        >
                          {formatDate(task.due_date)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Upcoming Events */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {mode === "planning" ? "This Week" : "Upcoming"}
              </h2>
              <a
                href="/dashboard/calendar"
                className="flex items-center space-x-1 text-sm text-gray-400 hover:text-[#6666f7] transition-colors"
              >
                <span>View calendar</span>
                <ArrowRight size={14} />
              </a>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <Calendar size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-1">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-gray-50"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#6666f7] flex-shrink-0" />
                    <span className="text-sm text-gray-900 flex-1">
                      {event.title}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(event.event_date)}
                      {event.event_time
                        ? ` ${event.event_time.slice(0, 5)}`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Maintenance Due */}
          {upcomingMaint.length > 0 && mode !== "low-energy" && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Maintenance Due
                </h2>
                <a
                  href="/dashboard/maintenance"
                  className="flex items-center space-x-1 text-sm text-gray-400 hover:text-[#6666f7] transition-colors"
                >
                  <span>View all</span>
                  <ArrowRight size={14} />
                </a>
              </div>
              <div className="space-y-1">
                {upcomingMaint.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-gray-50"
                  >
                    <Wrench size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900 flex-1">
                      {task.title}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(task.next_due)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <a
              href="/dashboard/assistant"
              className="flex items-center space-x-2 px-3 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Sparkles size={16} className="text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-900">Ask AI</p>
                <p className="text-[9px] text-gray-400">Chat with HousePilot</p>
              </div>
            </a>
            <a
              href="/dashboard/autopilot"
              className="flex items-center space-x-2 px-3 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Zap size={16} className="text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-900">Autopilot</p>
                <p className="text-[9px] text-gray-400">Auto-manage</p>
              </div>
            </a>
            <a
              href="/dashboard/mental-load"
              className="flex items-center space-x-2 px-3 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Brain size={16} className="text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-900">Mental Load</p>
                <p className="text-[9px] text-gray-400">Who does what</p>
              </div>
            </a>
            <a
              href="/dashboard/progress"
              className="flex items-center space-x-2 px-3 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <BarChart3 size={16} className="text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-900">Progress</p>
                <p className="text-[9px] text-gray-400">Trends & data</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
