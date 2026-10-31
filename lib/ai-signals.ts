export type Signal = {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  tag: string;
  whyItMatters: string;
  relatedLinks?: string[];
};

type CachedNews = {
  signals: Signal[];
  fetchedAt: string;
};

const FALLBACK_SIGNALS: Signal[] = [
  {
    title: "OpenAI / frontier labs continue pushing multimodal reasoning and agentic tool use",
    summary: "Model providers are shipping larger reasoning stacks, tighter tool execution, and stronger multimodal workflows.",
    source: "AI Frontier",
    url: "https://openai.com",
    publishedAt: "Fresh signal",
    tag: "Product",
    whyItMatters: "This is where the highest-leverage product changes usually appear first.",
    relatedLinks: ["https://openai.com/news", "https://blog.google/technology/ai/"],
  },
  {
    title: "Research continues to move from model benchmarks to real deployment constraints",
    summary: "The best work is now focused on reliability, latency, memory, and cost-efficiency in production systems.",
    source: "AI Research",
    url: "https://arxiv.org",
    publishedAt: "Fresh signal",
    tag: "Paper",
    whyItMatters: "This decides whether a breakthrough becomes usable infrastructure or stays academic.",
    relatedLinks: ["https://arxiv.org/", "https://huggingface.co/blog"],
  },
  {
    title: "Open-source models are closing the gap on quality, speed, and cost",
    summary: "Smaller open models are becoming compelling for specialized agents and cost-sensitive products.",
    source: "Open Models",
    url: "https://huggingface.co",
    publishedAt: "Fresh signal",
    tag: "Open Source",
    whyItMatters: "This creates the next wave of real-world deployment opportunities for teams without giant budgets.",
    relatedLinks: ["https://huggingface.co/blog", "https://ollama.com/blog"],
  },
];

const FEEDS = [
  "https://export.arxiv.org/rss/cs.AI",
  "https://hnrss.org/newest?q=AI",
  "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
];

const HIGH_SIGNAL_KEYWORDS = [
  "llm",
  "large language model",
  "reasoning",
  "agent",
  "agents",
  "benchmark",
  "evaluation",
  "training",
  "inference",
  "fine-tuning",
  "open-source",
  "multimodal",
  "retrieval",
  "rag",
  "safety",
  "alignment",
  "tool use",
  "thinkjev",
  "typed decision",
  "sequential feedback",
  "moe",
  "mixture-of-experts",
  "quantization",
  "memory",
  "latency",
  "cost",
  "deployment",
  "model",
  "research",
  "paper",
  "reinforcement",
  "diffusion",
  "vision",
  "audio",
  "robotics",
  "coding",
  "code",
  "distillation",
  "pretraining",
  "post-training",
  "api",
  "system",
  "eval",
  "reasoning",
];

const LOW_SIGNAL_KEYWORDS = [
  "job",
  "jobs",
  "salary",
  "hiring",
  "founder",
  "startup",
  "ceo",
  "funding",
  "vc",
  "crypto",
  "nft",
  "meme",
  "gadget",
  "phone",
  "shopping",
  "celebrity",
  "fashion",
  "toy",
  "newsroom",
  "commentary",
  "opinion",
  "analysis",
  "breaking",
];

const DAILY_REFRESH_MS = 24 * 60 * 60 * 1000;
const NEWS_CACHE_KEY = "__signal_ai_news_cache__";

function getGlobalCache(): Record<string, any> {
  const globalScope = globalThis as typeof globalThis & Record<string, any>;
  if (!globalScope[NEWS_CACHE_KEY]) {
    globalScope[NEWS_CACHE_KEY] = {};
  }
  return globalScope[NEWS_CACHE_KEY];
}

function getCachedNews(): CachedNews | undefined {
  const cache = getGlobalCache();
  return cache["news"] as CachedNews | undefined;
}

