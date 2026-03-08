"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Flame,
  CheckCircle2,
  Clock,
  AlertCircle,
  Target,
  Sparkles,
  RefreshCw,
  Brain,
  ArrowRight,
} from "lucide-react";
import AppShell from "../../../components/AppShell";
import AIInsights from "../../../components/AIInsights";

export default function ProgressPage() {
  const [period, setPeriod] = useState("week");

  const { data: progressData, isLoading } = useQuery({
    queryKey: ["progress", period],
    queryFn: async () => {
      const res = await fetch(`/api/progress?period=${period}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: memoryData } = useQuery({
    queryKey: ["ai-memory"],
    queryFn: async () => {
      const res = await fetch("/api/ai/memory");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const {
    data: insightsData,
    isLoading: insightsLoading,
    refetch: refetchInsights,
    isFetching,
  } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const res = await fetch("/api/ai/insights");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  const refreshInsights = async () => {
    await fetch("/api/ai/insights", { method: "POST" });
    refetchInsights();
  };

  const progress = progressData?.progress;
  const memory = memoryData?.memory;
  const allInsights = insightsData?.insights || {};

  const reflectionItems = [];
  for (const [mod, items] of Object.entries(allInsights)) {
    if (Array.isArray(items)) {
      for (const item of items) {
        const text = typeof item === "string" ? item : item?.text;
        if (text) reflectionItems.push(text);
      }
    }
  }

  const maxBarCount = progress?.dayBreakdown
    ? Math.max(...progress.dayBreakdown.map((d) => d.count), 1)
    : 1;

  const frictionPoints = memory?.frictionPoints || [];
  const categoryRates = memory?.categoryRates || [];
  const patterns = memory?.patterns;
  const supplyPredictions = memory?.supplyPredictions || [];
  const maintenanceAlerts = memory?.maintenanceAlerts || [];

  return (
    <AppShell activeTab="/dashboard/progress">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Progress</h1>
        </div>

        {/* Period Selector */}
        <div className="flex space-x-1 mb-6 bg-gray-50 p-1 rounded-lg">
          {[
            { value: "day", label: "Today" },
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-12">
            Analyzing your progress...
          </p>
        ) : !progress ? (
          <div className="text-center py-12">
            <BarChart3 size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              Complete some tasks to see your progress here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-1 mb-1">
                  <CheckCircle2 size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Completed</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {progress.completedInPeriod}
                </p>
                {progress.trend !== 0 && (
                  <div className="flex items-center space-x-1 mt-1">
                    {progress.trend > 0 ? (
                      <TrendingUp size={12} className="text-green-500" />
                    ) : (
                      <TrendingDown size={12} className="text-red-400" />
                    )}
                    <span
                      className={`text-xs ${progress.trend > 0 ? "text-green-500" : "text-red-400"}`}
                    >
                      {progress.trend > 0 ? "+" : ""}
                      {progress.trend}%
                    </span>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-1 mb-1">
                  <Flame size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Streak</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {progress.currentStreak}
                </p>
                <p className="text-xs text-gray-400 mt-1">days</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-1 mb-1">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Active</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {progress.activeTasks}
                </p>
                <p className="text-xs text-gray-400 mt-1">tasks left</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-1 mb-1">
                  <AlertCircle size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Overdue</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {progress.overdueTasks}
                </p>
                <p className="text-xs text-gray-400 mt-1">need attention</p>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  Completion Rate
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {progress.completionRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#77ad33] rounded-full h-2 transition-all duration-500"
                  style={{ width: `${progress.completionRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {progress.completedTasks} of {progress.totalTasks} total tasks
                completed
              </p>
            </div>

            {/* Household Rhythm */}
            {patterns && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Brain size={14} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    Household Memory
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-xs text-gray-400">Best day</p>
                    <p className="text-sm font-medium text-gray-900">
                      {patterns.mostProductiveDay || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Weakest day</p>
                    <p className="text-sm font-medium text-gray-900">
                      {patterns.leastProductiveDay || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Peak time</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {patterns.peakTimeBucket || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">All-time tasks</p>
                    <p className="text-sm font-medium text-gray-900">
                      {patterns.totalCompletions}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Day of Week Activity */}
            {progress.dayBreakdown && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-900">
                    Activity by Day
                  </span>
                  {progress.bestDay !== "-" && (
                    <span className="text-xs text-gray-400">
                      Best: {progress.bestDay}
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between space-x-2 h-24">
                  {progress.dayBreakdown.map((item) => {
                    const heightPercent =
                      maxBarCount > 0 ? (item.count / maxBarCount) * 100 : 0;
                    return (
                      <div
                        key={item.day}
                        className="flex-1 flex flex-col items-center space-y-1"
                      >
                        <div
                          className="w-full flex items-end justify-center"
                          style={{ height: "80px" }}
                        >
                          <div
                            className="w-full max-w-[28px] rounded-t transition-all duration-300"
                            style={{
                              height: `${Math.max(heightPercent, 4)}%`,
                              backgroundColor:
                                item.count > 0 ? "#77ad33" : "#d1d5db",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {item.day}
                        </span>
                        {item.count > 0 && (
                          <span className="text-[10px] text-gray-500 font-medium">
                            {item.count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {categoryRates.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <span className="text-sm font-medium text-gray-900 block mb-3">
                  By Category
                </span>
                <div className="space-y-2">
                  {categoryRates.map((cat) => {
                    const widthPct =
                      cat.total > 0
                        ? Math.round((cat.completed / cat.total) * 100)
                        : 0;
                    return (
                      <div
                        key={cat.name}
                        className="flex items-center space-x-3"
                      >
                        <span className="text-xs text-gray-500 capitalize w-24 flex-shrink-0">
                          {cat.name}
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-[#77ad33] rounded-full h-1.5"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">
                          {widthPct}%
                        </span>
                        {cat.postponed > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">
                            {cat.postponed} late
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Friction Points */}
            {frictionPoints.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertCircle size={14} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    Friction Detected
                  </span>
                </div>
                <div className="space-y-2">
                  {frictionPoints.map((f, i) => (
                    <div key={i} className="flex items-start space-x-2">
                      <div
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${f.severity === "high" ? "bg-red-400" : "bg-yellow-400"}`}
                      />
                      <div>
                        <p className="text-xs text-gray-700">{f.message}</p>
                        <p className="text-[10px] text-gray-400">
                          {f.suggestion}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goals Progress */}
            {progress.goalsSummary && progress.goalsSummary.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <span className="text-sm font-medium text-gray-900 block mb-3">
                  Goals
                </span>
                <div className="space-y-2">
                  {progress.goalsSummary.map((goal, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs text-gray-600">
                        {goal.title}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Flame size={12} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-900">
                          {goal.streak}
                        </span>
                        {goal.target && (
                          <span className="text-[10px] text-gray-400">
                            / {goal.target}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Reflection */}
            {reflectionItems.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles size={14} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      AI Coaching
                    </span>
                  </div>
                  <button
                    onClick={refreshInsights}
                    disabled={isFetching}
                    className="text-gray-300 hover:text-gray-500 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      size={12}
                      className={isFetching ? "animate-spin" : ""}
                    />
                  </button>
                </div>
                <div className="space-y-2">
                  {reflectionItems.slice(0, 6).map((text, i) => (
                    <div key={i} className="flex items-start space-x-2">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick navigation */}
            <div className="flex space-x-3">
              <a
                href="/dashboard/mental-load"
                className="flex items-center space-x-2 px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors flex-1"
              >
                <Brain size={16} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-900">
                  Mental Load Analysis
                </span>
                <ArrowRight size={12} className="text-gray-300 ml-auto" />
              </a>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
