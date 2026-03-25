import ELK from 'elkjs/lib/elk.bundled.js';
import { Entity, Flow, EntityType } from '@/lib/types/canvas';

const elk = new ELK();

// Minimum spacing between entities
const MIN_SPACING = 150;
const ENTITY_PADDING = 40;

/**
 * Semantic positioning: Position entities based on their business role
 * Creates a radial layout with the main organization at center
 */
export interface SemanticPosition {
  angle: number;
  distance: number;
  layer: number;
}

const SEMANTIC_LAYOUT: Record<EntityType, SemanticPosition> = {
  organization: { angle: 0, distance: 0, layer: 0 }, // Center
  customer: { angle: 0, distance: 400, layer: 1 }, // Right
  partner: { angle: 90, distance: 400, layer: 1 }, // Top
  supplier: { angle: 180, distance: 400, layer: 1 }, // Left
  investor: { angle: 270, distance: 400, layer: 1 }, // Bottom
  government: { angle: 240, distance: 450, layer: 2 }, // Bottom-left
  technology: { angle: 120, distance: 450, layer: 2 }, // Top-left
  community: { angle: 300, distance: 450, layer: 2 }, // Bottom-right
  ngo: { angle: 210, distance: 450, layer: 2 }, // Left-bottom
  media: { angle: 60, distance: 450, layer: 2 }, // Top-right
};

/**
 * Calculate semantic position for an entity based on its type
 */
export function getSemanticPosition(
  entity: Entity,
  index: number,
  totalOfType: number,
  centerX: number = 1000,
  centerY: number = 600
): { x: number; y: number } {
  // Get semantic position, with fallback for unknown types
  const semantic = SEMANTIC_LAYOUT[entity.type] || {
    angle: 45,
    distance: 400,
    layer: 1
  };

  // If multiple entities of same type, spread them in an arc
  let angleOffset = 0;
  if (totalOfType > 1) {
    const spreadAngle = 40; // degrees to spread entities of same type
    const step = spreadAngle / (totalOfType - 1);
    angleOffset = (index - (totalOfType - 1) / 2) * step;
  }

  const finalAngle = (semantic.angle + angleOffset) * (Math.PI / 180);
  const distance = semantic.distance + (semantic.layer * 100);

  const x = centerX + Math.cos(finalAngle) * distance;
  const y = centerY + Math.sin(finalAngle) * distance;

  return { x: x - entity.width / 2, y: y - entity.height / 2 };
}

/**
 * Apply semantic radial layout to all entities
 */
export function applySemanticLayout(
  entities: Entity[],
  centerX: number = 1000,
  centerY: number = 600
): Entity[] {
  // Group entities by type
  const byType = new Map<EntityType, Entity[]>();
  entities.forEach(entity => {
    if (!byType.has(entity.type)) {
      byType.set(entity.type, []);
    }
    byType.get(entity.type)!.push(entity);
  });

  // Calculate positions for each entity
  return entities.map(entity => {
    const entitiesOfType = byType.get(entity.type)!;
    const indexOfType = entitiesOfType.indexOf(entity);
    const totalOfType = entitiesOfType.length;

    const { x, y } = getSemanticPosition(entity, indexOfType, totalOfType, centerX, centerY);

    return {
      ...entity,
      x,
      y,
    };
  });
}

/**
 * Check if two entities overlap
 */
export function entitiesOverlap(e1: Entity, e2: Entity, padding: number = ENTITY_PADDING): boolean {
  return !(
    e1.x + e1.width + padding < e2.x ||
    e1.x > e2.x + e2.width + padding ||
    e1.y + e1.height + padding < e2.y ||
    e1.y > e2.y + e2.height + padding
  );
}

/**
 * Detect all overlapping entities
 */
export function detectOverlaps(entities: Entity[]): Array<[Entity, Entity]> {
  const overlaps: Array<[Entity, Entity]> = [];

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      if (entitiesOverlap(entities[i], entities[j])) {
        overlaps.push([entities[i], entities[j]]);
      }
    }
  }

  return overlaps;
}

/**
 * Apply force-directed layout to resolve overlaps
 * Uses simple physics simulation
 */
