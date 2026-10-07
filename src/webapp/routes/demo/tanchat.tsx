import { CaretDownIcon, CaretRightIcon, PaperPlaneRightIcon } from '@phosphor-icons/react';
import type { AGUIEvent, UIMessage } from '@tanstack/ai';
import { fetchServerSentEvents, useChat } from '@tanstack/ai-react';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';
import GuitarRecommendation from '#src/webapp/components/example-GuitarRecommendation';
import { Badge } from '#src/webapp/components/ui/badge';
import { Button } from '#src/webapp/components/ui/button';
import { Card } from '#src/webapp/components/ui/card';
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
            className="my-2 block max-h-40 w-full max-w-xs rounded-lg border border-border-default object-cover"
          />
        ),
      )}
    </>
  );
}

function InitalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="mx-auto w-full max-w-3xl text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <h1 className="text-6xl font-bold uppercase">
            <span className="text-text-primary">TanStack</span> Chat
          </h1>
          <Badge variant="orange">TanStack AI</Badge>
        </div>
        <p className="mx-auto mb-6 w-2/3 text-lg text-text-muted">
          You can ask me about anything, I might or might not have a good answer, but you can still
          ask.
        </p>
        <p className="mb-6 text-4xl font-normal text-text-secondary normal-case">with Bedrock</p>
        {children}
      </div>
    </div>
  );
}

function ChattingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-10 border-t border-border-default bg-background-surface/80 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-3xl px-4 py-3">{children}</div>
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
            className={`p-4 ${role === 'assistant' ? 'bg-accent-warm/5' : 'bg-transparent'}`}
          >
            <div className="flex items-start gap-4 max-w-3xl mx-auto w-full">
              {role === 'assistant' ? (
                <div className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-accent-warm to-ds-terracotta-400 text-sm font-medium text-white">
                  AI
                </div>
              ) : (
                <div className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-subtle text-sm font-medium text-text-primary">
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
    hasEntries || usedLabel != null || budgetError != null || budgetLoading === true;
  if (!showPanel) return null;
  return (
    <div className="border-t border-border-default bg-background-subtle/60">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        className="w-full justify-start rounded-none px-4 py-2 text-sm text-text-muted"
        aria-expanded={open}
      >
        {open ? (
          <CaretDownIcon className="size-4 shrink-0" />
        ) : (
          <CaretRightIcon className="size-4 shrink-0" />
        )}
        <span>Run log</span>
        <span className="text-text-muted">({entries.length})</span>
        {budgetLoading && <span className="ml-2 text-text-muted">Checking budget...</span>}
        {usedLabel != null && !budgetLoading && (
          <Badge variant="warning" className="ml-2">
            {usedLabel}
          </Badge>
        )}
        {budgetError != null && usedLabel == null && !budgetLoading && (
          <Badge variant="warning" className="ml-2">
            Budget unavailable
          </Badge>
        )}
      </Button>
      {open && (
        <div className="max-h-48 overflow-y-auto px-4 pb-3">
          {budgetLoading && <p className="mb-2 text-xs text-text-muted">Checking budget...</p>}
          {usedLabel != null && !budgetLoading && (
            <p className="mb-2 text-xs text-text-warning">{usedLabel}</p>
          )}
          {budgetError != null && (
            <p className="mb-2 text-xs text-text-warning">
              Budget metric: {budgetError}
              {onRetryBudget != null && (
                <>
                  {' '}
                  <Button
                    type="button"
                    variant="link"
                    color="orange"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetryBudget();
                    }}
                  >
                    Retry
                  </Button>
                </>
              )}
            </p>
          )}
          <ul className="space-y-2 text-xs">
            {entries.map((entry, i) => (
              <li key={`${entry.timestamp}-${i}`}>
                <Card className="p-2 font-mono">
                  <div className="text-text-muted">
                    <span className="text-accent-warm">{entry.model}</span>
                    <span className="ml-2">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    {entry.finishReason != null && (
                      <span className="ml-2 text-text-muted">finish: {entry.finishReason}</span>
                    )}
                  </div>
                  {entry.usage != null && (
                    <div className="mt-1 text-text-muted">
                      input: {entry.usage.promptTokens} · output: {entry.usage.completionTokens} ·
                      total: {entry.usage.totalTokens}
                    </div>
                  )}
                </Card>
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

const BUDGET_TIMEOUT_MS = 20_000;

async function requestBudget(): Promise<BudgetState> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BUDGET_TIMEOUT_MS);

  try {
    const res = await fetch('/demo/api/bedrock-budget', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(
        res.status === 0
          ? 'Budget request timed out (20s)'
          : `Budget request failed: ${res.status}`,
      );
    }
    const data = (await res.json()) as {
      overBudget?: boolean;
      estimatedCost?: number;
      limit?: number;
      error?: string;
    };
    const rawCost = Number(data.estimatedCost);
    const rawLimit = Number(data.limit);
    return {
      overBudget: data.overBudget ?? false,
      estimatedCost: Number.isFinite(rawCost) ? rawCost : 0,
      limit: Number.isFinite(rawLimit) ? rawLimit : DAILY_LIMIT_USD,
      loading: false,
      error: data.error,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const message =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Budget request timed out (20s)'
          : err.message
        : String(err);
    return {
      overBudget: false,
      estimatedCost: 0,
      limit: DAILY_LIMIT_USD,
      loading: false,
      error: message,
    };
  }
}

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

  const fetchBudget = useCallback(async (options?: { showLoading?: boolean }) => {
    if (options?.showLoading) {
      setBudget((prev) => ({ ...prev, loading: true, error: undefined }));
    }
    const next = await requestBudget();
    if (!mountedRef.current) return;
    setBudget(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void requestBudget().then((next) => {
      if (!cancelled) {
        setBudget(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onChunk = useCallback(
    (chunk: AGUIEvent) => {
      if (chunk.type === 'RUN_STARTED') {
        setRunLog((prev) => [
          ...prev,
          { model: chunk.model ?? 'unknown', timestamp: chunk.timestamp ?? Date.now() },
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
        void fetchBudget({ showLoading: true });
      }
    },
    [fetchBudget],
  );

  const { messages, sendMessage, isLoading, error } = useChat({
    connection: fetchServerSentEvents('/demo/api/tanchat'),
    onChunk,
  });
  const [input, setInput] = useState('');

  const Layout = messages.length ? ChattingLayout : InitalLayout;

  return (
    <div className="relative flex h-[calc(100vh-80px)] flex-col bg-background-default">
      <div className="flex min-h-0 flex-1 flex-col">
        {error && (
          <Card className="mx-4 mt-2 border-status-error/30 bg-status-error-bg p-3 text-sm text-text-error">
            {error.message}
          </Card>
        )}
        {budget.overBudget && (
          <Card className="mx-4 mt-2 border-status-warning/30 bg-status-warning-bg p-3 text-sm text-text-warning">
            Budget is empty for the day. Daily limit (${budget.limit}) reached.
          </Card>
        )}
        <Messages messages={messages} />
        {isLoading && <div className="px-4 py-2 text-sm text-text-muted">Thinking...</div>}

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
            <div className="relative mx-auto max-w-xl">
              {budget.loading && <p className="mb-1 text-xs text-text-muted">Checking budget...</p>}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  budget.overBudget ? 'Budget is empty for the day' : 'Type something clever...'
                }
                disabled={budget.overBudget}
                className="w-full resize-none overflow-hidden rounded-lg border border-border-default bg-background-subtle py-3 pl-4 pr-12 text-sm text-text-primary shadow-lg placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
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
              <Button
                type="submit"
                variant="icon"
                color="orange"
                size="icon-sm"
                disabled={!input.trim() || budget.overBudget}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <PaperPlaneRightIcon className="size-4" />
              </Button>
            </div>
          </form>
        </Layout>

        <RunLogPanel
          entries={runLog}
          usedTodayUsd={budget.estimatedCost}
          limitUsd={budget.limit}
          budgetError={budget.error}
          budgetLoading={budget.loading}
          onRetryBudget={() => void fetchBudget({ showLoading: true })}
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/demo/tanchat')({
  component: ChatPage,
});
