"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Pencil,
  X,
  CheckCircle2,
  Circle,
} from "lucide-react";
import AppShell from "../../../components/AppShell";
import AIInsights from "../../../components/AIInsights";

const CALENDAR_TYPES = [
  "family",
  "school",
  "work",
  "activities",
  "appointments",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

function getWeekDays(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(start.getDate() - day);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(start);
    dd.setDate(dd.getDate() + i);
    days.push(dd);
  }
  return days;
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const [viewMode, setViewMode] = useState("month");
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newType, setNewType] = useState("family");
  const [actionMenuId, setActionMenuId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const startDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const endDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${new Date(viewYear, viewMonth + 1, 0).getDate()}`;

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["calendar", viewYear, viewMonth],
    queryFn: async () => {
      const res = await fetch(
        `/api/calendar?start=${startDate}&end=${endDate}`,
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", "active"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?completed=false");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          event_date: selectedDate,
          event_time: newTime || null,
          calendar_type: newType,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      setNewTitle("");
      setNewTime("");
      setShowAdd(false);
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ["calendar", viewYear, viewMonth],
      });
      const prev = queryClient.getQueryData(["calendar", viewYear, viewMonth]);
      queryClient.setQueryData(["calendar", viewYear, viewMonth], (old) => {
        if (!old) return old;
        return { ...old, events: old.events.filter((e) => e.id !== id) };
      });
      setDeleteConfirmId(null);
      return { prev };
    },
    onError: (err, id, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(["calendar", viewYear, viewMonth], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
  });

  const events = eventsData?.events || [];
  const tasks = tasksData?.tasks || [];
  const days = getMonthDays(viewYear, viewMonth);
  const weekDays = getWeekDays(selectedDate);

  const getEventsForDay = (dateStr) =>
    events.filter((e) => {
      const eventDate = e.event_date ? e.event_date.split("T")[0] : "";
      return eventDate === dateStr;
    });
  const getTasksForDay = (dateStr) =>
    tasks.filter((t) => t.due_date && t.due_date.split("T")[0] === dateStr);

  const selectedEvents = getEventsForDay(selectedDate);
  const selectedTasks = getTasksForDay(selectedDate);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else setViewMonth(viewMonth + 1);
  };

  const handleDayClick = (day) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
  };

  const selectedLabel = (() => {
    if (selectedDate === todayStr) return "Today";
    const d = new Date(selectedDate + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  })();

  return (
    <AppShell activeTab="/dashboard/calendar">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center space-x-1 px-3 py-2 bg-[#6666f7] text-white rounded-xl text-sm font-medium hover:bg-[#4d4dc7] transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Add Event</span>
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-1 mb-4 bg-gray-50 p-1 rounded-xl">
          {[
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
          ].map((m) => (
            <button
              key={m.value}
              onClick={() => setViewMode(m.value)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === m.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 text-gray-400 hover:text-gray-900"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-base font-medium text-gray-900">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 text-gray-400 hover:text-gray-900"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <AIInsights module="calendar" className="mb-4" />

        {viewMode === "month" ? (
          /* Month Grid */
          <div className="border border-gray-100 rounded-xl overflow-hidden mb-6">
            <div className="grid grid-cols-7 border-b border-gray-100">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-xs font-medium text-gray-400"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                if (!day)
                  return (
                    <div
                      key={`empty-${i}`}
                      className="h-16 border-b border-r border-gray-50"
                    />
                  );
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = getEventsForDay(dateStr);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`h-16 border-b border-r border-gray-50 p-1 text-left hover:bg-gray-50 transition-colors ${isSelected ? "bg-[#ededfe]" : ""}`}
                  >
                    <span
                      className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? "bg-[#6666f7] text-white" : "text-gray-600"}`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="mt-0.5">
                        {dayEvents.slice(0, 2).map((e) => (
                          <div
                            key={e.id}
                            className="text-[10px] text-gray-500 truncate leading-tight"
                          >
                            {e.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-gray-400">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Week View */
          <div className="mb-6">
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((d) => {
                const dateStr = d.toISOString().split("T")[0];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const dayEvents = getEventsForDay(dateStr);
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className="flex flex-col items-center py-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-xs text-gray-400 font-medium mb-1">
                      {
                        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                          d.getDay()
                        ]
                      }
                    </span>
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${isSelected ? "bg-[#6666f7] text-white" : isToday ? "bg-[#ededfe] text-[#4d4dc7]" : "text-gray-600"}`}
                    >
                      {d.getDate()}
                    </span>
                    {dayEvents.length > 0 && !isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6666f7] mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Day Section */}
        <div className="border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              {selectedLabel}
            </h3>
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs text-gray-400 hover:text-[#6666f7] font-medium"
            >
              + Add event
            </button>
          </div>

          {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
            <div className="text-center py-6">
              <Calendar size={24} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nothing scheduled</p>
            </div>
          ) : (
            <div className="space-y-1">
              {selectedEvents.map((event) => (
                <div
                  key={event.id}
                  className="relative flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-[#6666f7] flex-shrink-0" />
                    <div>
                      <span className="text-sm text-gray-900">
                        {event.title}
                      </span>
                      {event.event_time && (
                        <span className="text-xs text-gray-400 ml-2">
                          {event.event_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() =>
                        setActionMenuId(
                          actionMenuId === event.id ? null : event.id,
                        )
                      }
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    {actionMenuId === event.id && (
                      <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-32">
                        <button
                          onClick={() => {
                            setActionMenuId(null);
                            setDeleteConfirmId(event.id);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {selectedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gray-50"
                >
                  {task.is_completed ? (
                    <CheckCircle2
                      size={16}
                      className="text-[#6666f7] flex-shrink-0"
                    />
                  ) : (
                    <Circle size={16} className="text-gray-300 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${task.is_completed ? "text-gray-400 line-through" : "text-gray-900"}`}
                  >
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Event Modal */}
        {showAdd && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowAdd(false)}
          >
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  New Event
                </h3>
                <button
                  onClick={() => setShowAdd(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-gray-400">{selectedLabel}</p>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Event title"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
                autoFocus
              />
              <div className="flex space-x-3">
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 capitalize focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
                >
                  {CALENDAR_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addEvent.mutate()}
                  disabled={!newTitle.trim()}
                  className="flex-1 py-2.5 bg-[#6666f7] text-white rounded-xl text-sm font-medium hover:bg-[#4d4dc7] disabled:opacity-50"
                >
                  Add Event
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
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
                Delete this event?
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
                  onClick={() => deleteEvent.mutate(deleteConfirmId)}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
