"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle2, Circle, Pencil, X } from "lucide-react";
import AppShell from "../../../components/AppShell";
import AIInsights from "../../../components/AIInsights";

const CATEGORIES = [
  "chores",
  "errands",
  "cooking",
  "kids",
  "pets",
  "maintenance",
  "health",
  "other",
];
const PRIORITIES = [
  {
    value: "urgent",
    label: "Urgent",
    color: "bg-red-500",
    textColor: "text-red-600",
    bgLight: "bg-red-50",
  },
  {
    value: "high",
    label: "High",
    color: "bg-orange-400",
    textColor: "text-orange-600",
    bgLight: "bg-orange-50",
  },
  {
    value: "medium",
    label: "Medium",
    color: "bg-gray-400",
    textColor: "text-gray-500",
    bgLight: "bg-gray-50",
  },
  {
    value: "low",
    label: "Low",
    color: "bg-gray-300",
    textColor: "text-gray-400",
    bgLight: "bg-gray-50",
  },
];

function getPriorityInfo(p) {
  return PRIORITIES.find((pr) => pr.value === p) || PRIORITIES[2];
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("active");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [actionMenuId, setActionMenuId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks", filter],
    queryFn: async () => {
      const params =
        filter === "active"
          ? "?completed=false"
          : filter === "completed"
            ? "?completed=true"
            : "";
      const res = await fetch(`/api/tasks${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: membersData } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addTask = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory || null,
          frequency: "once",
          due_date: newDueDate || null,
          priority: newPriority,
          assigned_to: newAssignedTo ? parseInt(newAssignedTo) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setNewTitle("");
      setNewCategory("");
      setNewDueDate("");
      setNewPriority("medium");
      setNewAssignedTo("");
      setShowAdd(false);
    },
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
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", filter] });
      const prev = queryClient.getQueryData(["tasks", filter]);
      queryClient.setQueryData(["tasks", filter], (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === task.id ? { ...t, is_completed: !t.is_completed } : t,
          ),
        };
      });
      return { prev };
    },
    onError: (err, task, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["tasks", filter], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const updateTask = useMutation({
    mutationFn: async (updates) => {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTask(null);
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", filter] });
      const prev = queryClient.getQueryData(["tasks", filter]);
      queryClient.setQueryData(["tasks", filter], (old) => {
        if (!old) return old;
        return { ...old, tasks: old.tasks.filter((t) => t.id !== id) };
      });
      return { prev };
    },
    onError: (err, id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["tasks", filter], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDeleteConfirmId(null);
    },
  });

  const openEdit = (task) => {
    setActionMenuId(null);
    setEditingTask(task);
    setEditTitle(task.title);
    setEditPriority(task.priority || "medium");
    setEditDueDate(task.due_date ? task.due_date.split("T")[0] : "");
  };

  const tasks = tasksData?.tasks || [];
  const members = membersData?.members || [];
  const groupedTasks = {};
  for (const t of tasks) {
    const p = t.priority || "medium";
    if (!groupedTasks[p]) groupedTasks[p] = [];
    groupedTasks[p].push(t);
  }
  const priorityOrder = ["urgent", "high", "medium", "low"];
  const hasMultiplePriorities = Object.keys(groupedTasks).length > 1;

  return (
    <AppShell activeTab="/dashboard/tasks">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center space-x-1 px-3 py-2 bg-[#77ad33] text-white rounded-xl text-sm font-medium hover:bg-[#5a8a22] transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>

        {showAdd && (
          <div className="mb-6 p-4 border border-gray-200 rounded-xl space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#77ad33]"
              autoFocus
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#77ad33]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} Priority
                  </option>
                ))}
              </select>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#77ad33]"
              >
                <option value="">Category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={newAssignedTo}
                onChange={(e) => setNewAssignedTo(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#77ad33]"
              >
                <option value="">Assign to...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.member_name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#77ad33]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => addTask.mutate()}
                disabled={!newTitle.trim() || addTask.isPending}
                className="px-4 py-2 bg-[#77ad33] text-white rounded-xl text-sm font-medium hover:bg-[#5a8a22] disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {addTask.isPending ? "Adding..." : "Add Task"}
              </button>
            </div>
          </div>
        )}

        <div className="flex space-x-1 mb-4 bg-gray-50 p-1 rounded-xl">
          {[
            { value: "active", label: "Active" },
            { value: "completed", label: "Done" },
            { value: "all", label: "All" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <AIInsights module="tasks" className="mb-4" />

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Loading tasks...
          </p>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {filter === "active"
                ? "All caught up! No active tasks."
                : "No tasks found."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {priorityOrder.map((priority) => {
              const group = groupedTasks[priority];
              if (!group || group.length === 0) return null;
              const pInfo = getPriorityInfo(priority);
              return (
                <div key={priority}>
                  {hasMultiplePriorities && (
                    <div className="flex items-center space-x-2 mb-2 px-1">
                      <div className={`w-2 h-2 rounded-full ${pInfo.color}`} />
                      <span
                        className={`text-xs font-medium uppercase tracking-wide ${pInfo.textColor}`}
                      >
                        {pInfo.label}
                      </span>
                      <span className="text-xs text-gray-300">
                        {group.length}
                      </span>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {group.map((task) => {
                      const isOverdue =
                        !task.is_completed &&
                        task.due_date &&
                        new Date(task.due_date) < new Date();
                      return (
                        <div
                          key={task.id}
                          className="relative flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all"
                        >
                          <button
                            onClick={() => toggleTask.mutate(task)}
                            className="flex-shrink-0"
                          >
                            {task.is_completed ? (
                              <CheckCircle2
                                size={18}
                                className="text-green-500"
                              />
                            ) : (
                              <Circle
                                size={18}
                                className={
                                  isOverdue ? "text-red-300" : "text-gray-300"
                                }
                              />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-sm ${task.is_completed ? "text-gray-400 line-through" : "text-gray-900"}`}
                            >
                              {task.title}
                            </span>
                            <div className="flex items-center space-x-2 mt-0.5 flex-wrap">
                              {task.category && (
                                <span className="text-xs text-gray-400 capitalize">
                                  {task.category}
                                </span>
                              )}
                              {task.assigned_name && (
                                <span className="text-xs text-gray-500 flex items-center space-x-1">
                                  <span>·</span>
                                  <span className="inline-flex items-center space-x-1">
                                    <span className="w-3.5 h-3.5 bg-[#77ad33] rounded-full text-white text-[8px] flex items-center justify-center font-medium">
                                      {task.assigned_name.charAt(0)}
                                    </span>
                                    <span>{task.assigned_name}</span>
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                          {task.due_date && (
                            <span
                              className={`text-xs flex-shrink-0 ${isOverdue ? "text-red-400" : "text-gray-400"}`}
                            >
                              {new Date(task.due_date).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          )}
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={() =>
                                setActionMenuId(
                                  actionMenuId === task.id ? null : task.id,
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            {actionMenuId === task.id && (
                              <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-32">
                                <button
                                  onClick={() => openEdit(task)}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setActionMenuId(null);
                                    setDeleteConfirmId(task.id);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setEditingTask(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Task</h3>
              <button
                onClick={() => setEditingTask(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#77ad33]"
            />
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setEditPriority(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${editPriority === p.value ? "bg-[#77ad33] text-white border-[#77ad33]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#77ad33]"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  updateTask.mutate({
                    id: editingTask.id,
                    title: editTitle,
                    priority: editPriority,
                    due_date: editDueDate || null,
                  })
                }
                disabled={!editTitle.trim()}
                className="flex-1 py-2.5 bg-[#77ad33] text-white rounded-xl text-sm font-medium hover:bg-[#5a8a22] disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Delete this task?
            </h3>
            <p className="text-sm text-gray-500">
              This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTask.mutate(deleteConfirmId)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes taskComplete {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </AppShell>
  );
}
