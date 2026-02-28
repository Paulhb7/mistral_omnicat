"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolStatus {
  name: string;
  status: "running" | "done";
}

export interface LocationData {
  name: string;
  lat: number;
  lng: number;
}

export interface PanelData {
  weather?: Record<string, unknown>;
  climate?: Record<string, unknown>;
  earthquakes?: Record<string, unknown>;
  news?: Record<string, unknown>;
  conflict?: Record<string, unknown>;
}

// Map backend tool names to panel keys
const TOOL_TO_PANEL: Record<string, keyof PanelData> = {
  get_weather: 'weather',
  get_climate_events: 'climate',
  get_earthquakes: 'earthquakes',
  get_news: 'news',
  get_conflict_events: 'conflict',
};

interface UseChatReturn {
  messages: ChatMessage[];
  tools: ToolStatus[];
  isLoading: boolean;
  agentMode: string | null;
  error: string | null;
  location: LocationData | null;
  panelData: PanelData;
  briefing: string | null;
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
  const [location, setLocation] = useState<LocationData | null>(null);
  const [panelData, setPanelData] = useState<PanelData>({});
  const [briefing, setBriefing] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  const send = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setTools([]);
      setAgentMode(null);
      setIsLoading(true);
      setLocation(null);
      setPanelData({});
      setBriefing(null);

      setMessages((prev) => [...prev, { role: "user", content: message }]);

      let assistantContent = "";

      try {
        const res = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, session_id: sessionIdRef.current }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream available");

        const decoder = new TextDecoder();
        let buffer = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
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
                    ...prev.filter(t => t.name !== event.tool),
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

                case "location":
                  setLocation({ name: event.name, lat: event.lat, lng: event.lng });
                  break;

                case "content":
                  assistantContent += event.data;
                  setBriefing(assistantContent);
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

                default:
                  // Handle data_* events (data_get_weather, data_get_climate_events, etc.)
                  if (event.type?.startsWith('data_')) {
                    const toolName = event.type.slice(5); // strip 'data_'
                    const panelKey = TOOL_TO_PANEL[toolName];
                    if (panelKey) {
                      setPanelData(prev => ({ ...prev, [panelKey]: event.data }));
                    }
                  }
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
    sessionIdRef.current = crypto.randomUUID();
    setMessages([]);
    setTools([]);
    setIsLoading(false);
    setAgentMode(null);
    setError(null);
    setLocation(null);
    setPanelData({});
    setBriefing(null);
  }, []);

  return { messages, tools, isLoading, agentMode, error, location, panelData, briefing, send, reset };
}
