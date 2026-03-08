"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import AppShell from "../../../components/AppShell";
import AIInsights from "../../../components/AIInsights";

const SUPPLY_CATEGORIES = [
  "cleaning",
  "bathroom",
  "kitchen",
  "pet",
  "laundry",
  "paper goods",
  "personal care",
  "general",
];

export default function SuppliesPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newQuantity, setNewQuantity] = useState(100);
  const [newRestock, setNewRestock] = useState("");

  const { data: suppliesData, isLoading } = useQuery({
    queryKey: ["supplies"],
    queryFn: async () => {
      const res = await fetch("/api/supplies");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addSupply = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: newName,
          category: newCategory,
          quantity_remaining: newQuantity,
          avg_days_to_restock: newRestock ? parseInt(newRestock) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      setNewName("");
      setNewQuantity(100);
      setNewRestock("");
      setShowAdd(false);
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ id, quantity_remaining }) => {
      const res = await fetch("/api/supplies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quantity_remaining }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplies"] }),
  });

  const restockSupply = useMutation({
    mutationFn: async (id) => {
      const res = await fetch("/api/supplies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          quantity_remaining: 100,
          last_restocked: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplies"] }),
  });

  const deleteSupply = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/supplies?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplies"] }),
  });

  const supplies = suppliesData?.supplies || [];
  const lowSupplies = supplies.filter((s) => s.quantity_remaining < 30);
  const grouped = {};
  for (const s of supplies) {
    const cat = s.category || "general";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  const getStatusColor = (qty) => {
    if (qty < 15) return "bg-red-100 text-red-700";
    if (qty < 30) return "bg-yellow-100 text-yellow-700";
    return "bg-green-50 text-green-700";
  };

  return (
    <AppShell activeTab="/dashboard/supplies">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Supplies</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center space-x-1 px-3 py-2 bg-[#77ad33] text-white rounded-lg text-sm font-medium hover:bg-[#5a8a22] transition-colors"
          >
            <Plus size={16} />
            <span>Track Item</span>
          </button>
        </div>

        {/* Low supply alert */}
        {lowSupplies.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-xl flex items-start space-x-2">
            <AlertTriangle
              size={16}
              className="text-yellow-500 mt-0.5 flex-shrink-0"
            />
            <div>
              <p className="text-xs font-medium text-yellow-700">
                {lowSupplies.length}{" "}
                {lowSupplies.length === 1 ? "item" : "items"} running low
              </p>
              <p className="text-xs text-yellow-600">
                {lowSupplies.map((s) => s.item_name).join(", ")}
              </p>
            </div>
          </div>
        )}

        <AIInsights module="supplies" className="mb-4" />

        {showAdd && (
          <div className="mb-6 p-4 border border-gray-200 rounded-xl space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Item name (e.g., Paper towels)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#77ad33]"
              autoFocus
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#77ad33]"
              >
                {SUPPLY_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
              <div className="flex items-center space-x-2 flex-1">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Stock
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs text-gray-900 w-8">
                  {newQuantity}%
                </span>
              </div>
            </div>
            <input
              type="number"
              value={newRestock}
              onChange={(e) => setNewRestock(e.target.value)}
              placeholder="Days between restocks (optional)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#77ad33]"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-2 text-sm text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => addSupply.mutate()}
                disabled={!newName.trim()}
                className="px-4 py-2 bg-[#77ad33] text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Add Item
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Loading supplies...
          </p>
        ) : supplies.length === 0 ? (
          <div className="text-center py-12">
            <Package size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              Track household supplies to get smart restock reminders.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 capitalize">
                  {cat}
                </h3>
                <div className="space-y-1">
                  {items.map((supply) => {
                    const statusClass = getStatusColor(
                      supply.quantity_remaining,
                    );
                    return (
                      <div
                        key={supply.id}
                        className="group flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-900">
                              {supply.item_name}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusClass}`}
                            >
                              {supply.quantity_remaining}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1 mt-1.5">
                            <div
                              className="bg-[#77ad33] rounded-full h-1 transition-all"
                              style={{ width: `${supply.quantity_remaining}%` }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => restockSupply.mutate(supply.id)}
                          className="text-gray-300 hover:text-gray-900 transition-colors"
                          title="Mark restocked"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => deleteSupply.mutate(supply.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
