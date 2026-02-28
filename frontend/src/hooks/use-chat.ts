"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ToolStatus {
  name: string;
  status: "running" | "done";
}

interface UseChatReturn {
  messages: ChatMessage[];
  tools: ToolStatus[];
  isLoading: boolean;
  agentMode: string | null;
  error: string | null;
  send: (message: string) => Promise<void>;
  reset: () => void;
}

export function useChat(
  apiEndpoint = "http://localhost:8000/stream"
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tools, setTools] = useState<ToolStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentMode, setAgentMode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;

      // Abort previous request if any
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setTools([]);
      setAgentMode(null);
      setIsLoading(true);

      // Add user message
      setMessages((prev) => [...prev, { role: "user", content: message }]);

      let assistantContent = "";

      try {
        const res = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Erreur serveur: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("Pas de stream disponible");

        const decoder = new TextDecoder();
        let buffer = "";

        // Add empty assistant message
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") break;

            try {
              const event = JSON.parse(raw);

              switch (event.type) {
                case "tool_start":
                  setTools((prev) => [
                    ...prev,
                    { name: event.tool, status: "running" },
                  ]);
                  break;

                case "tool_end":
                  setTools((prev) =>
                    prev.map((t) =>
                      t.name === event.tool ? { ...t, status: "done" } : t
                    )
                  );
                  break;

                case "agent_selected":
                  setAgentMode(event.agent);
                  break;

                case "content":
                  assistantContent += event.data;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: assistantContent,
                    };
                    return updated;
                  });
                  break;

                case "error":
                  setError(event.message);
                  break;
              }
            } catch {
              // Ignore JSON parse errors for partial chunks
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [apiEndpoint, isLoading]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setTools([]);
    setIsLoading(false);
    setAgentMode(null);
    setError(null);
  }, []);

  return { messages, tools, isLoading, agentMode, error, send, reset };
}
