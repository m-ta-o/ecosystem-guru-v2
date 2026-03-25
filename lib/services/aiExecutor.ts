import { Entity, Flow, ENTITY_TYPES, FLOW_TYPES, EntityType, FlowType } from '@/lib/types/canvas';
import { AIAction } from './aiService';
import { findNonOverlappingPosition } from '@/lib/utils/smartPositioning';
import { getSemanticPosition } from '@/lib/utils/smartLayout';

export interface ExecuteActionsParams {
  actions: AIAction[];
  entities: Entity[];
  flows: Flow[];
  onUpdateEntities: (updater: (prev: Entity[]) => Entity[]) => void;
  onUpdateFlows: (updater: (prev: Flow[]) => Flow[]) => void;
}

/**
 * Execute AI-generated actions on the canvas
 */
export const executeAIActions = ({
  actions,
  entities,
  flows,
  onUpdateEntities,
  onUpdateFlows,
}: ExecuteActionsParams): string[] => {
  const messages: string[] = [];
  const newEntities: Entity[] = [];
  const newFlows: Flow[] = [];

  // First pass: collect entity data without positions
  const entityDataList: Omit<Entity, 'id' | 'x' | 'y'>[] = [];
  actions.forEach((action) => {
    if (action.type === 'create_entity') {
      const entityData = action.entity;
      entityDataList.push({
        ...entityData,
        width: entityData.width || 200,
        height: entityData.height || 120,
        components: entityData.components || [],
      } as Omit<Entity, 'id' | 'x' | 'y'>);
    }
  });

  // Group new entities by type for semantic positioning
  const entitiesByType = new Map<string, number>();
  entityDataList.forEach(data => {
    entitiesByType.set(data.type, (entitiesByType.get(data.type) || 0) + 1);
  });

  // Create entities with semantic positions
  const entityTypeIndices = new Map<string, number>();
  entityDataList.forEach((entityData) => {
    const typeIndex = entityTypeIndices.get(entityData.type) || 0;
    entityTypeIndices.set(entityData.type, typeIndex + 1);
    const totalOfType = entitiesByType.get(entityData.type) || 1;

    // Create temporary entity for position calculation
    const tempEntity: Entity = {
      ...entityData,
      id: 'temp',
      x: 0,
      y: 0,
    } as Entity;

    // Calculate semantic position
    const position = getSemanticPosition(tempEntity, typeIndex, totalOfType);

    const newEntity: Entity = {
      ...entityData,
      id: `${entityData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: position.x,
      y: position.y,
    } as Entity;

    newEntities.push(newEntity);
    messages.push(`Created: ${newEntity.name}`);
  });

  // Update entities
  if (newEntities.length > 0) {
    onUpdateEntities((prev) => [...prev, ...newEntities]);
  }

  // Second pass: create flows (after entities exist)
  actions.forEach((action) => {
    if (action.type === 'create_flow') {
      const flowData = action.flow;

      // Find source and target entities (including newly created ones)
      const allEntities = [...entities, ...newEntities];
      const sourceEntity = allEntities.find(
        (e) =>
          e.id === flowData.sourceId ||
          e.name.toLowerCase() === flowData.sourceId.toLowerCase() ||
          e.name.toLowerCase().replace(/\s+/g, '-') === flowData.sourceId
      );
      const targetEntity = allEntities.find(
        (e) =>
          e.id === flowData.targetId ||
          e.name.toLowerCase() === flowData.targetId.toLowerCase() ||
          e.name.toLowerCase().replace(/\s+/g, '-') === flowData.targetId
      );

      if (sourceEntity && targetEntity) {
        const newFlow: Flow = {
          ...flowData,
          id: `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sourceId: sourceEntity.id,
          targetId: targetEntity.id,
          value: flowData.value || undefined,
          valueDescription: flowData.valueDescription || undefined,
        };

        newFlows.push(newFlow);
        messages.push(`Flow: ${sourceEntity.name} → ${targetEntity.name}`);
      } else {
        messages.push(
          `⚠️ Couldn't create flow: ${flowData.sourceId} → ${flowData.targetId} (entity not found)`
        );
      }
    }
  });

  // Update flows
  if (newFlows.length > 0) {
    onUpdateFlows((prev) => [...prev, ...newFlows]);
  }

  // Handle other action types
  actions.forEach((action) => {
    if (action.type === 'update_entity') {
      onUpdateEntities((prev) =>
        prev.map((e) =>
          e.id === action.entityId ? { ...e, ...action.updates } : e
        )
      );
      messages.push(`Updated entity`);
    } else if (action.type === 'update_flow') {
      let updated = false;
      onUpdateFlows((prev) => {
        const newFlows = prev.map((f) => {
          // Try to match by ID first
          if (f.id === action.flowId) {
            updated = true;
            return { ...f, ...action.updates };
          }
          // Try to match by label if ID doesn't match
          if (f.label && action.flowId && f.label.toLowerCase().includes(action.flowId.toLowerCase())) {
            updated = true;
            return { ...f, ...action.updates };
          }
          return f;
        });
        return newFlows;
      });

      if (updated) {
        messages.push(`Updated: ${action.flowId}`);
      } else {
        console.warn(`Could not find flow to update: ${action.flowId}`);
        messages.push(`⚠️ Could not find flow: ${action.flowId}`);
      }
    } else if (action.type === 'delete_entity') {
      onUpdateEntities((prev) => prev.filter((e) => e.id !== action.entityId));
      onUpdateFlows((prev) =>
        prev.filter(
          (f) => f.sourceId !== action.entityId && f.targetId !== action.entityId
        )
      );
      messages.push(`Deleted entity`);
    } else if (action.type === 'message') {
      messages.push(action.content);
    }
  });

  return messages;
};

