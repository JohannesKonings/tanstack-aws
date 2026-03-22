import { useStore } from '@tanstack/react-store';
import { ChevronRight, X } from 'lucide-react';
import { lazy, Suspense, useCallback } from 'react';
import { showAIAssistant } from './ai-assistant-store';

const loadAIAssistantPanel = () => import('./example-AIAssistant');
const AIAssistantPanel = lazy(loadAIAssistantPanel);

function LoadingPanel() {
  return (
    <div className="absolute bottom-0 left-full ml-2 w-[700px] h-[600px] bg-gray-900 rounded-lg shadow-xl border border-orange-500/20 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-orange-500/20">
        <h3 className="font-semibold text-white">AI Assistant</h3>
        <button
          onClick={() => showAIAssistant.setState(() => false)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Close AI assistant"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Loading AI assistant...
      </div>
    </div>
  );
}

export default function LazyAIAssistant() {
  const isOpen = useStore(showAIAssistant, (state: boolean) => state);

  const preloadPanel = useCallback(() => {
    void loadAIAssistantPanel();
  }, []);

  return (
    <div className="relative z-50">
      <button
        onMouseEnter={preloadPanel}
        onFocus={preloadPanel}
        onClick={() => showAIAssistant.setState((state) => !state)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-xs font-medium">
            AI
          </div>
          <span className="font-medium">AI Assistant</span>
        </div>
        <ChevronRight className="w-4 h-4" />
      </button>

      {isOpen ? (
        <Suspense fallback={<LoadingPanel />}>
          <AIAssistantPanel />
        </Suspense>
      ) : null}
    </div>
  );
}