function setCachedNews(payload: CachedNews) {
  const cache = getGlobalCache();
  cache["news"] = payload;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractText(xml: string, tag: string) {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(pattern);
  return match ? decodeHtml(match[1].replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim()) : "";
}

function scoreSignal(title: string, summary: string, source: string): number {
  const rawText = `${title} ${summary}`.toLowerCase();
  let score = 0;

  for (const keyword of HIGH_SIGNAL_KEYWORDS) {
    if (rawText.includes(keyword)) {
      score += 2;
    }
  }

  if (/thinkjev/i.test(rawText)) score += 8;
  if (/arxiv|paper|research|benchmark|evaluation|model/i.test(title)) score += 2;
  if (/agent|reasoning|multimodal|coding|tool use|tool-use|rag|inference|training/i.test(rawText)) score += 2;
  if (/open-source|open source|release|launch|demo|capability|improvement/i.test(rawText)) score += 1;
  if (source === "ArXiv") score += 2;
  if (source === "Industry News") score -= 1;
  if (source === "Hacker News") score += 1;

  for (const keyword of LOW_SIGNAL_KEYWORDS) {
    if (rawText.includes(keyword)) {
      score -= 4;
    }
  }

  if (/how to|tutorial|guide|review|opinion/i.test(rawText)) score -= 3;
  if (/startup|founder|funding|job|salary|hiring/i.test(rawText)) score -= 5;
  if (/\bai\b/.test(rawText) && !/llm|model|agent|reasoning|research|benchmark|evaluation|vision|audio|robotics|open-source|coding/.test(rawText)) score -= 2;

  return score;
}

function classifySignal(title: string, summary: string, source: string): string {
  const text = `${title} ${summary}`.toLowerCase();

  if (/open-source|open source|hugging face|github|model weights|fine-tuning|distillation|qwen|llama|mistral|vllm|ollama|adapter|repo/.test(text)) {
    return "Open Source";
  }

  if (/launch|released|release|announced|announcement|beta|preview|api|pricing|new model|update|added|upgrade|product/.test(text)) {
    return "Product";
  }

  if (source === "Industry News" || /verge|techcrunch|startup|funding|acquisition|market|industry/.test(text)) {
    return "Industry";
  }

  if (source === "ArXiv" || /arxiv|paper|benchmark|evaluation|eval|reasoning|research|scientific|rediscovery|agent environment|sequential feedback/.test(text)) {
    return "Paper";
  }

  if (/benchmark|leaderboard|score|accuracy/.test(text)) {
    return "Paper";
  }

  return "Industry";
}

function getRelatedLinks(title: string, summary: string): string[] {
  const text = `${title} ${summary}`.toLowerCase();
  const links: string[] = [];

  if (/agent|tool use|tool-use|autonomous|reasoning/.test(text)) {
    links.push("https://www.anthropic.com/news", "https://blog.google/technology/ai/");
  }

  if (/open-source|open source|model weights|fine-tuning|distillation|llm|mistral|llama|qwen/.test(text)) {
    links.push("https://huggingface.co/blog", "https://ollama.com/blog");
  }

  if (/benchmark|evaluation|eval|accuracy|leaderboard/.test(text)) {
    links.push("https://blog.google/technology/ai/", "https://www.anthropic.com/news");
  }

  if (/multimodal|vision|audio|robotics/.test(text)) {
    links.push("https://blog.google/technology/ai/", "https://openai.com/news");
  }

  if (!links.length) {
    links.push("https://arxiv.org/", "https://huggingface.co/blog");
  }

  return Array.from(new Set(links)).slice(0, 3);
}

function makeWhyItMatters(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();

  if (/agent|tool use|tool-use|agents/.test(text)) {
    return "This matters because it changes how autonomous AI systems actually operate in real workflows.";
  }

  if (/reasoning|benchmark|evaluation|eval/.test(text)) {
    return "This matters because it can reshape how we judge model quality and where the frontier is moving.";
  }

  if (/open-source|open source|fine-tuning|distillation|quantization|inference|cost|latency/.test(text)) {
    return "This matters because it affects cost, speed, deployment feasibility, and who can actually use the technology.";
  }

  if (/safety|alignment|security|robustness/.test(text)) {
    return "This matters because it directly affects trust, risk, and whether the system is deployable in sensitive environments.";
  }

  if (/multimodal|vision|audio|robotics/.test(text)) {
    return "This matters because it expands the types of tasks the model can handle in real-world systems.";
  }

  return "This matters because it signals a meaningful change in capability, adoption, or research direction.";
}

function parseFeedItems(xml: string, defaultSource: string): Signal[] {
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const itemMatches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    itemMatches.push(match);
    if (itemMatches.length >= 12) {
      break;
    }
  }

  return itemMatches
    .map((itemMatch) => {
      const itemXml = itemMatch[1];
      const title = extractText(itemXml, "title");
      const link = extractText(itemXml, "link");
      const publishedAt = extractText(itemXml, "pubDate") || extractText(itemXml, "dc:date") || "Fresh signal";
      const summary = extractText(itemXml, "description") || extractText(itemXml, "content:encoded") || "AI signal worth watching.";
      const shortSummary = summary.replace(/\s+/g, " ").trim();
      const cleanedTitle = (title || "AI signal").replace(/\s+/g, " ").trim();

      const detectedTag = classifySignal(cleanedTitle, shortSummary, defaultSource);

      return {
        title: cleanedTitle,
        summary: shortSummary.slice(0, 180) || "AI signal worth watching.",
        source: defaultSource,
        url: link || "https://arxiv.org",
        publishedAt,
        tag: detectedTag,
        whyItMatters: makeWhyItMatters(cleanedTitle, shortSummary),
        relatedLinks: getRelatedLinks(cleanedTitle, shortSummary),
      };
    })
    .filter((item) => {
      const text = `${item.title} ${item.summary}`.toLowerCase();
      const score = scoreSignal(item.title, item.summary, item.source);
      const hasSignalTerms = HIGH_SIGNAL_KEYWORDS.some((keyword) => text.includes(keyword));
      return score >= 4 && hasSignalTerms;
    });
}

