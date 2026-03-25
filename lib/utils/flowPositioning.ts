
import { Entity, Flow, FlowRoute, RoutePoint } from '@/lib/types/canvas';

const LABEL_WIDTH = 170;
const LABEL_HEIGHT = 44;
const ENTITY_PADDING = 90; // Large padding to keep labels far from entities

// Helper to calculate total length and segment lengths of a route
const getRouteLengthInfo = (points: RoutePoint[]) => {
  let totalLength = 0;
  const segmentLengths: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    totalLength += length;
    segmentLengths.push(length);
  }
  return { totalLength, segmentLengths };
};

// Helper to get a point at a specific percentage along the route
const getPointAtPercentage = (
  points: RoutePoint[], 
  percentage: number, 
  lengthInfo?: { totalLength: number; segmentLengths: number[] }
) => {
  const { totalLength, segmentLengths } = lengthInfo || getRouteLengthInfo(points);

  if (totalLength === 0) {
    return points.length > 0 ? points[0] : { x: 0, y: 0 };
  }

  const targetLength = totalLength * Math.max(0, Math.min(1, percentage));
  let accumulatedLength = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segmentLength = segmentLengths[i];
    if (accumulatedLength + segmentLength >= targetLength) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (segmentLength === 0) return p1;
      const ratio = (targetLength - accumulatedLength) / segmentLength;
      const x = p1.x + (p2.x - p1.x) * ratio;
      const y = p1.y + (p2.y - p1.y) * ratio;
      return { x, y };
    }
    accumulatedLength += segmentLength;
  }

  return points[points.length - 1];
};

// Helper to check if a rectangle overlaps with any entity
const doesRectOverlapEntities = (
  rect: { left: number; top: number; right: number; bottom: number }, 
  entities: Entity[]
) => {
  for (const entity of entities) {
    const entityBounds = {
      left: entity.x - ENTITY_PADDING,
      right: entity.x + entity.width + ENTITY_PADDING,
      top: entity.y - ENTITY_PADDING,
      bottom: entity.y + entity.height + ENTITY_PADDING
    };

    if (
      rect.left < entityBounds.right &&
      rect.right > entityBounds.left &&
      rect.top < entityBounds.bottom &&
      rect.bottom > entityBounds.top
    ) {
      return true;
    }
  }
  return false;
};

export const getFlowLabelPosition = (
  flow: Flow,
  entities: Entity[],
  flowRoutes: Map<string, FlowRoute>,
  labelPosition?: number // This is a percentage, from 0 to 1
) => {
  const route = flowRoutes.get(flow.id);
  const source = entities.find(e => e.id === flow.sourceId);
  const target = entities.find(e => e.id === flow.targetId);

  // Fallback for no route or entities
  if (!route || route.points.length < 2 || !source || !target) {
    if (!source || !target) return { x: 0, y: 0 };
    const midX = (source.x + source.width / 2 + target.x + target.width / 2) / 2;
    const midY = (source.y + source.height / 2 + target.y + target.height / 2) / 2;
    return { x: midX, y: midY - 40 };
  }

  const lengthInfo = getRouteLengthInfo(route.points);

  // If a label position is provided by user drag, use it directly
  if (typeof labelPosition === 'number') {
    return getPointAtPercentage(route.points, labelPosition, lengthInfo);
  }

  // --- Automatic Label Positioning Logic ---

  const candidatePercentages: number[] = [];
  // Generate candidates from 10% to 90% of the route to avoid being too close to the start/end entities
  for (let p = 0.1; p <= 0.9; p += 0.05) {
      candidatePercentages.push(p);
  }

  const safePositions: { point: { x: number; y: number }; percentage: number }[] = [];

  for (const percentage of candidatePercentages) {
    const point = getPointAtPercentage(route.points, percentage, lengthInfo);
    const labelRect = {
      left: point.x - LABEL_WIDTH / 2,
      top: point.y - LABEL_HEIGHT / 2,
      right: point.x + LABEL_WIDTH / 2,
      bottom: point.y + LABEL_HEIGHT / 2,
    };

    if (!doesRectOverlapEntities(labelRect, entities)) {
      safePositions.push({ point, percentage });
    }
  }

  // If we found safe positions, choose the one closest to the middle (50%)
  if (safePositions.length > 0) {
    let bestPosition = safePositions[0];
    let minDistanceToMiddle = Math.abs(safePositions[0].percentage - 0.5);

    for (let i = 1; i < safePositions.length; i++) {
      const distanceToMiddle = Math.abs(safePositions[i].percentage - 0.5);
      if (distanceToMiddle < minDistanceToMiddle) {
        minDistanceToMiddle = distanceToMiddle;
        bestPosition = safePositions[i];
      }
    }
    return bestPosition.point;
  }

  // --- Fallback Logic if no safe position is found ---
  // Use a perpendicular offset from the absolute middle of the route
  const midPoint = getPointAtPercentage(route.points, 0.5, lengthInfo);
  
  const sourceCenter = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const targetCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length > 0) {
    // Large offset to push labels far from flow path and entities
    const offsetDistance = 120;
    const perpX = (-dy / length) * offsetDistance;
    const perpY = (dx / length) * offsetDistance;

    return { x: midPoint.x + perpX, y: midPoint.y + perpY };
  }

  // Ultimate fallback
  return { x: midPoint.x, y: midPoint.y - (LABEL_HEIGHT / 2 + 10) };
};
