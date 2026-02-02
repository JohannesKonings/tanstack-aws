import type { StreamChunk, UIMessage } from '@tanstack/ai';
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronDown, ChevronRight, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';
import GuitarRecommendation from '#src/webapp/components/example-GuitarRecommendation';
import { DAILY_LIMIT_USD } from '#src/webapp/lib/bedrock-budget';
import './tanchat.css';

type RunLogEntry = {
  model: string;
  timestamp: number;
  finishReason?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
};

// Match "Image: /path" or "**Image:** /path" (markdown) so we render actual <img> instead of path text
const IMAGE_PATH_REGEX =
  /\*{0,2}Image:\*{0,2}\s*(\/(?:images|assets)\/[^\s\n]+\.(?:jpg|jpeg|png|gif|webp|svg))/gi;

function TextWithInlineImages({ content }: { content: string }) {
  const parts: Array<{ type: 'text'; value: string } | { type: 'image'; src: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(IMAGE_PATH_REGEX.source, 'gi');
  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'image',
      src: match[1] ?? match[0].replace(/^\*{0,2}Image:\*{0,2}\s*/i, '').trim(),
    });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }
  if (parts.length === 0) {
    return <Streamdown>{content}</Streamdown>;
  }
  return (
    <>
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <Streamdown key={i}>{part.value}</Streamdown>
        ) : (
          <img
            key={i}
            src={part.src}
            alt=""
            className="block w-full max-w-xs max-h-40 object-cover rounded-lg my-2 border border-gray-700/50"
          />
        ),
      )}
    </>
  );
}

function InitalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-3xl mx-auto w-full">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-orange-500 to-red-600 text-transparent bg-clip-text uppercase">
          <span className="text-white">TanStack</span> Chat <span className="text-gray-400 text-4xl font-normal normal-case">with Bedrock</span>
        </h1>
        <p className="text-gray-400 mb-6 w-2/3 mx-auto text-lg">
          You can ask me about anything, I might or might not have a good answer, but you can still
          ask.
        </p>
        {children}
      </div>
    </div>
  );
}

function ChattingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm border-t border-orange-500/10 z-10">
      <div className="max-w-3xl mx-auto w-full px-4 py-3">{children}</div>
    </div>
  );
}

