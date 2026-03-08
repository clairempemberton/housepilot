"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Trash2, User, PawPrint, Baby } from "lucide-react";
import AppShell from "../../../components/AppShell";
import AIInsights from "../../../components/AIInsights";

export default function HouseholdPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("adult");
  const [newAge, setNewAge] = useState("");

  const { data: householdData, isLoading } = useQuery({
    queryKey: ["household"],
    queryFn: async () => {
      const res = await fetch("/api/household");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_name: newName,
          member_type: newType,
          age: newAge ? parseInt(newAge) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household"] });
      setNewName("");
      setNewAge("");
      setShowAdd(false);
    },
  });

  const deleteMember = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/members?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["household"] }),
  });

  const household = householdData?.household;
  const members = householdData?.members || [];

  const getMemberIcon = (type) => {
    if (type === "pet") return PawPrint;
    if (type === "child") return Baby;
    return User;
  };

  return (
    <AppShell activeTab="/dashboard/household">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Household</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center space-x-1 px-3 py-2 bg-[#6666f7] text-white rounded-lg text-sm font-medium hover:bg-[#4d4dc7]"
          >
            <Plus size={16} />
            <span>Add Member</span>
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
        ) : (
          <div className="space-y-6">
            {household && (
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <h2 className="text-base font-medium text-gray-900">
                  {household.household_name}
                </h2>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>{household.people_count} people</span>
                  {household.has_pets && <span>Has pets</span>}
                  {household.grocery_frequency && (
                    <span>Groceries: {household.grocery_frequency}</span>
                  )}
                </div>
                {household.pain_points && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {household.pain_points.split(", ").map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 bg-white rounded text-xs text-gray-500 border border-gray-100"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Suggestions */}
            <AIInsights module="household" />

            {showAdd && (
              <div className="p-4 border border-gray-200 rounded-xl space-y-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
                  autoFocus
                />
                <div className="flex space-x-3">
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
                  >
                    <option value="adult">Adult</option>
                    <option value="child">Child</option>
                    <option value="pet">Pet</option>
                  </select>
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="Age"
                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
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
                    onClick={() => addMember.mutate()}
                    disabled={!newName.trim()}
                    className="px-4 py-2 bg-[#6666f7] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Members
              </h3>
              {members.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No members added yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => {
                    const MemberIcon = getMemberIcon(member.member_type);
                    return (
                      <div
                        key={member.id}
                        className="group flex items-center justify-between px-4 py-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <MemberIcon size={16} className="text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {member.member_name}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">
                              {member.member_type}
                              {member.age ? `, age ${member.age}` : ""}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteMember.mutate(member.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
