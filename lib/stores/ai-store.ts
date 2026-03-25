import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AIMessage } from '@/lib/types/canvas';

interface AIStore {
  messages: AIMessage[];
  isProcessing: boolean;
  isPanelOpen: boolean;

  // Message actions
  addMessage: (message: Omit<AIMessage, 'timestamp'>) => void;
  clearMessages: () => void;

  // UI state
  setProcessing: (isProcessing: boolean) => void;
  setPanelOpen: (isOpen: boolean) => void;
  togglePanel: () => void;
}

export const useAIStore = create<AIStore>()(
  immer((set) => ({
    messages: [
      {
        role: 'assistant',
        content: 'Hello! I\'m the Business Guru. I can help you design and analyze business ecosystems. Try asking me to generate a business model for any company, or ask strategic questions about your canvas.',
        timestamp: Date.now(),
      },
    ],
    isProcessing: false,
    isPanelOpen: false,

    addMessage: (message) => set((state) => {
      state.messages.push({
        ...message,
        timestamp: Date.now(),
      });
    }),

    clearMessages: () => set((state) => {
      state.messages = [];
    }),

    setProcessing: (isProcessing) => set((state) => {
      state.isProcessing = isProcessing;
    }),

    setPanelOpen: (isOpen) => set((state) => {
      state.isPanelOpen = isOpen;
    }),

    togglePanel: () => set((state) => {
      state.isPanelOpen = !state.isPanelOpen;
    }),
  }))
);
