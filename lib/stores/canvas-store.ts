import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Entity, ValueFlow, CanvasState } from '@/lib/types/canvas';

interface CanvasStore extends CanvasState {
  // Entity actions
  addEntity: (entity: Omit<Entity, 'id'>) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;
  setSelectedEntity: (id: string | null) => void;

  // Flow actions
  addFlow: (flow: Omit<ValueFlow, 'id'>) => void;
  updateFlow: (id: string, updates: Partial<ValueFlow>) => void;
  deleteFlow: (id: string) => void;
  setSelectedFlow: (id: string | null) => void;

  // Viewport actions
  setViewport: (viewport: Partial<CanvasState['viewport']>) => void;

  // Utility actions
  reset: () => void;
  loadState: (state: Partial<CanvasState>) => void;
}

const initialState: CanvasState = {
  entities: [
    {
      id: 'default-org',
      type: 'organization',
      name: 'Your Organization',
      description: 'Your company or organization',
      position: { x: 400, y: 300 },
    },
    {
      id: 'default-customer',
      type: 'customer',
      name: 'Primary Customers',
      description: 'Your target customer segment',
      position: { x: 700, y: 300 },
    },
    {
      id: 'default-supplier',
      type: 'supplier',
      name: 'Strategic Suppliers',
      description: 'Key suppliers providing resources',
      position: { x: 100, y: 300 },
    },
  ],
  flows: [
    {
      id: 'default-flow-1',
      source: 'default-org',
      target: 'default-customer',
      type: 'product',
      label: 'Products/Services',
    },
    {
      id: 'default-flow-2',
      source: 'default-customer',
      target: 'default-org',
      type: 'money',
      label: 'Revenue',
    },
    {
      id: 'default-flow-3',
      source: 'default-supplier',
      target: 'default-org',
      type: 'resource',
      label: 'Raw Materials',
    },
  ],
  selectedEntityId: null,
  selectedFlowId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
};

let entityCounter = 0;
let flowCounter = 0;

export const useCanvasStore = create<CanvasStore>()(
  immer((set) => ({
    ...initialState,

    addEntity: (entity) => set((state) => {
      const newEntity: Entity = {
        ...entity,
        id: `entity-${Date.now()}-${entityCounter++}`,
      };
      state.entities.push(newEntity);
    }),

    updateEntity: (id, updates) => set((state) => {
      const index = state.entities.findIndex((e) => e.id === id);
      if (index !== -1) {
        state.entities[index] = { ...state.entities[index], ...updates };
      }
    }),

    deleteEntity: (id) => set((state) => {
      state.entities = state.entities.filter((e) => e.id !== id);
      // Also delete flows connected to this entity
      state.flows = state.flows.filter((f) => f.source !== id && f.target !== id);
      if (state.selectedEntityId === id) {
        state.selectedEntityId = null;
      }
    }),

    setSelectedEntity: (id) => set((state) => {
      state.selectedEntityId = id;
      state.selectedFlowId = null; // Deselect flow when selecting entity
    }),

    addFlow: (flow) => set((state) => {
      const newFlow: ValueFlow = {
        ...flow,
        id: `flow-${Date.now()}-${flowCounter++}`,
      };
      state.flows.push(newFlow);
    }),

    updateFlow: (id, updates) => set((state) => {
      const index = state.flows.findIndex((f) => f.id === id);
      if (index !== -1) {
        state.flows[index] = { ...state.flows[index], ...updates };
      }
    }),

    deleteFlow: (id) => set((state) => {
      state.flows = state.flows.filter((f) => f.id !== id);
      if (state.selectedFlowId === id) {
        state.selectedFlowId = null;
      }
    }),

    setSelectedFlow: (id) => set((state) => {
      state.selectedFlowId = id;
      state.selectedEntityId = null; // Deselect entity when selecting flow
    }),

    setViewport: (viewport) => set((state) => {
      state.viewport = { ...state.viewport, ...viewport };
    }),

    reset: () => set(initialState),

    loadState: (newState) => set((state) => {
      Object.assign(state, newState);
    }),
  }))
);
