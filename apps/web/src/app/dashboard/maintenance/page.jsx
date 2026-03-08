"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Wrench,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import AppShell from "../../../components/AppShell";
import AIInsights from "../../../components/AIInsights";

const MAINT_CATEGORIES = [
  "hvac",
  "plumbing",
  "electrical",
  "exterior",
  "interior",
  "safety",
  "appliances",
  "general",
];

function formatDate(dateStr) {
  if (!dateStr) return "Not set";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = (new Date(dateStr) - new Date()) / 86400000;
  return Math.ceil(diff);
}

export default function MaintenancePage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newFreq, setNewFreq] = useState(3);
  const [newCategory, setNewCategory] = useState("general");
  const [newLastDone, setNewLastDone] = useState("");

  const { data: maintData, isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const res = await fetch("/api/maintenance");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addTask = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          frequency_months: newFreq,
          last_completed: newLastDone || null,
          category: newCategory,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setNewTitle("");
      setNewDesc("");
      setNewFreq(3);
      setNewLastDone("");
      setShowAdd(false);
    },
  });

  const markDone = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, mark_done: true }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/maintenance?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  const tasks = maintData?.tasks || [];
  const overdue = tasks.filter(
    (t) => t.next_due && getDaysUntil(t.next_due) < 0,
  );
  const upcoming = tasks.filter(
    (t) =>
      t.next_due &&
      getDaysUntil(t.next_due) >= 0 &&
      getDaysUntil(t.next_due) <= 30,
  );
  const later = tasks.filter(
    (t) => !t.next_due || getDaysUntil(t.next_due) > 30,
  );

  const getStatusBadge = (task) => {
    const daysLeft = getDaysUntil(task.next_due);
    if (daysLeft === null)
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
          No schedule
        </span>
      );
    if (daysLeft < 0)
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
          Overdue
        </span>
      );
    if (daysLeft <= 7)
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
          Due soon
        </span>
      );
    if (daysLeft <= 30)
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
          Upcoming
        </span>
      );
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">
        On track
      </span>
    );
  };

  const renderSection = (title, taskList, icon) => {
    if (taskList.length === 0) return null;
    const IconComp = icon;
    return (
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <IconComp size={14} className="text-gray-400" />
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            {title} ({taskList.length})
          </h3>
        </div>
        <div className="space-y-1">
          {taskList.map((task) => (
            <div
              key={task.id}
              className="group flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <button
                onClick={() => markDone.mutate(task.id)}
                className="flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors"
              >
                <CheckCircle2 size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900">{task.title}</span>
                  {getStatusBadge(task)}
                </div>
                <div className="flex items-center space-x-3 mt-0.5">
                  <span className="text-xs text-gray-400 capitalize">
                    {task.category}
                  </span>
                  <span className="text-xs text-gray-400">
                    Every {task.frequency_months} months
                  </span>
                  {task.last_completed && (
                    <span className="text-xs text-gray-400">
                      Last: {formatDate(task.last_completed)}
                    </span>
                  )}
                </div>
              </div>
              {task.next_due && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatDate(task.next_due)}
                </span>
              )}
              <button
                onClick={() => deleteTask.mutate(task.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AppShell activeTab="/dashboard/maintenance">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Maintenance</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center space-x-1 px-3 py-2 bg-[#6666f7] text-white rounded-lg text-sm font-medium hover:bg-[#4d4dc7] transition-colors"
          >
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </div>

        <AIInsights module="household" className="mb-4" />

        {showAdd && (
          <div className="mb-6 p-4 border border-gray-200 rounded-xl space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title (e.g., Replace air filter)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
              autoFocus
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
              >
                {MAINT_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={newFreq}
                onChange={(e) => setNewFreq(parseInt(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
              >
                <option value={1}>Monthly</option>
                <option value={3}>Every 3 months</option>
                <option value={6}>Every 6 months</option>
                <option value={12}>Yearly</option>
              </select>
              <input
                type="date"
                value={newLastDone}
                onChange={(e) => setNewLastDone(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-2 text-sm text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => addTask.mutate()}
                disabled={!newTitle.trim()}
                className="px-4 py-2 bg-[#6666f7] text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Add Task
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <Wrench size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              Track home maintenance tasks to never miss a schedule.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {renderSection("Overdue", overdue, AlertCircle)}
            {renderSection("Due Soon", upcoming, Clock)}
            {renderSection("Scheduled", later, Wrench)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
