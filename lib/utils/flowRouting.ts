import { Entity, RoutePoint, EntityAnchors, Flow } from '@/lib/types/canvas';

export const GRID_SIZE = 20;
export const PERPENDICULAR_DISTANCE = 60;
export const ENTITY_CLEARANCE = 40;
export const CORNER_RADIUS = 8;

// Track anchor usage to prevent overlapping flows
const anchorUsage = new Map<string, number>();

export const getEntityAnchors = (entity: Entity): EntityAnchors => {
  const centerX = entity.x + entity.width / 2;
  const centerY = entity.y + entity.height / 2;

  // Create exactly 8 anchor points - 2 on each side, with more separation
  return {
    // Left side anchors (1/4 and 3/4 positions)
    leftInput: { x: entity.x, y: entity.y + entity.height / 4, side: "left", type: "input" },
    leftOutput: { x: entity.x, y: entity.y + (3 * entity.height) / 4, side: "left", type: "output" },
    
    // Right side anchors
    rightInput: { x: entity.x + entity.width, y: entity.y + entity.height / 4, side: "right", type: "input" },
    rightOutput: { x: entity.x + entity.width, y: entity.y + (3 * entity.height) / 4, side: "right", type: "output" },
    
    // Top side anchors
    topInput: { x: entity.x + entity.width / 4, y: entity.y, side: "top", type: "input" },
    topOutput: { x: entity.x + (3 * entity.width) / 4, y: entity.y, side: "top", type: "output" },
    
    // Bottom side anchors
    bottomInput: { x: entity.x + entity.width / 4, y: entity.y + entity.height, side: "bottom", type: "input" },
    bottomOutput: { x: entity.x + (3 * entity.width) / 4, y: entity.y + entity.height, side: "bottom", type: "output" }
  };
};

const getAnchorKey = (entityId: string, anchorName: string): string => {
  return `${entityId}-${anchorName}`;
};

const getAnchorUsage = (entityId: string, anchorName: string): number => {
  const key = getAnchorKey(entityId, anchorName);
  return anchorUsage.get(key) || 0;
};

const incrementAnchorUsage = (entityId: string, anchorName: string): void => {
  const key = getAnchorKey(entityId, anchorName);
  anchorUsage.set(key, getAnchorUsage(entityId, anchorName) + 1);
};

