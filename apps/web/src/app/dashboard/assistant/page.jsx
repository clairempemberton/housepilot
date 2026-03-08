"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Sparkles, Home } from "lucide-react";
import AppShell from "../../../components/AppShell";

const QUICK_PROMPTS = [
  "What should I focus on this week?",
  "What groceries do we need?",
  "What chores should we do this weekend?",
  "Suggest a meal plan for the week",
  "How is our household doing?",
  "What maintenance is coming up?",
  "Help me balance the family workload",
  "What supplies are running low?",
  "Plan my Saturday morning routine",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm HousePilot, your household assistant. I know about your family, schedules, and home. Ask me anything — I can help plan meals, organize tasks, suggest routines, and more.",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage) => {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage }),
      });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I had trouble responding. Please try again.",
        },
      ]);
    },
  });

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    chatMutation.mutate(userMessage);
  };

  const handleQuickPrompt = (prompt) => {
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    chatMutation.mutate(prompt);
  };

  const showQuickPrompts = messages.length <= 1;

  return (
    <AppShell activeTab="/dashboard/assistant">
      <div className="flex flex-col h-[calc(100vh-56px)] md:h-screen">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-[#6666f7] text-white"
                      : "bg-gray-50 text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-50 rounded-2xl px-4 py-3">
                  <div className="flex space-x-1.5">
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                      style={{ animation: "pulse 1s ease-in-out infinite" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                      style={{
                        animation: "pulse 1s ease-in-out 0.15s infinite",
                      }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                      style={{
                        animation: "pulse 1s ease-in-out 0.3s infinite",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick prompts */}
            {showQuickPrompts && (
              <div className="pt-4">
                <p className="text-xs text-gray-400 mb-3">
                  Try asking (household context-aware):
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 sm:px-8 py-4">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="flex space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask HousePilot anything..."
                disabled={chatMutation.isPending}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || chatMutation.isPending}
                className="px-4 py-2.5 bg-[#6666f7] text-white rounded-xl hover:bg-[#4d4dc7] transition-colors disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        <style jsx global>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    </AppShell>
  );
}
