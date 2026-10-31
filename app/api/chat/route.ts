const SYSTEM_PROMPT = `You are an AI research analyst focused on frontier AI developments. Prioritize high-signal updates: model launches, research papers with practical impact, evaluation breakthroughs, deployment wins, open-source progress, and major shifts in cost/latency or reasoning quality. Be precise, filter out hype, and highlight what is actually worth reading. Return concise but useful answers, usually with a short list of the most important signals and a clear recommendation on what matters.`;

export const dynamic = "force-dynamic";

function summarizeSignals(signals: any[]) {
  if (!signals.length) {
    return "No signals yet.";
  }

  const topSignals = signals.slice(0, 3);
  const summaryLines = topSignals.map((signal, index) => {
    const title = signal.title || "Signal";
    const source = signal.source || "Unknown source";
    const reason = signal.whyItMatters || signal.summary || "This is relevant to current AI trends.";
    return `${index + 1}. ${title} (${source}) — ${reason}`;
  });

  return `${summaryLines.join("\n\n")}`;
}

async function tryLocalModel(messages: any[], signals: any[]) {
  const localApiUrl = process.env.LOCAL_LLM_API_URL || process.env.OLLAMA_BASE_URL || "";
  const modelName = process.env.LOCAL_LLM_MODEL || process.env.OLLAMA_MODEL || "";
  const localApiKey = process.env.LOCAL_LLM_API_KEY || "";

  if (!localApiUrl) {
    return null;
  }

  try {
    const lastUserMessage = [...messages].reverse().find((message: any) => message?.role === "user")?.content || "hello";
    const signalContext = summarizeSignals(signals);

    if (localApiUrl.includes("/api/generate") || localApiUrl.includes("localhost:11434")) {
      const response = await fetch(`${localApiUrl.replace(/\/$/, "")}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName || "llama3.1:8b",
          prompt: `${SYSTEM_PROMPT}\n\nSignals:\n${signalContext}\n\nQuestion: ${lastUserMessage}`,
          stream: false,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const text = data?.response || "";
      return text.trim() || null;
    }

    const response = await fetch(`${localApiUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(localApiKey ? { Authorization: `Bearer ${localApiKey}` } : {}),
      },
      body: JSON.stringify({
        model: modelName || "local-model",
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\nSignals:\n${signalContext}`,
          },
          ...messages,
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || data?.answer || "";
    return String(text).trim() || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const signals = Array.isArray(body?.signals) ? body.signals : [];

  const lastUserMessage = [...messages].reverse().find((message: any) => message?.role === "user")?.content || "hello";
  const localSummary = summarizeSignals(signals);

  const localModelReply = await tryLocalModel(messages, signals);
  if (localModelReply) {
    return Response.json({ reply: localModelReply });
  }

  const reply = `${SYSTEM_PROMPT}\n\nImportant signals right now:\n${localSummary}\n\nUser question: "${lastUserMessage}"\n\nTakeaway: focus on the items that affect model quality, deployment cost, or large-scale system design. Ignore PR-heavy noise and low-signal startup chatter.`;

  return Response.json({ reply });
}