export const getOptimalConnectionPoints = (
  sourceEntity: Entity,
  targetEntity: Entity,
  existingFlows: Flow[] = [],
  strategy?: 'bidirectional_top' | 'bidirectional_bottom'
) => {
  console.log('Getting connection points for:', sourceEntity.id, '->', targetEntity.id, 'with strategy:', strategy);
  
  const sourceAnchors = getEntityAnchors(sourceEntity);
  const targetAnchors = getEntityAnchors(targetEntity);

  const sourceCenterX = sourceEntity.x + sourceEntity.width / 2;
  const sourceCenterY = sourceEntity.y + sourceEntity.height / 2;
  const targetCenterX = targetEntity.x + targetEntity.width / 2;
  const targetCenterY = targetEntity.y + targetEntity.height / 2;

  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;
  const useHorizontal = Math.abs(dx) > Math.abs(dy);

  // New strategy-based anchor selection for bidirectional flows
  if (strategy) {
    if (useHorizontal) {
      // Horizontal layout: use left/right anchors, separated vertically
      const toTheRight = dx > 0;
      if (strategy === 'bidirectional_top') { // Use upper anchors
        return {
          sourcePoint: toTheRight ? sourceAnchors.rightInput : sourceAnchors.leftInput,
          targetPoint: toTheRight ? targetAnchors.leftInput : targetAnchors.rightInput,
        };
      }
      if (strategy === 'bidirectional_bottom') { // Use lower anchors
        return {
          sourcePoint: toTheRight ? sourceAnchors.rightOutput : sourceAnchors.leftOutput,
          targetPoint: toTheRight ? targetAnchors.leftOutput : targetAnchors.rightOutput,
        };
      }
    } else {
      // Vertical layout: use top/bottom anchors, separated horizontally
      const targetIsBelow = dy > 0;
      if (strategy === 'bidirectional_top') { // Use left-ish anchors
        return {
          sourcePoint: targetIsBelow ? sourceAnchors.bottomInput : sourceAnchors.topInput,
          targetPoint: targetIsBelow ? targetAnchors.topInput : targetAnchors.bottomInput,
        };
      }
      if (strategy === 'bidirectional_bottom') { // Use right-ish anchors
        return {
          sourcePoint: targetIsBelow ? sourceAnchors.bottomOutput : sourceAnchors.topOutput,
          targetPoint: targetIsBelow ? targetAnchors.topOutput : targetAnchors.bottomOutput,
        };
      }
    }
  }

  // Fallback to original logic if no strategy is provided
  let sourceAnchorName: keyof EntityAnchors;
  let targetAnchorName: keyof EntityAnchors;

  if (useHorizontal) {
    if (dx > 0) {
      // Target is to the right
      sourceAnchorName = 'rightOutput';
      targetAnchorName = 'leftInput';
    } else {
      // Target is to the left
      sourceAnchorName = 'leftOutput';
      targetAnchorName = 'rightInput';
    }
  } else {
    // Vertical connection
    if (dy > 0) {
      // Target is below
      sourceAnchorName = 'bottomOutput';
      targetAnchorName = 'topInput';
    } else {
      // Target is above
      sourceAnchorName = 'topOutput';
      targetAnchorName = 'bottomInput';
    }
  }
  
  const sourcePoint = sourceAnchors[sourceAnchorName];
  const targetPoint = targetAnchors[targetAnchorName];

  console.log('Connection points calculated:', { sourcePoint, targetPoint });
  return { sourcePoint, targetPoint };
};

// Reset anchor usage (call when flows change)
export const resetAnchorUsage = (): void => {
  anchorUsage.clear();
};

export const lineIntersectsRect = (
  p1: RoutePoint,
  p2: RoutePoint,
  rect: { left: number; right: number; top: number; bottom: number }
): boolean => {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  return !(maxX < rect.left || minX > rect.right || 
           maxY < rect.top || minY > rect.bottom);
};

export const pathIntersectsEntity = (p1: RoutePoint, p2: RoutePoint, entities: Entity[]): boolean => {
  return entities.some((entity) => {
    const entityBounds = {
      left: entity.x - ENTITY_CLEARANCE,
      right: entity.x + entity.width + ENTITY_CLEARANCE,
      top: entity.y - ENTITY_CLEARANCE,
      bottom: entity.y + entity.height + ENTITY_CLEARANCE
    };

    return lineIntersectsRect(p1, p2, entityBounds);
  });
};