export function applyForceDirectedLayout(
  entities: Entity[],
  flows: Flow[],
  iterations: number = 100,
  centerX: number = 1000,
  centerY: number = 600
): Entity[] {
  const positions = entities.map(e => ({
    id: e.id,
    x: e.x + e.width / 2,
    y: e.y + e.height / 2,
    vx: 0,
    vy: 0,
    width: e.width,
    height: e.height,
  }));

  const REPULSION_STRENGTH = 50000;
  const ATTRACTION_STRENGTH = 0.001;
  const CENTER_GRAVITY = 0.01;
  const DAMPING = 0.8;

  for (let iter = 0; iter < iterations; iter++) {
    // Reset forces
    positions.forEach(p => {
      p.vx = 0;
      p.vy = 0;
    });

    // Repulsion between all entities
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = MIN_SPACING + (positions[i].width + positions[j].width) / 2;

        if (distance < minDist * 2) {
          const force = REPULSION_STRENGTH / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          positions[i].vx -= fx;
          positions[i].vy -= fy;
          positions[j].vx += fx;
          positions[j].vy += fy;
        }
      }
    }

    // Attraction along flows
    flows.forEach(flow => {
      const source = positions.find(p => p.id === flow.sourceId);
      const target = positions.find(p => p.id === flow.targetId);

      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = distance * ATTRACTION_STRENGTH;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }
    });

    // Gravity towards center
    positions.forEach(p => {
      const dx = centerX - p.x;
      const dy = centerY - p.y;
      p.vx += dx * CENTER_GRAVITY;
      p.vy += dy * CENTER_GRAVITY;
    });

    // Apply velocities with damping
    positions.forEach(p => {
      p.x += p.vx * DAMPING;
      p.y += p.vy * DAMPING;
    });
  }

  // Update entities with new positions
  return entities.map(entity => {
    const pos = positions.find(p => p.id === entity.id)!;
    return {
      ...entity,
      x: pos.x - entity.width / 2,
      y: pos.y - entity.height / 2,
    };
  });
}

/**
 * Apply ELK.js layered layout (Sugiyama algorithm)
 * Best for hierarchical business models
 */
export async function applyELKLayout(
  entities: Entity[],
  flows: Flow[],
  algorithm: 'layered' | 'force' | 'stress' | 'mrtree' = 'layered'
): Promise<Entity[]> {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': algorithm,
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '150',
      'elk.layered.spacing.nodeNodeBetweenLayers': '200',
      'elk.spacing.edgeNode': '100',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.considerModelOrder.strategy': 'PREFER_EDGES',
    },
    children: entities.map(entity => ({
      id: entity.id,
      width: entity.width,
      height: entity.height,
    })),
    edges: flows.map((flow, idx) => ({
      id: `edge-${idx}`,
      sources: [flow.sourceId],
      targets: [flow.targetId],
    })),
  };

  try {
    const layouted = await elk.layout(graph);

    // Update entities with ELK-calculated positions
    return entities.map(entity => {
      const node = layouted.children?.find(n => n.id === entity.id);
      if (node && node.x !== undefined && node.y !== undefined) {
        return {
          ...entity,
          x: node.x,
          y: node.y,
        };
      }
      return entity;
    });
  } catch (error) {
    console.error('ELK layout failed:', error);
    return entities;
  }
}

/**
 * Smart auto-layout: Combines semantic positioning with force-directed cleanup
 */
export async function autoLayout(
  entities: Entity[],
  flows: Flow[],
  mode: 'semantic' | 'force' | 'elk-layered' | 'elk-force' = 'semantic',
  centerX: number = 1000,
  centerY: number = 600
): Promise<Entity[]> {
  switch (mode) {
    case 'semantic':
      // Apply semantic layout, then force-directed to resolve overlaps
      const semantic = applySemanticLayout(entities, centerX, centerY);
      return applyForceDirectedLayout(semantic, flows, 50, centerX, centerY);

    case 'force':
      // Pure force-directed layout
      return applyForceDirectedLayout(entities, flows, 100, centerX, centerY);

    case 'elk-layered':
      // ELK hierarchical layout
      return await applyELKLayout(entities, flows, 'layered');

    case 'elk-force':
      // ELK force-directed layout
      return await applyELKLayout(entities, flows, 'force');

    default:
      return entities;
  }
}

/**
 * Calculate bounding box of all entities
 */
export function calculateBoundingBox(entities: Entity[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
} {
  if (entities.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  const minX = Math.min(...entities.map(e => e.x));
  const minY = Math.min(...entities.map(e => e.y));
  const maxX = Math.max(...entities.map(e => e.x + e.width));
  const maxY = Math.max(...entities.map(e => e.y + e.height));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/**
 * Center entities in viewport
 */
export function centerEntities(
  entities: Entity[],
  viewportWidth: number,
  viewportHeight: number
): { entities: Entity[]; pan: { x: number; y: number } } {
  const bbox = calculateBoundingBox(entities);

  const targetCenterX = viewportWidth / 2;
  const targetCenterY = viewportHeight / 2;

  const offsetX = targetCenterX - bbox.centerX;
  const offsetY = targetCenterY - bbox.centerY;

  return {
    entities: entities.map(e => ({
      ...e,
      x: e.x + offsetX,
      y: e.y + offsetY,
    })),
    pan: { x: 0, y: 0 },
  };
}
