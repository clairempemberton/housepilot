import { useQuery } from "@tanstack/react-query";
import { Sparkles, RefreshCw, Lightbulb } from "lucide-react";
import { useState } from "react";

export default function AIInsights({ module, className }) {
  const [dismissed, setDismissed] = useState([]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const res = await fetch("/api/ai/insights");
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });

  const insights = data?.insights?.[module] || [];
  const visibleInsights = Array.isArray(insights)
    ? insights.filter((item) => {
        const text = typeof item === "string" ? item : item?.text;
        return !dismissed.includes(text);
      })
    : [];

  const handleRefresh = async () => {
    await fetch("/api/ai/insights", { method: "POST" });
    refetch();
  };

  if (isLoading) {
    return (
      <div className={`${className || ""}`}>
        <div className="flex items-center space-x-2 px-3 py-3 bg-gray-50 rounded-xl">
          <Sparkles size={14} className="text-gray-300" />
          <span className="text-xs text-gray-400">
            Analyzing your patterns...
          </span>
        </div>
      </div>
    );
  }

  if (visibleInsights.length === 0) return null;

  return (
    <div className={`${className || ""}`}>
      <div className="bg-gray-50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Lightbulb size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Smart Suggestions
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="text-gray-300 hover:text-gray-500 transition-colors disabled:opacity-50"
            title="Refresh insights"
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="px-4 py-2.5 space-y-2">
          {visibleInsights.map((item, index) => {
            const text = typeof item === "string" ? item : item?.text;
            return (
              <div key={index} className="flex items-start space-x-2.5 group">
                <Sparkles
                  size={12}
                  className="text-gray-400 mt-0.5 flex-shrink-0"
                />
                <p className="text-xs text-gray-600 leading-relaxed flex-1">
                  {text}
                </p>
                <button
                  onClick={() => setDismissed((prev) => [...prev, text])}
                  className="text-gray-300 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all text-xs flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
