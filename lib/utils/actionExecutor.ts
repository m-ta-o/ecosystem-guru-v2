import { Entity, Flow, EntityType, FlowType, ENTITY_TYPES, FLOW_TYPES } from '@/lib/types/canvas';
import { findNonOverlappingPosition, calculateOptimalSpacing } from './smartPositioning';
import { supabase } from '@/integrations/supabase/client';

export interface ActionExecutorContext {
  entities: Entity[];
  flows: Flow[];
  onAddEntity: (entity: Entity) => void;
  onUpdateEntity: (entity: Entity) => void;
  onDeleteEntity: (entityId: string) => void;
  onAddFlow: (flow: Flow) => void;
  onUpdateFlow: (flow: Flow) => void;
  onDeleteFlow: (flowId: string) => void;
  onApplyModel: (model: { entities: Entity[]; flows: Flow[] }) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  zoom?: number;
  pan?: { x: number; y: number };
}

export class ActionExecutor {
  private context: ActionExecutorContext;

  constructor(context: ActionExecutorContext) {
    this.context = context;
  }

  async executeAction(action: any): Promise<void> {
    console.log('Executing action:', action.type, action.data);

    switch (action.type) {
      case 'generate_business_model':
        await this.executeGenerateBusinessModel(action.data);
        break;
      case 'add_entity':
        await this.executeAddEntity(action.data);
        break;
      case 'delete_entity':
        await this.executeDeleteEntity(action.data);
        break;
      case 'add_flow':
        await this.executeAddFlow(action.data);
        break;
      case 'delete_flow':
        await this.executeDeleteFlow(action.data);
        break;
      case 'update_entity':
        await this.executeUpdateEntity(action.data);
        break;
      case 'update_flow':
        await this.executeUpdateFlow(action.data);
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  async executeActions(actions: any[]): Promise<void> {
    for (const action of actions) {
      await this.executeAction(action);
      // Small delay to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async executeGenerateBusinessModel(data: any): Promise<void> {
    if (!data?.company) return;

    const { data: modelData, error } = await supabase.functions.invoke('generate-business-model', {
      body: { company: data.company }
    });

    if (error) {
      console.error('Error from generate-business-model function:', error);
      throw error;
    }
    
    if (!modelData) {
        throw new Error('Failed to generate business model: no data returned.');
    }
    
    // Apply new model with smart positioning relative to existing entities
    setTimeout(() => {
      const optimizedNewModel = this.optimizeBusinessModelLayout(modelData, this.context.entities);

      const combinedModel = {
        entities: [...this.context.entities, ...optimizedNewModel.entities],
        flows: [...this.context.flows, ...optimizedNewModel.flows]
      };
      
      this.context.onApplyModel(combinedModel);

      // Generate AI financial values for the new model parts
      setTimeout(() => {
        this.generateFinancialValues(optimizedNewModel, data.company);
      }, 1000);
    }, 300);
  }

  private async executeAddEntity(data: any): Promise<void> {
    if (!data) return;

    const entityTypes = Object.keys(ENTITY_TYPES) as EntityType[];
    const validType = entityTypes.includes(data.type) ? data.type : 'organization';

    // Calculate position
    const position = this.calculateSmartPosition(data.x, data.y);

    const newEntity: Entity = {
      id: data.id || `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name || 'New Entity',
      type: validType,
      description: data.description || `${validType} entity`,
      x: position.x,
      y: position.y,
      width: data.width || 200,
      height: data.height || 100,
      color: data.color || ENTITY_TYPES[validType].color,
      components: Array.isArray(data.components) ? data.components : []
    };

    this.context.onAddEntity(newEntity);
  }

  private async executeDeleteEntity(data: any): Promise<void> {
    if (data?.id) {
      this.context.onDeleteEntity(data.id);
    }
  }

  private async executeAddFlow(data: any): Promise<void> {
    if (!data?.sourceId || !data?.targetId) return;

    const flowTypes = Object.keys(FLOW_TYPES) as FlowType[];
    const validType = flowTypes.includes(data.type) ? data.type : 'value';

    // Verify entities exist
    const sourceExists = this.context.entities.some(e => e.id === data.sourceId);
    const targetExists = this.context.entities.some(e => e.id === data.targetId);

    if (!sourceExists || !targetExists) {
      console.warn('Cannot create flow: source or target entity not found');
      return;
    }

    const newFlow: Flow = {
      id: data.id || `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceId: data.sourceId,
      targetId: data.targetId,
      type: validType,
      label: data.label || `${validType} flow`,
      color: data.color || FLOW_TYPES[validType].color,
      valueDescription: data.valueDescription,
      value: data.value,
      valueType: data.valueType,
      valueUnit: data.valueUnit,
      monthlyValue: data.monthlyValue,
      monthlyVolume: data.monthlyVolume
    };

    this.context.onAddFlow(newFlow);
  }

  private async executeDeleteFlow(data: any): Promise<void> {
    if (data?.id) {
      this.context.onDeleteFlow(data.id);
    }
  }

  private async executeUpdateEntity(data: any): Promise<void> {
    if (!data?.id) return;

    const existingEntity = this.context.entities.find(e => e.id === data.id);
    if (!existingEntity) return;

    const updatedEntity: Entity = {
      ...existingEntity,
      ...data
    };

    this.context.onUpdateEntity(updatedEntity);
  }

  private async executeUpdateFlow(data: any): Promise<void> {
    if (!data?.id) return;

    const existingFlow = this.context.flows.find(f => f.id === data.id);
    if (!existingFlow) return;

    const updatedFlow: Flow = {
      ...existingFlow,
      ...data
    };

    this.context.onUpdateFlow(updatedFlow);
  }

  private calculateSmartPosition(preferredX?: number, preferredY?: number): { x: number; y: number } {
    // Get current viewport center if no preferred position
    const containerWidth = this.context.containerRef?.current?.clientWidth || 1600;
    const containerHeight = this.context.containerRef?.current?.clientHeight || 1000;
    const zoom = this.context.zoom || 1;
    const pan = this.context.pan || { x: 0, y: 0 };

    const defaultX = preferredX || (-pan.x + containerWidth / 2) / zoom;
    const defaultY = preferredY || (-pan.y + containerHeight / 2) / zoom;

    return findNonOverlappingPosition(
      this.context.entities,
      defaultX,
      defaultY,
      200,
      100,
      containerWidth / zoom,
      containerHeight / zoom
    );
  }

  private positionEntitiesInCircle(modelData: { entities: Entity[]; flows: Flow[] }, offsetX = 0, offsetY = 0): { entities: Entity[]; flows: Flow[] } {
    const { entities, flows } = modelData;
    const optimizedEntities = entities.map((entity: any, index: number) => {
      if (entity.id === 'core' || entity.name.toLowerCase().includes('core')) {
        // Center the core entity
        return {
          ...entity,
          x: 700 + offsetX,
          y: 400 + offsetY
        };
      }

      // Position other entities in optimized circle
      const spacing = calculateOptimalSpacing(entities.length);
      const angle = (index * (2 * Math.PI)) / (entities.length - 1);
      
      return {
        ...entity,
        x: 700 + offsetX + Math.cos(angle) * spacing,
        y: 400 + offsetY + Math.sin(angle) * spacing
      };
    });

    return {
      entities: optimizedEntities,
      flows: flows
    };
  }

  private positionGroup(group: Entity[], position: 'top' | 'left' | 'right' | 'bottom', centerX: number, centerY: number): void {
    if (group.length === 0) return;

    const entityPadding = { horizontal: 100, vertical: 60 };
    const groupPadding = { horizontal: 450, vertical: 300 };

    const totalWidth = group.reduce((sum, e) => sum + (e.width || 200) + entityPadding.horizontal, -entityPadding.horizontal);
    const totalHeight = group.reduce((sum, e) => sum + (e.height || 100) + entityPadding.vertical, -entityPadding.vertical);

    let currentX = 0;
    let currentY = 0;

    switch (position) {
        case 'top':
            currentX = centerX - totalWidth / 2;
            currentY = centerY - groupPadding.vertical - (group[0]?.height || 100);
            group.forEach(entity => {
                entity.x = currentX;
                entity.y = currentY;
                currentX += (entity.width || 200) + entityPadding.horizontal;
            });
            break;
        case 'bottom':
            currentX = centerX - totalWidth / 2;
            currentY = centerY + groupPadding.vertical;
            group.forEach(entity => {
                entity.x = currentX;
                entity.y = currentY;
                currentX += (entity.width || 200) + entityPadding.horizontal;
            });
            break;
        case 'left':
            currentX = centerX - groupPadding.horizontal - (group[0]?.width || 200);
            currentY = centerY - totalHeight / 2;
            group.forEach(entity => {
                entity.x = currentX;
                entity.y = currentY;
                currentY += (entity.height || 100) + entityPadding.vertical;
            });
            break;
        case 'right':
            currentX = centerX + groupPadding.horizontal;
            currentY = centerY - totalHeight / 2;
            group.forEach(entity => {
                entity.x = currentX;
                entity.y = currentY;
                currentY += (entity.height || 100) + entityPadding.vertical;
            });
            break;
    }
  }

  private optimizeBusinessModelLayout(modelData: any, existingEntities: Entity[]): { entities: Entity[]; flows: Flow[] } {
    const { entities: newEntities, flows } = modelData;

    const bounds = existingEntities.reduce(
        (acc, entity) => ({
            minX: Math.min(acc.minX, entity.x),
            maxX: Math.max(acc.maxX, entity.x + (entity.width || 200)),
            minY: Math.min(acc.minY, entity.y),
            maxY: Math.max(acc.maxY, entity.y + (entity.height || 100)),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    const offsetX = (bounds.maxX !== -Infinity) ? bounds.maxX + 400 : 0;
    const baseOffsetY = 0; // For simplicity, we only offset horizontally

    const coreEntity = newEntities.find((e: any) => e.id === 'core' || e.name.toLowerCase().includes('core'));

    if (!coreEntity || !flows || flows.length === 0) {
      // Fallback to old circular layout if no core entity or flows, but with offset
      return this.positionEntitiesInCircle({ entities: newEntities, flows }, offsetX, baseOffsetY);
    }

    const coreId = coreEntity.id;
    const centerX = 800 + offsetX;
    const centerY = 500 + baseOffsetY;
    
    coreEntity.x = centerX - (coreEntity.width || 200) / 2;
    coreEntity.y = centerY - (coreEntity.height || 100) / 2;

    const otherEntities = newEntities.filter((e: any) => e.id !== coreId);
    
    const connections = new Map<string, { toCore: boolean, fromCore: boolean }>();
    otherEntities.forEach((e: any) => connections.set(e.id, { toCore: false, fromCore: false }));

    flows.forEach((flow: any) => {
        if (flow.sourceId === coreId && connections.has(flow.targetId)) {
            connections.get(flow.targetId)!.fromCore = true;
        }
        if (flow.targetId === coreId && connections.has(flow.sourceId)) {
            connections.get(flow.sourceId)!.toCore = true;
        }
    });

    const inputs: Entity[] = []; // toCore only (e.g., Suppliers)
    const outputs: Entity[] = []; // fromCore only (e.g., Customers)
    const partners: Entity[] = []; // toCore and fromCore (Bidirectional)
    const others: Entity[] = []; // No direct connection to core

    otherEntities.forEach((entity: any) => {
        const conn = connections.get(entity.id)!;
        if (conn.toCore && conn.fromCore) {
            partners.push(entity);
        } else if (conn.toCore) {
            inputs.push(entity);
        } else if (conn.fromCore) {
            outputs.push(entity);
        } else {
            others.push(entity);
        }
    });

    // Position the groups logically
    this.positionGroup(inputs, 'left', centerX, centerY);
    this.positionGroup(outputs, 'right', centerX, centerY);
    this.positionGroup(partners, 'top', centerX, centerY);
    this.positionGroup(others, 'bottom', centerX, centerY);

    const optimizedEntities = [coreEntity, ...inputs, ...outputs, ...partners, ...others];
    
    return {
        entities: optimizedEntities,
        flows: modelData.flows
    };
  }

  private async generateFinancialValues(newModelData: any, companyName: string): Promise<void> {
    try {
      // Define the hardcoded flow IDs for the brain health gummies business that should never be overridden by AI
      const hardcodedFlowIds = new Set([
        'flow-1', 'flow-2', 'flow-3', 'flow-4', 'flow-5', 'flow-6', 'flow-7', 
        'flow-8', 'flow-9', 'flow-10', 'flow-11', 'flow-12', 'flow-13', 'flow-14'
      ]);

      // Filter out hardcoded flows from AI generation
      const flowsForAI = newModelData.flows.filter((flow: any) => !hardcodedFlowIds.has(flow.id));
      
      // If no flows need AI generation, skip the API call
      if (flowsForAI.length === 0) {
        console.log('All flows are hardcoded, skipping AI generation');
        return;
      }

      const response = await fetch('/api/generate-flow-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entities: newModelData.entities,
          flows: flowsForAI,
          companyContext: companyName
        })
      });

      if (response.ok) {
        const result = await response.json();
        const newFlowIds = new Set(newModelData.flows.map((f: Flow) => f.id));

        // Update flows with AI-generated values (only for flows not in hardcoded set)
        const updatedNewFlows = newModelData.flows.map((flow: any) => {
          // Skip AI updates for hardcoded flows
          if (hardcodedFlowIds.has(flow.id)) {
            return flow;
          }
          
          const aiValue = result.flowValues.find((fv: any) => fv.flowId === flow.id);
          if (aiValue) {
            return {
              ...flow,
              value: aiValue.value,
              valueDescription: aiValue.valueDescription,
              valueType: aiValue.valueType,
              valueUnit: aiValue.valueUnit
            };
          }
          return flow;
        });

        // Get all flows that are not part of the new model
        const oldFlows = this.context.flows.filter(f => !newFlowIds.has(f.id));
        const combinedFlows = [...oldFlows, ...updatedNewFlows];

        // Apply updated model, preserving all entities
        this.context.onApplyModel({
          entities: this.context.entities,
          flows: combinedFlows
        });
      }
    } catch (error) {
      console.error('Error generating financial values:', error);
    }
  }
}

export const createActionExecutor = (context: ActionExecutorContext): ActionExecutor => {
  return new ActionExecutor(context);
};
