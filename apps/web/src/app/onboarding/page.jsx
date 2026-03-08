"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  Home,
  ArrowRight,
  ArrowLeft,
  Users,
  ChefHat,
  ShoppingCart,
  AlertCircle,
  Target,
  Plus,
  X,
} from "lucide-react";
import useUser from "@/utils/useUser";

const PAIN_POINT_OPTIONS = [
  "Groceries",
  "Schedules",
  "Chores",
  "Kids activities",
  "Appointments",
  "Finances",
  "Home maintenance",
  "Meal planning",
];

const GOAL_OPTIONS = [
  "Cleaner home",
  "Healthier meals",
  "Less stress",
  "More family time",
  "Better routines",
  "Save money",
];

export default function OnboardingPage() {
  const { data: user, loading: userLoading } = useUser();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: Household basics
  const [householdName, setHouseholdName] = useState("");
  const [peopleCount, setPeopleCount] = useState(2);
  const [childrenAges, setChildrenAges] = useState("");
  const [hasPets, setHasPets] = useState(false);
  const [petDetails, setPetDetails] = useState("");

  // Step 2: Members
  const [members, setMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberType, setNewMemberType] = useState("adult");
  const [newMemberAge, setNewMemberAge] = useState("");

  // Step 3: Lifestyle
  const [cooksMeals, setCooksMeals] = useState(true);
  const [groceryFrequency, setGroceryFrequency] = useState("weekly");
  const [outsourceCleaning, setOutsourceCleaning] = useState(false);

  // Step 4: Pain points & goals
  const [painPoints, setPainPoints] = useState([]);
  const [goals, setGoals] = useState([]);

  // Add new state for AI preferences
  const [wantAISuggestions, setWantAISuggestions] = useState(true);

  const addMember = useCallback(() => {
    if (!newMemberName.trim()) return;
    setMembers((prev) => [
      ...prev,
      {
        name: newMemberName.trim(),
        type: newMemberType,
        age: newMemberAge ? parseInt(newMemberAge) : null,
      },
    ]);
    setNewMemberName("");
    setNewMemberAge("");
  }, [newMemberName, newMemberType, newMemberAge]);

  const removeMember = useCallback((index) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const togglePainPoint = useCallback((point) => {
    setPainPoints((prev) =>
      prev.includes(point) ? prev.filter((p) => p !== point) : [...prev, point],
    );
  }, []);

  const toggleGoal = useCallback((goal) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          household_name: householdName || "My Home",
          people_count: peopleCount,
          children_ages: childrenAges || null,
          has_pets: hasPets,
          pet_details: petDetails || null,
          cooks_meals: cooksMeals,
          grocery_frequency: groceryFrequency,
          outsource_cleaning: outsourceCleaning,
          pain_points: painPoints.join(", "),
          goals: goals.join(", "),
          members: members,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save household");
      }

      if (typeof window !== "undefined") {
        window.location.href = "/upgrade";
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }, [
    householdName,
    peopleCount,
    childrenAges,
    hasPets,
    petDetails,
    cooksMeals,
    groceryFrequency,
    outsourceCleaning,
    painPoints,
    goals,
    members,
  ]);

  const steps = [
    // Step 0: Household basics
    <div key="basics" className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Tell us about your home
        </h2>
        <p className="text-sm text-gray-500">
          We'll use this to personalize your experience.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Household name
          </label>
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="e.g. The Johnsons"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            How many people live in your home?
          </label>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
              className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
            >
              -
            </button>
            <span className="text-lg font-medium text-gray-900 w-8 text-center">
              {peopleCount}
            </span>
            <button
              onClick={() => setPeopleCount(peopleCount + 1)}
              className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ages of children (if any)
          </label>
          <input
            type="text"
            value={childrenAges}
            onChange={(e) => setChildrenAges(e.target.value)}
            placeholder="e.g. 5, 8, 12"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Do you have pets?
          </label>
          <div className="flex space-x-3">
            <button
              onClick={() => setHasPets(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${hasPets ? "bg-[#6666f7] text-white border-[#6666f7]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              Yes
            </button>
            <button
              onClick={() => {
                setHasPets(false);
                setPetDetails("");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${!hasPets ? "bg-[#6666f7] text-white border-[#6666f7]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              No
            </button>
          </div>
          {hasPets && (
            <input
              type="text"
              value={petDetails}
              onChange={(e) => setPetDetails(e.target.value)}
              placeholder="e.g. 1 dog (Golden Retriever), 2 cats"
              className="w-full mt-3 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
            />
          )}
        </div>
      </div>
    </div>,

    // Step 1: Members
    <div key="members" className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Add household members
        </h2>
        <p className="text-sm text-gray-500">
          Add the people (and pets) who live with you.
        </p>
      </div>

      {members.length > 0 && (
        <div className="space-y-2">
          {members.map((member, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <Users size={16} className="text-gray-400" />
                <span className="text-sm text-gray-900">{member.name}</span>
                <span className="text-xs text-gray-400 capitalize">
                  {member.type}
                  {member.age ? `, ${member.age}` : ""}
                </span>
              </div>
              <button
                onClick={() => removeMember(index)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 p-4 border border-gray-200 rounded-lg">
        <input
          type="text"
          value={newMemberName}
          onChange={(e) => setNewMemberName(e.target.value)}
          placeholder="Name"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
        />
        <div className="flex space-x-3">
          <select
            value={newMemberType}
            onChange={(e) => setNewMemberType(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
          >
            <option value="adult">Adult</option>
            <option value="child">Child</option>
            <option value="pet">Pet</option>
          </select>
          <input
            type="number"
            value={newMemberAge}
            onChange={(e) => setNewMemberAge(e.target.value)}
            placeholder="Age"
            className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7]"
          />
        </div>
        <button
          onClick={addMember}
          disabled={!newMemberName.trim()}
          className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg disabled:opacity-50"
        >
          <Plus size={16} />
          <span>Add member</span>
        </button>
      </div>
    </div>,

    // Step 2: Lifestyle
    <div key="lifestyle" className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Your lifestyle
        </h2>
        <p className="text-sm text-gray-500">
          Help us understand your routines.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Do you cook most meals at home?
          </label>
          <div className="flex space-x-3">
            <button
              onClick={() => setCooksMeals(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${cooksMeals ? "bg-[#6666f7] text-white border-[#6666f7]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              Yes
            </button>
            <button
              onClick={() => setCooksMeals(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${!cooksMeals ? "bg-[#6666f7] text-white border-[#6666f7]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              No
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How often do you grocery shop?
          </label>
          <div className="flex flex-wrap gap-2">
            {["daily", "twice a week", "weekly", "biweekly", "monthly"].map(
              (freq) => (
                <button
                  key={freq}
                  onClick={() => setGroceryFrequency(freq)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${groceryFrequency === freq ? "bg-[#6666f7] text-white border-[#6666f7]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {freq}
                </button>
              ),
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Do you outsource cleaning?
          </label>
          <div className="flex space-x-3">
            <button
              onClick={() => setOutsourceCleaning(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${outsourceCleaning ? "bg-[#6666f7] text-white border-[#6666f7]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              Yes
            </button>
            <button
              onClick={() => setOutsourceCleaning(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${!outsourceCleaning ? "bg-[#6666f7] text-white border-[#6666f7]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              No
            </button>
          </div>
        </div>
      </div>
    </div>,

    // Step 3: Pain points & goals
    <div key="goals" className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          What matters most to you?
        </h2>
        <p className="text-sm text-gray-500">
          Select all that apply — this helps us prioritize.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What's hardest to stay organized with?
        </label>
        <div className="flex flex-wrap gap-2">
          {PAIN_POINT_OPTIONS.map((point) => (
            <button
              key={point}
              onClick={() => togglePainPoint(point)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${painPoints.includes(point) ? "bg-[#6666f7] text-white border-[#6666f7]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {point}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What would you like to improve?
        </label>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((goal) => (
            <button
              key={goal}
              onClick={() => toggleGoal(goal)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${goals.includes(goal) ? "bg-[#6666f7] text-white border-[#6666f7]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>
    </div>,

    // NEW Step 4: AI Preferences
    <div key="ai" className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          AI suggestions
        </h2>
        <p className="text-sm text-gray-500">
          HousePilot can optionally suggest tasks, lists, and supplies based on
          your household. You're always in control.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Would you like AI suggestions?
          </label>
          <div className="flex space-x-3">
            <button
              onClick={() => setWantAISuggestions(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${wantAISuggestions ? "bg-[#6666f7] text-white border-[#6666f7]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              Yes, help me out
            </button>
            <button
              onClick={() => setWantAISuggestions(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${!wantAISuggestions ? "bg-[#6666f7] text-white border-[#6666f7]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              No thanks
            </button>
          </div>
        </div>

        {wantAISuggestions && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500">
              What AI can do for you:
            </p>
            {[
              "Suggest recurring chores like laundry and trash",
              "Recommend grocery items when supplies run low",
              "Generate helpful lists for trips or events",
              "Detect patterns and offer scheduling tips",
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                <span className="text-xs text-gray-600">{item}</span>
              </div>
            ))}
            <p className="text-[10px] text-gray-400 mt-2">
              You can always turn suggestions on or off later.
            </p>
          </div>
        )}
      </div>
    </div>,
  ];

  const totalSteps = steps.length;
  const isLastStep = step === totalSteps - 1;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 px-4 sm:px-8 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-[#6666f7] rounded-lg flex items-center justify-center">
              <Home size={14} className="text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">
              HousePilot
            </span>
          </div>
          <span className="text-sm text-gray-400">
            Step {step + 1} of {totalSteps}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 h-1">
        <div
          className="bg-[#6666f7] h-1 transition-all duration-300"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-8 py-8 sm:py-12">
        <div className="w-full max-w-lg">
          {steps[step]}

          {error && (
            <div className="mt-4 flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="flex items-center space-x-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            {isLastStep ? (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2.5 bg-[#6666f7] text-white rounded-lg font-medium hover:bg-[#4d4dc7] transition-colors disabled:opacity-50 text-sm"
              >
                <span>{saving ? "Setting up..." : "Finish Setup"}</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center space-x-2 px-6 py-2.5 bg-[#6666f7] text-white rounded-lg font-medium hover:bg-[#4d4dc7] transition-colors text-sm"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
