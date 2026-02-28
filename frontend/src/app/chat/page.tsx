"use client";

import { useState, useRef, useEffect } from "react";
import { useChat, ChatMessage } from "@/hooks/use-chat";
import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const mono = "'Roboto Mono', monospace";
const sans = "'Plus Jakarta Sans', system-ui, sans-serif";

function ToolChip({ name, status }: { name: string; status: string }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 12px",
        fontSize: 11, letterSpacing: 1,
        fontFamily: mono,
        color: status === "running" ? "#fa500f" : "rgba(255,250,235,0.35)",
        border: `1px solid ${status === "running" ? "rgba(250,80,15,0.3)" : "rgba(255,250,235,0.08)"}`,
        background: status === "running" ? "rgba(250,80,15,0.06)" : "rgba(255,250,235,0.02)",
        textTransform: "uppercase",
      }}
    >
      {status === "running" && (
        <span
          style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "#fa500f", display: "inline-block",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      )}
      {status === "done" && (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,250,235,0.2)", display: "inline-block" }} />
      )}
      {name}
    </span>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "75%",
          padding: "14px 18px",
          fontSize: 14,
          lineHeight: 1.7,
          fontFamily: isUser ? sans : sans,
          background: isUser ? "rgba(250,80,15,0.08)" : "rgba(255,250,235,0.03)",
          border: isUser ? "1px solid rgba(250,80,15,0.2)" : "1px solid rgba(255,250,235,0.06)",
          borderRadius: isUser ? "2px 2px 2px 2px" : "2px",
          color: isUser ? "#fffaeb" : "rgba(255,250,235,0.75)",
        }}
      >
        {isUser ? (
          <p style={{ margin: 0 }}>{message.content}</p>
        ) : (
          <div>
            <ReactMarkdown
              components={{
                p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
                h1: ({ children }) => (
                  <h1 style={{ fontSize: 16, fontWeight: 700, marginTop: 16, marginBottom: 8, color: "#fffaeb" }}>{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 style={{
                    fontSize: 11, fontWeight: 600, marginTop: 20, marginBottom: 8,
                    textTransform: "uppercase", letterSpacing: 2,
                    color: "#fa500f", fontFamily: mono,
                  }}>
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 12, marginBottom: 6, color: "#fffaeb" }}>{children}</h3>
                ),
                ul: ({ children }) => <ul style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ol>,
                li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
                strong: ({ children }) => (
                  <strong style={{ fontWeight: 600, color: "#fffaeb" }}>{children}</strong>
                ),
                code: ({ children }) => (
                  <code style={{
                    padding: "2px 6px", fontSize: 12,
                    fontFamily: mono, background: "rgba(250,80,15,0.08)",
                    border: "1px solid rgba(250,80,15,0.15)",
                  }}>
                    {children}
                  </code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            {!message.content && (
              <span
                style={{
                  display: "inline-block", width: 8, height: 16,
                  background: "#fa500f", opacity: 0.6,
                  animation: "blink 1s infinite",
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { messages, tools, isLoading, agentMode, error, send, reset } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tools]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    send(input);
    setInput("");
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#111113", color: "#fffaeb" }}>
      {/* Header */}
      <header
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 56,
          borderBottom: "1px solid rgba(255,250,235,0.08)",
          fontFamily: mono,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ color: "rgba(255,250,235,0.35)", textDecoration: "none", transition: "color 0.15s", display: "flex" }}>
            <ArrowLeft size={16} />
          </Link>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 4, color: "#fa500f" }}>
            Omni<strong>CAT</strong>
          </span>
          {agentMode && (
            <span
              style={{
                fontSize: 10, letterSpacing: 2,
                padding: "3px 10px",
                border: "1px solid rgba(250,80,15,0.3)",
                background: "rgba(250,80,15,0.06)",
                color: "#fa500f",
                textTransform: "uppercase",
              }}
            >
              {agentMode}
            </span>
          )}
        </div>

        <button
          onClick={reset}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,250,235,0.25)", transition: "color 0.15s",
            display: "flex", alignItems: "center",
          }}
          title="New briefing"
        >
          <RotateCcw size={14} />
        </button>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px" }}>
        {messages.length === 0 && !isLoading && (
          <div style={{
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", textAlign: "center",
          }}>
            <h2 style={{
              fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700,
              letterSpacing: "-0.03em", marginBottom: 8,
              fontFamily: sans,
            }}>
              Omni<span style={{ color: "#fa500f" }}>CAT</span>
            </h2>
            <p style={{
              fontSize: 13, color: "rgba(255,250,235,0.35)",
              fontFamily: mono, letterSpacing: 1, marginBottom: 32,
            }}>
              Give me a location, I&apos;ll run the briefing.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {["Analyze Marseille", "Strait of Gibraltar area", "Situation in Odessa"].map(
                (q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    style={{
                      fontSize: 11, padding: "8px 16px", letterSpacing: 1,
                      background: "transparent",
                      border: "1px solid rgba(255,250,235,0.1)",
                      color: "rgba(255,250,235,0.4)",
                      cursor: "pointer", fontFamily: mono,
                      textTransform: "uppercase",
                      transition: "all 0.15s",
                    }}
                    className="hover:border-[rgba(250,80,15,0.3)] hover:text-[#fa500f] hover:bg-[rgba(250,80,15,0.04)]"
                  >
                    {q}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {/* Tool chips */}
          {tools.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingLeft: 4 }}>
              {tools.map((t, i) => (
                <ToolChip key={i} name={t.name} status={t.status} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              fontSize: 12, fontFamily: mono, color: "#ff4444",
              padding: "8px 12px",
              border: "1px solid rgba(255,68,68,0.2)",
              background: "rgba(255,68,68,0.05)",
            }}>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,250,235,0.08)" }}>
        <form
          onSubmit={handleSubmit}
          style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Analyze the area of..."
            disabled={isLoading}
            style={{
              flex: 1, background: "transparent",
              border: "1px solid rgba(255,250,235,0.1)",
              padding: "12px 18px", fontSize: 14,
              color: "#fffaeb", outline: "none",
              fontFamily: sans,
              transition: "border-color 0.15s",
              opacity: isLoading ? 0.4 : 1,
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              width: 44, height: 44,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: input.trim() && !isLoading ? "#fa500f" : "transparent",
              border: input.trim() && !isLoading ? "none" : "1px solid rgba(255,250,235,0.1)",
              color: input.trim() && !isLoading ? "#111113" : "rgba(255,250,235,0.2)",
              cursor: isLoading || !input.trim() ? "default" : "pointer",
              transition: "all 0.15s",
              fontFamily: mono, fontSize: 18, fontWeight: 700,
            }}
          >
            →
          </button>
        </form>
      </div>
    </div>
  );
}
