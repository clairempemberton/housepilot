"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Zap,
  Shield,
  ShoppingCart,
  Wrench,
  ChefHat,
  CheckSquare,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import AppShell from "../../../components/AppShell";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function AutopilotPage() {
  const queryClient = useQueryClient();

  const { data: autopilotData, isLoading } = useQuery({
    queryKey: ["autopilot"],
    queryFn: async () => {
      const res = await fetch("/api/autopilot");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const {
    data: briefingData,
    isLoading: briefingLoading,
    refetch: refetchBriefing,
  } = useQuery({
    queryKey: ["briefing"],
    queryFn: async () => {
      const res = await fetch("/api/briefing");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates) => {
      const res = await fetch("/api/autopilot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["autopilot"] }),
  });

  const regenerateBriefing = async () => {
    await fetch("/api/briefing", { method: "POST" });
    refetchBriefing();
  };

  const settings = autopilotData?.settings;
  const briefing = briefingData?.briefing;

  const toggleSetting = (key) => {
    if (!settings) return;
    updateSettings.mutate({ [key]: !settings[key] });
  };

  const ToggleRow = ({ icon, label, description, settingKey }) => {
    const IconComp = icon;
    const isOn = settings?.[settingKey] || false;
    return (
      <div className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <IconComp size={16} className="text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
        </div>
        <button
          onClick={() => toggleSetting(settingKey)}
          className={`relative w-11 h-6 rounded-full transition-colors ${isOn ? "bg-[#6666f7]" : "bg-gray-200"}`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isOn ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </div>
    );
  };

  return (
    <AppShell activeTab="/dashboard/autopilot">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Autopilot</h1>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Let HousePilot automatically manage scheduling, reminders, and
          suggestions for your household.
        </p>

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
        ) : (
          <div className="space-y-6">
            {/* Master Toggle */}
            <div
              className={`p-4 rounded-xl border-2 transition-colors ${settings?.is_enabled ? "border-[#6666f7] bg-[#ededfe]" : "border-gray-100"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings?.is_enabled ? "bg-[#6666f7]" : "bg-gray-200"}`}
                  >
                    <Zap
                      size={20}
                      className={
                        settings?.is_enabled ? "text-white" : "text-gray-500"
                      }
                    />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      Autopilot Mode
                    </p>
                    <p className="text-xs text-gray-500">
                      {settings?.is_enabled
                        ? "Active — HousePilot is managing your household"
                        : "Off — Enable to let AI help run your home"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSetting("is_enabled")}
                  className={`relative w-14 h-7 rounded-full transition-colors ${settings?.is_enabled ? "bg-[#6666f7]" : "bg-gray-200"}`}
                >
                  <div
                    className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${settings?.is_enabled ? "left-[30px]" : "left-0.5"}`}
                  />
                </button>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="border border-gray-100 rounded-xl divide-y divide-gray-50">
              <ToggleRow
                icon={CheckSquare}
                label="Auto-schedule chores"
                description="Suggest optimal times for recurring tasks"
                settingKey="auto_schedule_chores"
              />
              <ToggleRow
                icon={ShoppingCart}
                label="Grocery reminders"
                description="Alert when supplies are running low"
                settingKey="auto_grocery_reminders"
              />
              <ToggleRow
                icon={Wrench}
                label="Maintenance reminders"
                description="Track and remind about home maintenance"
                settingKey="auto_maintenance_reminders"
              />
              <ToggleRow
                icon={ChefHat}
                label="Meal suggestions"
                description="Suggest weekly meal plans"
                settingKey="auto_meal_suggestions"
              />
            </div>

            {/* Day Preferences */}
            <div className="border border-gray-100 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-900">
                Preferred Days
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Chore day
                  </label>
                  <select
                    value={settings?.preferred_chore_day || "Saturday"}
                    onChange={(e) =>
                      updateSettings.mutate({
                        preferred_chore_day: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Grocery day
                  </label>
                  <select
                    value={settings?.preferred_grocery_day || "Sunday"}
                    onChange={(e) =>
                      updateSettings.mutate({
                        preferred_grocery_day: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Weekly Briefing */}
            <div className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles size={14} className="text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900">
                    Weekly Briefing
                  </h3>
                </div>
                <button
                  onClick={regenerateBriefing}
                  className="text-gray-300 hover:text-gray-500 transition-colors"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
              {briefingLoading ? (
                <p className="text-xs text-gray-400">Generating briefing...</p>
              ) : briefing ? (
                <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {briefing.briefing_text}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Your weekly briefing will appear here.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
