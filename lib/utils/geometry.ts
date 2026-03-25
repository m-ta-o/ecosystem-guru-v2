
interface Point {
  x: number;
  y: number;
}

/**
 * Calculates the squared distance between two points.
 */
function getSqDist(p1: Point, p2: Point): number {
  return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
}

/**
 * Calculates the squared distance from a point to a line segment.
 */
function getSqSegDist(p: Point, p1: Point, p2: Point): number {
  let x = p1.x;
  let y = p1.y;
  let dx = p2.x - x;
  let dy = p2.y - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2.x;
      y = p2.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;

  return dx * dx + dy * dy;
}

/**
 * Finds the closest point on a polyline to a given point and its percentage distance along the polyline.
 * @param point The point to find the closest point to.
 * @param polyline An array of points representing the polyline.
 * @returns An object with the closest point and its percentage distance.
 */
export function getClosestPointOnPolyline(point: Point, polyline: Point[]): { point: Point; percentage: number } {
  if (!polyline || polyline.length === 0) {
    return { point: { x: 0, y: 0 }, percentage: 0 };
  }
  if (polyline.length === 1) {
    return { point: polyline[0], percentage: 0 };
  }

  let closestPoint: Point | null = null;
  let minSqDist = Infinity;
  let closestSegmentIndex = -1;

  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];
    const sqDist = getSqSegDist(point, p1, p2);

    if (sqDist < minSqDist) {
      minSqDist = sqDist;
      closestSegmentIndex = i;
    }
  }

  const p1 = polyline[closestSegmentIndex];
  const p2 = polyline[closestSegmentIndex + 1];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  if (dx === 0 && dy === 0) {
      closestPoint = p1;
  } else {
      const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy);
      if (t < 0) {
          closestPoint = p1;
      } else if (t > 1) {
          closestPoint = p2;
      } else {
          closestPoint = { x: p1.x + t * dx, y: p1.y + t * dy };
      }
  }

  let totalLength = 0;
  const segmentLengths: number[] = [];
  for (let i = 0; i < polyline.length - 1; i++) {
    const length = Math.sqrt(getSqDist(polyline[i], polyline[i + 1]));
    segmentLengths.push(length);
    totalLength += length;
  }

  if (totalLength === 0) {
    return { point: polyline[0], percentage: 0 };
  }

  let lengthToClosestPoint = 0;
  for (let i = 0; i < closestSegmentIndex; i++) {
    lengthToClosestPoint += segmentLengths[i];
  }

  lengthToClosestPoint += Math.sqrt(getSqDist(p1, closestPoint));

  const percentage = lengthToClosestPoint / totalLength;

  return { point: closestPoint, percentage: Math.max(0, Math.min(1, percentage)) };
}