function Messages({ messages }: { messages: Array<UIMessage> }) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (!messages.length) {
    return null;
  }

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto pb-4 min-h-0">
      <div className="max-w-3xl mx-auto w-full px-4">
        {messages.map(({ id, role, parts }) => (
          <div
            key={id}
            className={`p-4 ${
              role === 'assistant'
                ? 'bg-gradient-to-r from-orange-500/5 to-red-600/5'
                : 'bg-transparent'
            }`}
          >
            <div className="flex items-start gap-4 max-w-3xl mx-auto w-full">
              {role === 'assistant' ? (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 mt-2 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                  AI
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                  Y
                </div>
              )}
              <div className="flex-1">
                {parts.map((part, index) => {
                  if (part.type === 'text') {
                    return (
                      <div
                        className="flex-1 min-w-0 prose dark:prose-invert max-w-none prose-sm"
                        key={index}
                      >
                        <TextWithInlineImages content={part.content} />
                      </div>
                    );
                  }
                  // Tool-call with output (set by client-side processor)
                  if (
                    part.type === 'tool-call' &&
                    part.name === 'recommendGuitar' &&
                    part.output != null &&
                    (part.output as { id?: string })?.id
                  ) {
                    return (
                      <div key={index} className="max-w-[80%] mx-auto">
                        <GuitarRecommendation id={(part.output as { id: string }).id} />
                      </div>
                    );
                  }
                  // Tool-result: TanStack AI server sends results as tool-result parts
                  if (part.type === 'tool-result') {
                    const toolCall = parts.find(
                      (p): p is Extract<typeof p, { type: 'tool-call' }> =>
                        p.type === 'tool-call' && p.id === part.toolCallId,
                    );
                    if (toolCall?.name === 'recommendGuitar') {
                      try {
                        const parsed = JSON.parse(part.content) as { id?: string };
                        if (parsed?.id) {
                          return (
                            <div key={index} className="max-w-[80%] mx-auto">
                              <GuitarRecommendation id={parsed.id} />
                            </div>
                          );
                        }
                      } catch {
                        // ignore invalid JSON
                      }
                    }
                    // getGuitars: don't render tool result as cards; images show inline in the AI's text list via TextWithInlineImages
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RunLogPanel({
  entries,
  usedTodayUsd,
  limitUsd,
  budgetError,
  budgetLoading,
  onRetryBudget,
}: {
  entries: RunLogEntry[];
  usedTodayUsd?: number;
  limitUsd: number;
  budgetError?: string;
  budgetLoading?: boolean;
  onRetryBudget?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasEntries = entries.length > 0;
  const usedLabel =
    usedTodayUsd != null && Number.isFinite(limitUsd)
      ? `Used today: $${Number(usedTodayUsd).toFixed(2)} / $${Number(limitUsd).toFixed(2)}`
      : null;
  const showPanel =
    hasEntries ||
    usedLabel != null ||
    budgetError != null ||
    budgetLoading === true;
  if (!showPanel) return null;
  return (
    <div className="border-t border-orange-500/10 bg-gray-900/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span>Run log</span>
        <span className="text-gray-500">({entries.length})</span>
        {budgetLoading && (
          <span className="ml-2 text-gray-500">Checking budget...</span>
        )}
        {usedLabel != null && !budgetLoading && (
          <span className="ml-2 text-amber-500/90">{usedLabel}</span>
        )}
        {budgetError != null && usedLabel == null && !budgetLoading && (
          <span className="ml-2 text-amber-600/80">Budget unavailable</span>
        )}
      </button>
      {open && (
        <div className="max-h-48 overflow-y-auto px-4 pb-3">
          {budgetLoading && (
            <p className="mb-2 text-xs text-gray-500">Checking budget...</p>
          )}
          {usedLabel != null && !budgetLoading && (
            <p className="mb-2 text-xs text-amber-500/90">{usedLabel}</p>
          )}
          {budgetError != null && (
            <p className="mb-2 text-xs text-amber-600/90">
              Budget metric: {budgetError}
              {onRetryBudget != null && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetryBudget();
                    }}
                    className="text-orange-500 hover:underline"
                  >
                    Retry
                  </button>
                </>
              )}
            </p>
          )}
          <ul className="space-y-2 text-xs">
            {entries.map((entry, i) => (
              <li
                key={`${entry.timestamp}-${i}`}
                className="rounded border border-orange-500/10 bg-gray-800/50 p-2 font-mono"
              >
                <div className="text-gray-400">
                  <span className="text-orange-500/90">{entry.model}</span>
                  <span className="ml-2">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  {entry.finishReason != null && (
                    <span className="ml-2 text-gray-500">
                      finish: {entry.finishReason}
                    </span>
                  )}
                </div>
                {entry.usage != null && (
                  <div className="mt-1 text-gray-500">
                    input: {entry.usage.promptTokens} · output:{' '}
                    {entry.usage.completionTokens} · total:{' '}
                    {entry.usage.totalTokens}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type BudgetState = {
  overBudget: boolean;
  estimatedCost?: number;
  limit: number;
  loading: boolean;
  error?: string;
};

function ChatPage() {
  const [runLog, setRunLog] = useState<RunLogEntry[]>([]);
  const [budget, setBudget] = useState<BudgetState>({
    overBudget: false,
    limit: DAILY_LIMIT_USD,
    loading: true,
  });

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchBudget = useCallback(async () => {
    const BUDGET_TIMEOUT_MS = 20_000;
    setBudget((prev) => ({ ...prev, loading: true, error: undefined }));
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      BUDGET_TIMEOUT_MS,
    );

    try {
      const res = await fetch('/demo/api/bedrock-budget', {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(res.status === 0 ? 'Budget request timed out (20s)' : `Budget request failed: ${res.status}`);
      }
      const data = (await res.json()) as {
        overBudget?: boolean;
        estimatedCost?: number;
        limit?: number;
        error?: string;
      };
      const rawCost = Number(data.estimatedCost);
      const rawLimit = Number(data.limit);
      const next: BudgetState = {
        overBudget: data.overBudget ?? false,
        estimatedCost: Number.isFinite(rawCost) ? rawCost : 0,
        limit: Number.isFinite(rawLimit) ? rawLimit : DAILY_LIMIT_USD,
        loading: false,
        error: data.error,
      };
      if (!mountedRef.current) return;
      setBudget(next);
    } catch (err) {
      clearTimeout(timeoutId);
      if (!mountedRef.current) return;
      const message =
        err instanceof Error
          ? err.name === 'AbortError'
            ? 'Budget request timed out (20s)'
            : err.message
          : String(err);
      setBudget({
        overBudget: false,
        estimatedCost: 0,
        limit: DAILY_LIMIT_USD,
        loading: false,
        error: message,
      });
    }
  }, []);

  useEffect(() => {
    void fetchBudget();
  }, [fetchBudget]);

  const onChunk = useCallback((chunk: StreamChunk) => {
    if (chunk.type === 'RUN_STARTED') {
      setRunLog((prev) => [
        ...prev,
        { model: chunk.model ?? 'unknown', timestamp: chunk.timestamp },
      ]);
    } else if (chunk.type === 'RUN_FINISHED') {
      setRunLog((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1]!;
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            finishReason: chunk.finishReason ?? undefined,
            usage: chunk.usage,
          },
        ];
      });
      void fetchBudget();
    }
  }, [fetchBudget]);

  const { messages, sendMessage, isLoading, error } = useChat({
    connection: fetchServerSentEvents('/demo/api/tanchat'),
    onChunk,
  });
  const [input, setInput] = useState('');

  const Layout = messages.length ? ChattingLayout : InitalLayout;

  return (
    <div className="relative flex h-[calc(100vh-80px)] flex-col bg-gray-900">
      <div className="flex min-h-0 flex-1 flex-col">
        {error && (
          <div className="mx-4 mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error.message}
          </div>
        )}
        {budget.overBudget && (
          <div className="mx-4 mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
            Budget is empty for the day. Daily limit (${budget.limit}) reached.
          </div>
        )}
        <Messages messages={messages} />
        {isLoading && (
          <div className="px-4 py-2 text-gray-400 text-sm">Thinking...</div>
        )}

        <Layout>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim() && !budget.overBudget) {
                sendMessage(input.trim());
                setInput('');
              }
            }}
          >
            <div className="relative max-w-xl mx-auto">
              {budget.loading && (
                <p className="mb-1 text-xs text-gray-500">
                  Checking budget...
                </p>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  budget.overBudget
                    ? 'Budget is empty for the day'
                    : 'Type something clever...'
                }
                disabled={budget.overBudget}
                className="w-full rounded-lg border border-orange-500/20 bg-gray-800/50 pl-4 pr-12 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent resize-none overflow-hidden shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '200px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !budget.overBudget) {
                      sendMessage(input.trim());
                      setInput('');
                    }
                  }
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || budget.overBudget}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-orange-500 hover:text-orange-400 disabled:text-gray-500 focus:outline-none"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </Layout>

        <RunLogPanel
          entries={runLog}
          usedTodayUsd={budget.estimatedCost}
          limitUsd={budget.limit}
          budgetError={budget.error}
          budgetLoading={budget.loading}
          onRetryBudget={fetchBudget}
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/demo/tanchat')({
  component: ChatPage,
});
