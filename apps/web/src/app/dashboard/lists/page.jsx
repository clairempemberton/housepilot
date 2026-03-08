"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Check,
  Square,
  Trash2,
  ShoppingCart,
  ListTodo,
  X,
} from "lucide-react";
import AppShell from "../../../components/AppShell";
import AIInsights from "../../../components/AIInsights";

export default function ListsPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("grocery");
  const [newItemText, setNewItemText] = useState({});

  const { data: listsData, isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: async () => {
      const res = await fetch("/api/lists");
      if (!res.ok) throw new Error("Failed to fetch lists");
      return res.json();
    },
  });

  const addList = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, list_type: newType }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      setNewTitle("");
      setShowAdd(false);
    },
  });

  const addItem = useMutation({
    mutationFn: async ({ listId, title }) => {
      const res = await fetch("/api/lists/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: listId, title }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lists"] }),
  });

  const toggleItem = useMutation({
    mutationFn: async (item) => {
      const res = await fetch("/api/lists/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_checked: !item.is_checked }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lists"] }),
  });

  const deleteList = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/lists?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lists"] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/lists/items?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lists"] }),
  });

  const handleAddItem = useCallback(
    (listId) => {
      const text = newItemText[listId];
      if (!text?.trim()) return;
      addItem.mutate({ listId, title: text.trim() });
      setNewItemText((prev) => ({ ...prev, [listId]: "" }));
    },
    [newItemText, addItem],
  );

  const lists = listsData?.lists || [];

  return (
    <AppShell activeTab="/dashboard/lists">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Lists</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center space-x-1 px-3 py-2 bg-[#6666f7] text-white rounded-lg text-sm font-medium hover:bg-[#4d4dc7] transition-colors"
          >
            <Plus size={16} />
            <span>New List</span>
          </button>
        </div>

        {showAdd && (
          <div className="mb-6 p-4 border border-gray-200 rounded-xl space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="List name"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
              autoFocus
            />
            <div className="flex space-x-2">
              {["grocery", "todo", "custom"].map((t) => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-colors ${
                    newType === t
                      ? "bg-[#6666f7] text-white border-[#6666f7]"
                      : "border-gray-200 text-gray-500"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-2 text-sm text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => addList.mutate()}
                disabled={!newTitle.trim()}
                className="px-4 py-2 bg-[#6666f7] text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Create List
              </button>
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        <AIInsights module="lists" className="mb-4" />

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Loading lists...
          </p>
        ) : lists.length === 0 ? (
          <div className="text-center py-12">
            <ListTodo size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              No lists yet. Create one to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {lists.map((list) => {
              const checkedCount =
                list.items?.filter((i) => i.is_checked).length || 0;
              const totalCount = list.items?.length || 0;
              return (
                <div
                  key={list.id}
                  className="border border-gray-100 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                    <div className="flex items-center space-x-2">
                      {list.list_type === "grocery" ? (
                        <ShoppingCart size={16} className="text-gray-400" />
                      ) : (
                        <ListTodo size={16} className="text-gray-400" />
                      )}
                      <h3 className="text-sm font-medium text-gray-900">
                        {list.title}
                      </h3>
                      {totalCount > 0 && (
                        <span className="text-xs text-gray-400">
                          {checkedCount}/{totalCount}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteList.mutate(list.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="px-4 py-2">
                    {list.items?.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center space-x-3 py-1.5"
                      >
                        <button
                          onClick={() => toggleItem.mutate(item)}
                          className="flex-shrink-0"
                        >
                          {item.is_checked ? (
                            <Check size={16} className="text-green-500" />
                          ) : (
                            <Square size={16} className="text-gray-300" />
                          )}
                        </button>
                        <span
                          className={`text-sm flex-1 ${item.is_checked ? "text-gray-400 line-through" : "text-gray-900"}`}
                        >
                          {item.title}
                        </span>
                        <button
                          onClick={() => deleteItem.mutate(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {/* Add item input */}
                    <div className="flex items-center space-x-2 py-2">
                      <input
                        type="text"
                        value={newItemText[list.id] || ""}
                        onChange={(e) =>
                          setNewItemText((prev) => ({
                            ...prev,
                            [list.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddItem(list.id);
                        }}
                        placeholder="Add item..."
                        className="flex-1 px-2 py-1 text-sm text-gray-900 placeholder-gray-300 focus:outline-none"
                      />
                      <button
                        onClick={() => handleAddItem(list.id)}
                        className="text-gray-300 hover:text-[#6666f7]"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
