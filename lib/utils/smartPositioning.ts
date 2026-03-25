
import { Entity } from '@/lib/types/canvas';

export const GRID_SIZE = 50;
export const ENTITY_PADDING = 40;
export const MAX_POSITIONING_ATTEMPTS = 50;

export interface Position {
  x: number;
  y: number;
}

export const findNonOverlappingPosition = (
  existingEntities: Entity[],
  preferredX: number,
  preferredY: number,
  width = 200,
  height = 100,
  containerWidth = 1600,
  containerHeight = 1000
): Position => {
  // Snap to grid
  const snapX = Math.round(preferredX / GRID_SIZE) * GRID_SIZE;
  const snapY = Math.round(preferredY / GRID_SIZE) * GRID_SIZE;

  const isOverlapping = (testX: number, testY: number): boolean => {
    return existingEntities.some((entity) => {
      const entityRight = entity.x + entity.width + ENTITY_PADDING;
      const entityBottom = entity.y + entity.height + ENTITY_PADDING;
      const testRight = testX + width + ENTITY_PADDING;
      const testBottom = testY + height + ENTITY_PADDING;

      return !(
        testX > entityRight ||
        testRight < entity.x - ENTITY_PADDING ||
        testY > entityBottom ||
        testBottom < entity.y - ENTITY_PADDING
      );
    });
  };

  const isInBounds = (x: number, y: number): boolean => {
    return x >= 50 && y >= 50 && 
           x + width <= containerWidth - 50 && 
           y + height <= containerHeight - 50;
  };

  // Check preferred position first
  if (!isOverlapping(snapX, snapY) && isInBounds(snapX, snapY)) {
    return { x: snapX, y: snapY };
  }

  // Try spiral pattern around preferred position
  for (let attempt = 1; attempt <= MAX_POSITIONING_ATTEMPTS; attempt++) {
    const radius = attempt * GRID_SIZE;
    
    // Generate positions in expanding spiral
    const positions = [
      { x: snapX + radius, y: snapY },
      { x: snapX - radius, y: snapY },
      { x: snapX, y: snapY + radius },
      { x: snapX, y: snapY - radius },
      { x: snapX + radius, y: snapY + radius },
      { x: snapX - radius, y: snapY - radius },
      { x: snapX + radius, y: snapY - radius },
      { x: snapX - radius, y: snapY + radius },
    ];

    for (const pos of positions) {
      if (!isOverlapping(pos.x, pos.y) && isInBounds(pos.x, pos.y)) {
        return pos;
      }
    }
  }

  // Fallback: find any available space
  for (let y = 100; y < containerHeight - height - 100; y += GRID_SIZE) {
    for (let x = 100; x < containerWidth - width - 100; x += GRID_SIZE) {
      if (!isOverlapping(x, y)) {
        return { x, y };
      }
    }
  }

  // Ultimate fallback
  return { 
    x: snapX + existingEntities.length * 250, 
    y: snapY 
  };
};

export const positionEntitiesInCircle = (
  entities: Entity[],
  centerX: number,
  centerY: number,
  radius = 350
): Entity[] => {
  if (entities.length <= 1) return entities;

  return entities.map((entity, index) => {
    if (entity.id === 'core') {
      return { ...entity, x: centerX - 100, y: centerY - 50 };
    }

    const angle = (index * (2 * Math.PI)) / (entities.length - 1);
    const x = centerX + Math.cos(angle) * radius - 100;
    const y = centerY + Math.sin(angle) * radius - 50;

    return { ...entity, x, y };
  });
};

export const optimizeCanvasLayout = (entities: Entity[]): Entity[] => {
  if (entities.length === 0) return entities;

  // Find canvas bounds
  const bounds = entities.reduce(
    (acc, entity) => ({
      minX: Math.min(acc.minX, entity.x),
      maxX: Math.max(acc.maxX, entity.x + entity.width),
      minY: Math.min(acc.minY, entity.y),
      maxY: Math.max(acc.maxY, entity.y + entity.height),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );

  // Center the layout if it's too far from origin
  const offsetX = bounds.minX < 100 ? 100 - bounds.minX : 0;
  const offsetY = bounds.minY < 100 ? 100 - bounds.minY : 0;

  if (offsetX === 0 && offsetY === 0) return entities;

  return entities.map(entity => ({
    ...entity,
    x: entity.x + offsetX,
    y: entity.y + offsetY
  }));
};

export const calculateOptimalSpacing = (entityCount: number): number => {
  if (entityCount <= 3) return 400;
  if (entityCount <= 5) return 350;
  if (entityCount <= 7) return 300;
  return 250;
};