async function fetchFreshSignals(): Promise<Signal[]> {
  const feedResults = await Promise.all(
    FEEDS.map(async (feedUrl) => {
      try {
        const response = await fetch(feedUrl, { next: { revalidate: 1800 } });
        if (!response.ok) return [];

        const xml = await response.text();
        return parseFeedItems(
          xml,
          feedUrl.includes("arxiv") ? "ArXiv" : feedUrl.includes("hn") ? "Hacker News" : "Industry News"
        );
      } catch {
        return [];
      }
    })
  );

  const gathered = feedResults.flat();
  const uniqueSignals = gathered
    .filter((item, index, arr) => {
      const key = `${item.title}-${item.source}`;
      return arr.findIndex((entry) => `${entry.title}-${entry.source}` === key) === index;
    })
    .map((item) => ({
      ...item,
      _score: scoreSignal(item.title, item.summary, item.source),
      _tag: classifySignal(item.title, item.summary, item.source),
    }));

  const grouped = {
    Paper: uniqueSignals.filter((item) => item._tag === "Paper").sort((a, b) => (b as any)._score - (a as any)._score).slice(0, 5),
    Product: uniqueSignals.filter((item) => item._tag === "Product").sort((a, b) => (b as any)._score - (a as any)._score).slice(0, 2),
    "Open Source": uniqueSignals.filter((item) => item._tag === "Open Source").sort((a, b) => (b as any)._score - (a as any)._score).slice(0, 2),
    Industry: uniqueSignals.filter((item) => item._tag === "Industry").sort((a, b) => (b as any)._score - (a as any)._score).slice(0, 2),
  };

  const mixedSignals = [
    ...(grouped.Paper || []),
    ...(grouped.Product || []),
    ...(grouped["Open Source"] || []),
    ...(grouped.Industry || []),
  ]
    .slice(0, 8)
    .map(({ _score, _tag, ...item }) => item as Signal);

  return mixedSignals.length ? mixedSignals : FALLBACK_SIGNALS;
}

export async function getSignals(forceRefresh = false): Promise<Signal[]> {
  const cachedNews = getCachedNews();

  if (!forceRefresh && cachedNews && Date.now() - new Date(cachedNews.fetchedAt).getTime() < DAILY_REFRESH_MS) {
    return cachedNews.signals;
  }

  const freshSignals = await fetchFreshSignals();
  const payload: CachedNews = {
    signals: freshSignals,
    fetchedAt: new Date().toISOString(),
  };

  setCachedNews(payload);
  return freshSignals;
}