/**
 * Parse AI response and extract actions
 */
export const parseAIResponse = (response: string): {
  actions: AIAction[];
  rawMessage?: string;
} => {
  try {
    let jsonString: string | null = null;

    // Try to extract JSON from markdown code blocks first
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    } else {
      // Try to find JSON without code blocks
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
    }

    if (jsonString) {
      console.log('🔍 Attempting to parse JSON, length:', jsonString.length);
      console.log('🔍 JSON content:', jsonString);
      const data = JSON.parse(jsonString);

      const actions: AIAction[] = [];

      // Handle direct actions array format (from chat mode)
      if (data.actions && Array.isArray(data.actions)) {
        data.actions.forEach((action: any) => {
          if (action.type === 'update_flow') {
            actions.push({
              type: 'update_flow',
              flowId: action.flowId,
              updates: action.updates
            });
          } else if (action.type === 'update_entity') {
            actions.push({
              type: 'update_entity',
              entityId: action.entityId,
              updates: action.updates
            });
          } else if (action.type === 'create_entity') {
            actions.push({
              type: 'create_entity',
              entity: action.entity
            });
          } else if (action.type === 'create_flow') {
            actions.push({
              type: 'create_flow',
              flow: action.flow
            });
          }
        });

        // If there's a message, add it as an action
        if (data.message) {
          actions.push({
            type: 'message',
            content: data.message
          });
        }

        return { actions };
      }

      // Handle ecosystem generation format
      if (data.entities && Array.isArray(data.entities)) {
        data.entities.forEach((entity: any) => {
          actions.push({
            type: 'create_entity',
            entity: {
              name: entity.name,
              type: entity.type,
              description: entity.description || '',
              x: entity.x || 400,
              y: entity.y || 300,
              width: entity.width || 200,
              height: entity.height || 120,
              color: entity.color || ENTITY_TYPES[entity.type as EntityType]?.color || '#3B82F6',
              components: entity.components || [],
            },
          });
        });
      }

      if (data.flows && Array.isArray(data.flows)) {
        data.flows.forEach((flow: any) => {
          actions.push({
            type: 'create_flow',
            flow: {
              sourceId: flow.sourceId,
              targetId: flow.targetId,
              type: flow.type,
              label: flow.label,
              color: flow.color || FLOW_TYPES[flow.type as FlowType]?.color || '#3B82F6',
              value: flow.value,
              valueDescription: flow.valueDescription,
            },
          });
        });
      }

      // Handle suggestions format
      if (data.suggestions && Array.isArray(data.suggestions)) {
        data.suggestions.forEach((suggestion: any) => {
          if (suggestion.entity) {
            actions.push({
              type: 'create_entity',
              entity: suggestion.entity,
            });
          }
          if (suggestion.flow) {
            actions.push({
              type: 'create_flow',
              flow: suggestion.flow,
            });
          }
        });
      }

      return { actions };
    }

    console.log('No JSON found in response');
  } catch (e) {
    console.error('Failed to parse AI response as JSON:', e);
    console.log('Response was:', response.substring(0, 500));
  }

  // If not JSON, treat as message
  return {
    actions: [],
    rawMessage: response,
  };
};
