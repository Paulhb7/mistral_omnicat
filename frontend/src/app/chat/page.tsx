"use client";

import { useState, useRef, useEffect } from "react";
import { useChat, ChatMessage } from "@/hooks/use-chat";
import { ArrowUp, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

function ToolChip({ name, status }: { name: string; status: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-full border"
      style={{
        borderColor: status === "running" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
        background: status === "running" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
      }}
    >
      {status === "running" && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-white"
          style={{ animation: "pulse 1.5s infinite" }}
        />
      )}
      {status === "done" && <span className="w-1.5 h-1.5 rounded-full bg-white/40" />}
      {name}
    </span>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[75%] px-4 py-3 text-sm leading-relaxed"
        style={{
          background: isUser ? "rgba(255,255,255,0.1)" : "transparent",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                h1: ({ children }) => (
                  <h1 className="text-base font-bold mt-4 mb-2 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-bold mt-3 mb-1.5 uppercase tracking-wider text-white/70">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
                ),
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-white">{children}</strong>
                ),
                code: ({ children }) => (
                  <code className="px-1 py-0.5 rounded text-xs font-mono bg-white/10">
                    {children}
                  </code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            {!message.content && (
              <span
                className="inline-block w-2 h-4 bg-white/60"
                style={{ animation: "blink 1s infinite" }}
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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-bold tracking-tight">
            Omni<span className="font-light">CAT</span>
          </h1>
          {agentMode && (
            <span
              className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border"
              style={{ borderColor: "var(--border)" }}
            >
              {agentMode}
            </span>
          )}
        </div>

        <button
          onClick={reset}
          className="text-white/30 hover:text-white transition-colors"
          title="New briefing"
        >
          <RotateCcw size={16} />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-3xl font-bold tracking-tighter mb-2">
              Omni<span className="font-light">CAT</span>
            </p>
            <p className="text-sm text-white/40 mb-8">
              Give me a location, I'll run the briefing.
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              {["Analyze Marseille", "Strait of Gibraltar area", "Situation in Odessa"].map(
                (q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-xs px-4 py-2 border border-white/10 rounded-full hover:bg-white/5 transition-colors"
                  >
                    {q}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {/* Tool chips */}
          {tools.length > 0 && (
            <div className="flex gap-2 flex-wrap pl-1">
              {tools.map((t, i) => (
                <ToolChip key={i} name={t.name} status={t.status} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 font-mono pl-1">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-center gap-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Analyze the area of..."
            disabled={isLoading}
            className="flex-1 bg-transparent border border-white/10 rounded-full px-5 py-3 text-sm outline-none focus:border-white/30 transition-colors placeholder:text-white/20 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-white"
          >
            <ArrowUp size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
