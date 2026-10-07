import { CaretRightIcon, PaperPlaneRightIcon, XIcon } from '@phosphor-icons/react';
import type { UIMessage } from '@tanstack/ai';
import { fetchServerSentEvents, useChat } from '@tanstack/ai-react';
import { useStore } from '@tanstack/react-store';
import { Store } from '@tanstack/store';
import { useEffect, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';
import { Badge } from '#apps/webapp/components/ui/badge';
import { Button } from '#apps/webapp/components/ui/button';
import { Card } from '#apps/webapp/components/ui/card';
import GuitarRecommendation from './example-GuitarRecommendation';

export const showAIAssistant = new Store(false);

function Messages({ messages }: { messages: Array<UIMessage> }) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (!messages.length) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
        Ask me anything! I'm here to help.
      </div>
    );
  }

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
      {messages.map(({ id, role, parts }) => (
        <div
          key={id}
          className={`py-3 ${role === 'assistant' ? 'bg-accent-warm/5' : 'bg-transparent'}`}
        >
          {parts.map((part, index) => {
            if (part.type === 'text') {
              return (
                <div key={index} className="flex items-start gap-2 px-4">
                  {role === 'assistant' ? (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-accent-warm to-ds-terracotta-400 text-xs font-medium text-white">
                      AI
                    </div>
                  ) : (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-background-subtle text-xs font-medium text-text-primary">
                      Y
                    </div>
                  )}
                  <div className="prose dark:prose-invert prose-sm max-w-none min-w-0 flex-1 text-text-primary">
                    <Streamdown>{part.content}</Streamdown>
                  </div>
                </div>
              );
            }
            if (
              part.type === 'tool-call' &&
              part.name === 'recommendGuitar' &&
              part.output != null &&
              (part.output as { id?: string })?.id
            ) {
              return (
                <div key={index} className="mx-auto max-w-[80%]">
                  <GuitarRecommendation id={(part.output as { id: string }).id} />
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}
    </div>
  );
}

export default function AIAssistant() {
  const isOpen = useStore(showAIAssistant, (state: boolean) => state);
  const { messages, sendMessage } = useChat({
    connection: fetchServerSentEvents('/demo/api/tanchat'),
  });
  const [input, setInput] = useState('');

  return (
    <div className="relative z-50">
      <Button
        type="button"
        variant="gradient"
        color="orange"
        className="w-full justify-between"
        onClick={() => showAIAssistant.setState((state) => !state)}
      >
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded-lg bg-white/20 text-xs font-medium">
            AI
          </div>
          <span className="font-medium">AI Assistant</span>
        </div>
        <CaretRightIcon className="size-4" />
      </Button>

      {isOpen && (
        <Card className="absolute bottom-0 left-full ml-2 flex h-[600px] w-[700px] flex-col border-border-default shadow-xl">
          <div className="flex items-center justify-between border-b border-border-default p-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary">AI Assistant</h3>
              <Badge variant="orange">TanStack AI</Badge>
            </div>
            <Button
              type="button"
              variant="icon"
              color="gray"
              size="icon-sm"
              aria-label="Close AI assistant"
              onClick={() => showAIAssistant.setState((state) => !state)}
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          <Messages messages={messages} />

          <div className="border-t border-border-default p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) {
                  sendMessage(input.trim());
                  setInput('');
                }
              }}
            >
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full resize-none overflow-hidden rounded-lg border border-border-default bg-background-subtle py-2 pl-3 pr-10 text-sm text-text-primary placeholder-text-muted focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-border-focus"
                  rows={1}
                  style={{ minHeight: '36px', maxHeight: '120px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim()) {
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
                  disabled={!input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <PaperPlaneRightIcon className="size-4" />
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
