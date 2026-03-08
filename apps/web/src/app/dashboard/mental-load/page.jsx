"use client";

import { useQuery } from "@tanstack/react-query";
import { Brain, Users, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import AppShell from "../../../components/AppShell";
import AIInsights from "../../../components/AIInsights";

export default function MentalLoadPage() {
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

  // Find the person with the highest load
  const assignedMembers = mentalLoad.filter(
    (m) => m.memberType !== "system" && m.tasksAssigned > 0,
  );
  const maxLoadMember =
    assignedMembers.length > 0
      ? assignedMembers.reduce((a, b) =>
          a.loadPercentage > b.loadPercentage ? a : b,
        )
      : null;

  // Friction related to mental load
  const loadFriction = frictionPoints.filter(
    (f) =>
      f.type === "mental_load_imbalance" || f.type === "postponed_category",
  );

  // Categories most often postponed
  const postponedCats = categoryRates
    .filter((c) => c.postponed > 0)
    .sort((a, b) => b.postponed - a.postponed);

  return (
    <AppShell activeTab="/dashboard/mental-load">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold text-gray-900">Mental Load</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Understand who carries the planning, scheduling, and execution load in
          your household.
        </p>

        <AIInsights module="mental_load" className="mb-6" />

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-12">
            Analyzing household patterns...
          </p>
        ) : !memory ? (
          <div className="text-center py-12">
            <Brain size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              Complete some tasks and assign members to see mental load
              analysis.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Imbalance alert */}
            {loadFriction.length > 0 && (
              <div className="space-y-2">
                {loadFriction.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start space-x-3 px-3 py-2.5 bg-yellow-50 rounded-xl"
                  >
                    <AlertTriangle
                      size={14}
                      className="text-yellow-500 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-xs font-medium text-yellow-700">
                        {f.message}
                      </p>
                      <p className="text-xs text-yellow-600">{f.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load Distribution */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                Task Distribution
              </h3>
              {mentalLoad.length === 0 ? (
                <p className="text-xs text-gray-400">
                  No tasks assigned to members yet. Assign tasks to see
                  distribution.
                </p>
              ) : (
                <div className="space-y-3">
                  {mentalLoad.map((member) => {
                    const isHighest =
                      maxLoadMember &&
                      member.memberId === maxLoadMember.memberId &&
                      assignedMembers.length >= 2;
                    return (
                      <div key={member.memberId || "unassigned"}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${member.memberType === "system" ? "bg-gray-200 text-gray-500" : "bg-[#6666f7] text-white"}`}
                            >
                              {member.memberName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-900">
                              {member.memberName}
                            </span>
                            {isHighest && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                                Highest
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {member.loadPercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className={`rounded-full h-2 transition-all ${isHighest ? "bg-yellow-500" : "bg-[#6666f7]"}`}
                            style={{ width: `${member.loadPercentage}%` }}
                          />
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-[10px] text-gray-400">
                            {member.tasksAssigned} assigned ·{" "}
                            {member.tasksCompleted} completed
                          </span>
                          {member.topCategories.length > 0 && (
                            <span className="text-[10px] text-gray-400">
                              Top:{" "}
                              {member.topCategories
                                .map((c) => c.name)
                                .join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Productivity Patterns */}
            {patterns && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Household Rhythm
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Most productive day</p>
                    <p className="text-sm font-medium text-gray-900">
                      {patterns.mostProductiveDay || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">
                      Least productive day
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {patterns.leastProductiveDay || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Peak activity time</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {patterns.peakTimeBucket || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total completions</p>
                    <p className="text-sm font-medium text-gray-900">
                      {patterns.totalCompletions}
                    </p>
                  </div>
                </div>

                {/* Weekly rhythm bars */}
                {patterns.completionsByDay && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 mb-2">Weekly rhythm</p>
                    <div className="flex items-end justify-between space-x-1.5 h-16">
                      {patterns.completionsByDay.map((d) => {
                        const max = Math.max(
                          ...patterns.completionsByDay.map((x) => x.count),
                          1,
                        );
                        const pct = (d.count / max) * 100;
                        return (
                          <div
                            key={d.day}
                            className="flex-1 flex flex-col items-center"
                          >
                            <div
                              className="w-full flex items-end justify-center"
                              style={{ height: "48px" }}
                            >
                              <div
                                className="w-full max-w-[20px] rounded-t transition-all"
                                style={{
                                  height: `${Math.max(pct, 4)}%`,
                                  backgroundColor:
                                    d.count > 0 ? "#6666f7" : "#d1d5db",
                                }}
                              />
                            </div>
                            <span className="text-[9px] text-gray-400 mt-1">
                              {d.day.slice(0, 3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Friction Points */}
            {postponedCats.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Friction Areas
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  Categories where tasks are most often postponed or forgotten.
                </p>
                <div className="space-y-2">
                  {postponedCats.map((cat) => {
                    const completionPct =
                      cat.total > 0
                        ? Math.round((cat.completed / cat.total) * 100)
                        : 0;
                    return (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100"
                      >
                        <div>
                          <span className="text-sm text-gray-900 capitalize">
                            {cat.name}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {cat.total} tasks · {completionPct}% done
                          </span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                          {cat.postponed} overdue
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Schedule Pressure */}
            {memory.scheduleAnalysis?.overloadedDays?.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Schedule Pressure
                </h3>
                <div className="space-y-2">
                  {memory.scheduleAnalysis.overloadedDays.map((od) => (
                    <div
                      key={od.date}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100"
                    >
                      <div>
                        <span className="text-sm text-gray-900">
                          {od.dayName}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {od.date}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600">
                        {od.eventCount} events
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
