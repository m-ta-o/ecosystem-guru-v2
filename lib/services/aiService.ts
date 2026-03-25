import { Entity, Flow, EntityType, FlowType, ENTITY_TYPES, FLOW_TYPES } from '@/lib/types/canvas';

export type AIMode = 'chat' | 'generate' | 'expand' | 'analyze' | 'suggest';

export interface AIRequest {
  mode: AIMode;
  prompt: string;
  context: {
    entities: Entity[];
    flows: Flow[];
    selectedEntity?: Entity;
  };
}

export interface AIResponse {
  success: boolean;
  actions?: AIAction[];
  message?: string;
  error?: string;
}

export type AIAction =
  | { type: 'create_entity'; entity: Omit<Entity, 'id'> }
  | { type: 'create_flow'; flow: Omit<Flow, 'id'> }
  | { type: 'update_entity'; entityId: string; updates: Partial<Entity> }
  | { type: 'update_flow'; flowId: string; updates: Partial<Flow> }
  | { type: 'delete_entity'; entityId: string }
  | { type: 'message'; content: string };

/**
 * Generate a complete ecosystem from a business description
 */
export const generateEcosystemPrompt = (description: string, existingContext: { entities: Entity[], flows: Flow[] }) => {
  return `You are an expert business ecosystem architect. Generate a focused business ecosystem model based on this description:

"${description}"

${existingContext.entities.length > 0 ? `
EXISTING CONTEXT:
Current entities: ${existingContext.entities.map(e => `${e.name} (${e.type})`).join(', ')}
Current flows: ${existingContext.flows.length} flows

Build upon this existing ecosystem.
` : 'Start from scratch.'}

Create a CONCISE ecosystem with exactly 8-10 core entities:
1. Main organization/company
2. 2-3 key customers or customer segments
3. 2-3 strategic partners or suppliers
4. 1-2 other critical stakeholders (government, investors, etc.)

For each entity, provide:
- name: Clear, specific name
- type: One of [organization, customer, partner, supplier, technology, government, community, ngo, investor, media]
- description: ONE sentence only (10-15 words max)

NOTE: Do NOT include x, y, width, or height coordinates. The system will automatically position entities using semantic layout.

Then create 8-12 KEY value flows between entities showing:
- What flows from entity to entity
- Type of flow: One of [money, product, service, data, value, knowledge, influence, resource, impact]
- Label: Clear description (5-8 words max)
- Value: Estimated dollar value (if applicable) as a number
- valueDescription: ONE short sentence (10 words max)

Respond ONLY with valid JSON in this exact format:
{
  "entities": [
    {
      "name": "string",
      "type": "organization|customer|partner|supplier|technology|government|community|ngo|investor|media",
      "description": "string"
    }
  ],
  "flows": [
    {
      "sourceId": "entity-name",
      "targetId": "entity-name",
      "type": "money|product|service|data|value|knowledge|influence|resource|impact",
      "label": "string",
      "value": number,
      "valueDescription": "string"
    }
  ]
}

Use entity names as IDs in flows. Ensure all sourceId and targetId reference actual entity names.`;
};

/**
 * Generate suggestions for expanding an entity's connections
 */
export const generateExpansionPrompt = (entity: Entity, context: { entities: Entity[], flows: Flow[] }) => {
  const existingConnections = context.flows
    .filter(f => f.sourceId === entity.id || f.targetId === entity.id)
    .map(f => {
      const otherEntity = context.entities.find(e =>
        e.id === (f.sourceId === entity.id ? f.targetId : f.sourceId)
      );
      return otherEntity?.name;
    });

  return `You are an expert business ecosystem architect. Suggest new entities and connections for this entity:

ENTITY: ${entity.name}
Type: ${entity.type}
Description: ${entity.description}

EXISTING CONNECTIONS: ${existingConnections.join(', ') || 'None'}

FULL ECOSYSTEM CONTEXT:
${context.entities.map(e => `- ${e.name} (${e.type})`).join('\n')}

Suggest 3-5 new entities that would create valuable connections with "${entity.name}". Consider:
- Missing partners that could help growth
- Overlooked suppliers or customers
- Technology or infrastructure needs
- Regulatory or community stakeholders

Respond ONLY with valid JSON:
{
  "suggestions": [
    {
      "entity": {
        "name": "string",
        "type": "organization|customer|partner|supplier|technology|government|community|ngo|investor|media",
        "description": "string"
      },
      "flow": {
        "sourceId": "entity-name-or-${entity.name}",
        "targetId": "entity-name-or-${entity.name}",
        "type": "money|product|service|data|value|knowledge|influence|resource|impact",
        "label": "string",
        "value": number,
        "valueDescription": "string"
      },
      "reasoning": "Why this connection matters (1 sentence)"
    }
  ]
}`;
};

