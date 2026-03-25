import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Message } from '@/lib/types/canvas';

interface AIStore {
  messages: Message[];
  isProcessing: boolean;
  isPanelOpen: boolean;

  // Message actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
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
        id: '1',
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
        id: Date.now().toString(),
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
