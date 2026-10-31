"use client";

import { FormEvent, useEffect, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Signal = {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  tag: string;
  whyItMatters: string;
  relatedLinks?: string[];
};

const defaultMessages: Message[] = [
  {
    role: "assistant",
    content:
      "I track AI breakthroughs, research, and product signals. Ask for the highest-signal updates, a reading list, or what matters this week.",
  },
];

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [input, setInput] = useState("What are the 3 most important AI signals this week?");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"All" | "Papers" | "Product" | "Open Source" | "Industry">("All");

  useEffect(() => {
    async function loadSignals() {
      const response = await fetch("/api/ai-news");
      const data = await response.json();
      setSignals(data.signals || []);
    }

    loadSignals();
  }, []);

  const filteredSignals =
    activeTab === "All"
      ? signals
      : signals.filter((signal) => {
          if (activeTab === "Papers") return signal.tag === "Paper" || signal.tag === "Benchmark";
          if (activeTab === "Product") return signal.tag === "Product";
          if (activeTab === "Open Source") return signal.tag === "Open Source";
          if (activeTab === "Industry") return signal.tag === "Industry";
          return true;
        });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();

    if (!text || loading) {
      return;
    }

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: nextMessages, signals }),
      });

      const data = await response.json();
      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.reply || "I’m ready when you are." },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "I hit a problem fetching the latest AI signals. Check your OpenAI key or try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="chat-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">AI signal desk</p>
            <h1>Signal AI</h1>
          </div>
          <span className="status-pill">Vercel-ready</span>
        </header>

        <div className="tab-row" aria-label="Signal categories">
          {(["All", "Papers", "Product", "Open Source", "Industry"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "tab active" : "tab"}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="signal-grid">
          {filteredSignals.map((signal) => (
            <article key={`${signal.title}-${signal.source}`} className="signal-card">
              <div className="signal-meta">
                <span className="signal-tag">{signal.tag}</span>
                <span>{signal.source}</span>
              </div>
              <h3>{signal.title}</h3>
              <p>{signal.summary}</p>
              <div className="signal-note">{signal.whyItMatters}</div>

              {signal.relatedLinks && signal.relatedLinks.length > 0 && (
                <div className="related-links" aria-label="Related links">
                  {signal.relatedLinks.map((link) => {
                    const hostname = new URL(link).hostname.replace("www.", "");
                    return (
                      <a key={`${signal.title}-${hostname}`} href={link} target="_blank" rel="noreferrer">
                        {hostname}
                      </a>
                    );
                  })}
                </div>
              )}

              <div className="signal-footer">
                <span>{signal.publishedAt}</span>
                <a href={signal.url} target="_blank" rel="noreferrer">
                  Read
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="messages">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
              <span className="message-role">{message.role === "assistant" ? "Agent" : "You"}</span>
              <p>{message.content}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="composer">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="Ask about papers, breakthroughs, model launches, or what matters this week..."
            aria-label="Ask the AI signal agent"
          />
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? "Scanning..." : "Ask"}
          </button>
        </form>
      </section>
    </main>
  );
}
