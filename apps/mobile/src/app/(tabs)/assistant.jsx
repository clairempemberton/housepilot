import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Send, ArrowLeft, Sparkles } from "lucide-react-native";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

const GREEN = "#6666f7";
const GREEN_LIGHT = "#ededfe";

const QUICK_PROMPTS = [
  "What should I focus on this week?",
  "What groceries do we need?",
  "Suggest a meal plan",
  "How is our household doing?",
  "Plan my Saturday routine",
];

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm HousePilot, your household assistant. I know about your family, schedules, and home. Ask me anything!",
    },
  ]);
  const [input, setInput] = useState("");

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

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, chatMutation.isPending]);

  const handleSend = () => {
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
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <StatusBar style="dark" />

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#f3f4f6",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{ marginRight: 12, padding: 4 }}
          >
            <ArrowLeft size={22} color="#111" />
          </Pressable>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: GREEN_LIGHT,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Sparkles size={16} color={GREEN} />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111" }}>
              AI Assistant
            </Text>
            <Text style={{ fontSize: 11, color: "#9ca3af" }}>
              Powered by your household data
            </Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <View
                key={i}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    backgroundColor: isUser ? "#111" : "#f3f4f6",
                    borderRadius: 18,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      lineHeight: 20,
                      color: isUser ? "#fff" : "#111",
                    }}
                  >
                    {msg.content}
                  </Text>
                </View>
              </View>
            );
          })}

          {chatMutation.isPending && (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#f3f4f6",
                borderRadius: 18,
                paddingHorizontal: 18,
                paddingVertical: 12,
                marginBottom: 10,
              }}
            >
              <ActivityIndicator size="small" color="#9ca3af" />
            </View>
          )}

          {showQuickPrompts && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
                Try asking:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {QUICK_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt}
                    onPress={() => handleQuickPrompt(prompt)}
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>
                      {prompt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#f3f4f6",
            paddingHorizontal: 16,
            paddingVertical: 10,
            paddingBottom: insets.bottom + 10,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask HousePilot anything..."
            placeholderTextColor="#9ca3af"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontSize: 14,
              color: "#111",
              marginRight: 10,
            }}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor:
                input.trim() && !chatMutation.isPending ? GREEN : "#e5e7eb",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Send
              size={18}
              color={
                input.trim() && !chatMutation.isPending ? "#fff" : "#9ca3af"
              }
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
