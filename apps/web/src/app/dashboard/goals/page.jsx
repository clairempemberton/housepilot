"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, Trash2, TrendingUp } from "lucide-react";
import AppShell from "../../../components/AppShell";
import AIInsights from "../../../components/AIInsights";

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newFrequency, setNewFrequency] = useState("");

  const { data: goalsData, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addGoal = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          frequency_target: newFrequency,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setNewTitle("");
      setNewDescription("");
      setNewFrequency("");
      setShowAdd(false);
    },
  });

  const incrementStreak = useMutation({
    mutationFn: async (goal) => {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: goal.id,
          current_streak: (goal.current_streak || 0) + 1,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });

  const goals = goalsData?.goals || [];

  return (
    <AppShell activeTab="/dashboard/goals">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Goals</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center space-x-1 px-3 py-2 bg-[#6666f7] text-white rounded-lg text-sm font-medium hover:bg-[#4d4dc7]"
          >
            <Plus size={16} />
            <span>Add Goal</span>
          </button>
        </div>

        {showAdd && (
          <div className="mb-6 p-4 border border-gray-200 rounded-xl space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Goal title (e.g., Exercise 3x per week)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
              autoFocus
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
            />
            <input
              type="text"
              value={newFrequency}
              onChange={(e) => setNewFrequency(e.target.value)}
              placeholder="Frequency target (e.g., 3x per week)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-2 text-sm text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => addGoal.mutate()}
                disabled={!newTitle.trim()}
                className="px-4 py-2 bg-[#6666f7] text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Add Goal
              </button>
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        <AIInsights module="goals" className="mb-4" />

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Loading goals...
          </p>
        ) : goals.length === 0 ? (
          <div className="text-center py-12">
            <Target size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              Set goals for your family to work towards.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="group border border-gray-100 rounded-xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {goal.title}
                    </h3>
                    {goal.description && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {goal.description}
                      </p>
                    )}
                    {goal.frequency_target && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Target: {goal.frequency_target}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteGoal.mutate(goal.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <div className="flex items-center space-x-2">
                    <TrendingUp size={14} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {goal.current_streak || 0}
                    </span>
                    <span className="text-xs text-gray-400">streak</span>
                  </div>
                  <button
                    onClick={() => incrementStreak.mutate(goal)}
                    className="px-3 py-1 text-xs font-medium bg-[#ededfe] text-[#4d4dc7] rounded-md hover:bg-[#dcdcfd] transition-colors"
                  >
                    +1 Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