export const calculateFigJamRoute = (
  start: RoutePoint,
  end: RoutePoint,
  entities: Entity[]
): RoutePoint[] => {
  console.log('Calculating FigJam route from', start, 'to', end);
  
  const route: RoutePoint[] = [start];

  // Calculate perpendicular exit point
  let firstWaypoint: RoutePoint;
  switch (start.side) {
    case "left":
      firstWaypoint = { x: start.x - PERPENDICULAR_DISTANCE, y: start.y };
      break;
    case "right":
      firstWaypoint = { x: start.x + PERPENDICULAR_DISTANCE, y: start.y };
      break;
    case "top":
      firstWaypoint = { x: start.x, y: start.y - PERPENDICULAR_DISTANCE };
      break;
    case "bottom":
      firstWaypoint = { x: start.x, y: start.y + PERPENDICULAR_DISTANCE };
      break;
    default:
      firstWaypoint = { x: start.x + PERPENDICULAR_DISTANCE, y: start.y };
  }

  // Calculate perpendicular entry point
  let lastWaypoint: RoutePoint;
  switch (end.side) {
    case "left":
      lastWaypoint = { x: end.x - PERPENDICULAR_DISTANCE, y: end.y };
      break;
    case "right":
      lastWaypoint = { x: end.x + PERPENDICULAR_DISTANCE, y: end.y };
      break;
    case "top":
      lastWaypoint = { x: end.x, y: end.y - PERPENDICULAR_DISTANCE };
      break;
    case "bottom":
      lastWaypoint = { x: end.x, y: end.y + PERPENDICULAR_DISTANCE };
      break;
    default:
      lastWaypoint = { x: end.x - PERPENDICULAR_DISTANCE, y: end.y };
  }

  route.push(firstWaypoint);

  // Create orthogonal path between waypoints with collision detection
  if (firstWaypoint.x !== lastWaypoint.x && firstWaypoint.y !== lastWaypoint.y) {
    const midPoint1 = { x: lastWaypoint.x, y: firstWaypoint.y };
    
    if (!pathIntersectsEntity(firstWaypoint, midPoint1, entities) && 
        !pathIntersectsEntity(midPoint1, lastWaypoint, entities)) {
      route.push(midPoint1);
    } else {
      const midPoint2 = { x: firstWaypoint.x, y: lastWaypoint.y };
      
      if (!pathIntersectsEntity(firstWaypoint, midPoint2, entities) && 
          !pathIntersectsEntity(midPoint2, lastWaypoint, entities)) {
        route.push(midPoint2);
      } else {
        // Add detour points to avoid collision
        const detourX = firstWaypoint.x + (lastWaypoint.x > firstWaypoint.x ? 100 : -100);
        const detourY = firstWaypoint.y + (lastWaypoint.y > firstWaypoint.y ? 100 : -100);
        route.push({ x: detourX, y: firstWaypoint.y });
        route.push({ x: detourX, y: detourY });
        route.push({ x: lastWaypoint.x, y: detourY });
      }
    }
  }

  route.push(lastWaypoint);
  route.push(end);

  console.log('Generated route with', route.length, 'points:', route);
  return route;
};

export const createFigJamPathString = (route: RoutePoint[]): string => {
  if (route.length < 2) return "";

  let path = `M ${route[0].x},${route[0].y}`;

  for (let i = 1; i < route.length; i++) {
    const current = route[i];
    const previous = route[i - 1];
    const next = route[i + 1];

    if (i === route.length - 1) {
      // Last point - straight line
      path += ` L ${current.x},${current.y}`;
    } else if (next) {
      // Apply rounded corners
      const prevDx = current.x - previous.x;
      const prevDy = current.y - previous.y;
      const nextDx = next.x - current.x;
      const nextDy = next.y - current.y;

      const prevLength = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
      const nextLength = Math.sqrt(nextDx * nextDx + nextDy * nextDy);

      if (prevLength > 0 && nextLength > 0) {
        const radius = Math.min(CORNER_RADIUS, prevLength / 2, nextLength / 2);

        const prevUnitX = prevDx / prevLength;
        const prevUnitY = prevDy / prevLength;
        const nextUnitX = nextDx / nextLength;
        const nextUnitY = nextDy / nextLength;

        const cornerStart = {
          x: current.x - prevUnitX * radius,
          y: current.y - prevUnitY * radius
        };

        const cornerEnd = {
          x: current.x + nextUnitX * radius,
          y: current.y + nextUnitY * radius
        };

        path += ` L ${cornerStart.x},${cornerStart.y}`;
        path += ` Q ${current.x},${current.y} ${cornerEnd.x},${cornerEnd.y}`;
      } else {
        path += ` L ${current.x},${current.y}`;
      }
    }
  }

  return path;
};

export const offsetRouteForBundle = (
  route: RoutePoint[],
  index: number,
  total: number
): RoutePoint[] => {
  const offsetAmount = 5 * (index - (total - 1) / 2);
  return route.map(point => ({ 
    x: point.x, 
    y: point.y + offsetAmount 
  }));
};
