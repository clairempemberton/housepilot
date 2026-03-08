"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your AI assistant. How can I help you today?",
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
        },
      ]);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    // Send to API
    chatMutation.mutate(userMessage);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1E1E1E] flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-[#121212] border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-jetbrains-mono">
                AI Chat Assistant
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-jetbrains-mono">
                Powered by ChatGPT
              </p>
            </div>
          </div>
          <a
            href="/"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-jetbrains-mono"
          >
            Back to Home
          </a>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "bg-white dark:bg-[#262626] shadow-sm dark:shadow-none dark:ring-1 dark:ring-gray-700"
                }`}
              >
                <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 font-jetbrains-mono whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-[#262626] shadow-sm dark:shadow-none dark:ring-1 dark:ring-gray-700 rounded-2xl px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={chatMutation.isPending}
              className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-jetbrains-mono disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || chatMutation.isPending}
              className="px-6 py-3 bg-[#6666f7] dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium hover:bg-[#4d4dc7] dark:hover:bg-gray-200 active:bg-[#4d4dc7] dark:active:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send size={18} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