/**
 * Analyze the ecosystem and provide insights
 */
export const generateAnalysisPrompt = (entities: Entity[], flows: Flow[]) => {
  return `Analyze this business ecosystem and provide strategic insights:

ENTITIES (${entities.length}):
${entities.map(e => `- ${e.name} (${e.type}): ${e.description}`).join('\n')}

FLOWS (${flows.length}):
${flows.map(f => {
  const source = entities.find(e => e.id === f.sourceId);
  const target = entities.find(e => e.id === f.targetId);
  return `- ${source?.name} → ${target?.name}: ${f.label} (${f.type})`;
}).join('\n')}

Provide:
1. **Strengths**: Key advantages of this ecosystem (2-3 points)
2. **Risks**: Critical vulnerabilities or dependencies (2-3 points)
3. **Opportunities**: Potential improvements or expansions (2-3 points)
4. **Recommendations**: Specific actionable advice (2-3 points)

Use markdown formatting for readability.`;
};

/**
 * Get context-aware chat response
 */
export const generateChatPrompt = (
  userMessage: string,
  entities: Entity[],
  flows: Flow[],
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>
) => {
  const entityList = entities.map(e => `- ${e.name} (id: ${e.id}, type: ${e.type})`).join('\n');
  const flowList = flows.map(f => {
    const source = entities.find(e => e.id === f.sourceId);
    const target = entities.find(e => e.id === f.targetId);
    return `- id: ${f.id} | ${source?.name} → ${target?.name}: "${f.label}" (${f.type}${f.value ? `, value: ${f.value}` : ''}${f.valueDescription ? `, desc: "${f.valueDescription}"` : ''})`;
  }).join('\n');

  return `You are an expert business ecosystem consultant with the ability to DIRECTLY UPDATE the user's canvas.

IMPORTANT: When the user asks you to "update", "change", "modify", "add to", or "fix" the model, you MUST return JSON with actions, NOT just advice.

CURRENT ECOSYSTEM:
Entities (${entities.length}):
${entityList}

Flows (${flows.length}):
${flowList}

CHAT HISTORY:
${chatHistory.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}

USER: ${userMessage}

RESPONSE INSTRUCTIONS:
1. If user asks for UPDATES/CHANGES to the model (e.g., "update the values", "change the prices", "add X"), respond with JSON:
\`\`\`json
{
  "actions": [
    {
      "type": "update_flow",
      "flowId": "flow-1234567890123-abc123def",
      "updates": {
        "value": 12345,
        "valueDescription": "Per unit price description"
      }
    }
  ],
  "message": "Brief explanation of what you changed"
}
\`\`\`

CRITICAL: Use the EXACT flow ID from the Flows list above (e.g., "flow-1234567890123-abc123def"). The ID is shown at the start of each flow line after "id:".

Available action types:
- update_flow: { type: "update_flow", flowId: "exact-id-from-flows-list", updates: { value: number, valueDescription: string, label: string } }
- update_entity: { type: "update_entity", entityId: "exact-id-from-entities-list", updates: { name: string, description: string } }
- create_entity: { type: "create_entity", entity: { name, type, description } }
- create_flow: { type: "create_flow", flow: { sourceId, targetId, type, label, value, valueDescription } }

2. If user asks for ADVICE/ANALYSIS (e.g., "what should I do", "analyze this"), respond with markdown text advice.

Be action-oriented. If they say "update it" or "change it", DO IT via JSON actions using EXACT IDs from the lists above.`;
};
