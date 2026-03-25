import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CanvasState, HistoryState } from '@/lib/types/canvas';

interface HistoryStore extends HistoryState {
  // History actions
  pushState: (state: CanvasState) => void;
  undo: () => CanvasState | null;
  redo: () => CanvasState | null;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY_SIZE = 50;

export const useHistoryStore = create<HistoryStore>()(
  immer((set, get) => ({
    past: [],
    present: {
      entities: [],
      flows: [],
      selectedEntityId: null,
      selectedFlowId: null,
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    future: [],

    pushState: (state) => set((draft) => {
      // Add current present to past
      draft.past.push(draft.present);

      // Limit history size
      if (draft.past.length > MAX_HISTORY_SIZE) {
        draft.past.shift();
      }

      // Set new present and clear future
      draft.present = state;
      draft.future = [];
    }),

    undo: () => {
      const state = get();
      if (state.past.length === 0) return null;

      const previous = state.past[state.past.length - 1];

      set((draft) => {
        draft.future.unshift(draft.present);
        draft.present = previous;
        draft.past.pop();
      });

      return previous;
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0) return null;

      const next = state.future[0];

      set((draft) => {
        draft.past.push(draft.present);
        draft.present = next;
        draft.future.shift();
      });

      return next;
    },

    clear: () => set((draft) => {
      draft.past = [];
      draft.future = [];
    }),

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  }))
);
