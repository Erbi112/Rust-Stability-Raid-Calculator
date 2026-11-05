/** GHOSTFRAME geometric kernel — no browser, React or Rust game rule dependencies. */
export type Point = Readonly<{ x: number; y: number }>;
export type Polygon = readonly Point[];
export type TileShape = 'square' | 'triangle';
export type Tile = Readonly<{
  id: string;
  shape: TileShape;
  level: number;
  vertices: Polygon;
}>;
export type PlacementResult =
  | Readonly<{ ok: true; tile: Tile; joinedTo: Readonly<{ tileId: string; edgeIndex: number }> }>
  | Readonly<{ ok: false; reason: 'source-missing' | 'edge-occupied' | 'overlap' | 'invalid-edge' }>;

const DEFAULT_SIZE = 1;
const EPS = 1e-8;
const vec = (x: number, y: number): Point => ({ x, y });
const add = (a: Point, b: Point): Point => vec(a.x + b.x, a.y + b.y);
const sub = (a: Point, b: Point): Point => vec(a.x - b.x, a.y - b.y);
const mul = (a: Point, t: number): Point => vec(a.x * t, a.y * t);
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const length = (a: Point) => Math.hypot(a.x, a.y);

export function polygonArea(p: Polygon): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const u = p[i]!, v = p[(i + 1) % p.length]!;
    a += u.x * v.y - v.x * u.y;
  }
  return Math.abs(a) / 2;
}

export function polygonSignedArea(p: Polygon): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const u = p[i]!, v = p[(i + 1) % p.length]!;
    a += u.x * v.y - v.x * u.y;
  }
  return a / 2;
}

export function edgeAt(p: Polygon, index: number): readonly [Point, Point] {
  if (!Number.isInteger(index) || index < 0 || index >= p.length) throw new RangeError('Invalid polygon edge');
  return [p[index]!, p[(index + 1) % p.length]!];
}

export function initialPolygon(shape: TileShape, center: Point = vec(0, 0), size = DEFAULT_SIZE): Polygon {
  if (!(size > 0) || !Number.isFinite(size)) throw new RangeError('Size must be positive and finite');
  if (shape === 'square') {
    const h = size / 2;
    return [vec(center.x - h, center.y - h), vec(center.x + h, center.y - h),
      vec(center.x + h, center.y + h), vec(center.x - h, center.y + h)];
  }
  if (shape === 'triangle') {
    const h = size * Math.sqrt(3) / 2;
    return [vec(center.x, center.y - 2 * h / 3),
      vec(center.x + size / 2, center.y + h / 3),
      vec(center.x - size / 2, center.y + h / 3)];
  }
  throw new RangeError('Unknown shape');
}

/** Dock a new tile along the whole edge, outward from a clockwise-in-screen polygon. */
export function attachPolygon(source: Polygon, edgeIndex: number, shape: TileShape): Polygon {
  if (polygonSignedArea(source) <= EPS) throw new RangeError('Source polygon must be clockwise in screen coordinates');
  const [a, b] = edgeAt(source, edgeIndex);
  const along = sub(b, a);
  const size = length(along);
  if (!(size > EPS)) throw new RangeError('Zero-length edge');
  const outward = vec(along.y / size, -along.x / size);
  if (shape === 'triangle') {
    return [b, a, add(mul(add(a, b), .5), mul(outward, size * Math.sqrt(3) / 2))];
  }
  if (shape === 'square') {
    return [b, a, add(a, mul(outward, size)), add(b, mul(outward, size))];
  }
  throw new RangeError('Unknown shape');
}

export function samePoint(a: Point, b: Point, eps = EPS): boolean {
  return length(sub(a, b)) <= eps;
}
export function sameEdge(a: Point, b: Point, c: Point, d: Point): boolean {
  return (samePoint(a, c) && samePoint(b, d)) || (samePoint(a, d) && samePoint(b, c));
}
export function polygonSharesEdge(a: Polygon, b: Polygon): boolean {
  return a.some((_, i) => {
    const [p, q] = edgeAt(a, i);
    return b.some((__, j) => {
      const [r, s] = edgeAt(b, j);
      return sameEdge(p, q, r, s);
    });
  });
}

/** SAT strict-interior test. Shared vertices and edges do NOT count as collisions. */
export function overlapsArea(a: Polygon, b: Polygon): boolean {
  if (a.length < 3 || b.length < 3) return false;
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [p, q] = edgeAt(poly, i);
      const v = sub(q, p), axis = vec(v.y, -v.x);
      const aproj = a.map(x => dot(x, axis));
      const bproj = b.map(x => dot(x, axis));
      const overlap = Math.min(Math.max(...aproj), Math.max(...bproj))
        - Math.max(Math.min(...aproj), Math.min(...bproj));
      if (overlap <= EPS) return false;
    }
  }
  return true;
}

export function edgeIsOccupied(tiles: readonly Tile[], source: Tile, edgeIndex: number): boolean {
  const [a, b] = edgeAt(source.vertices, edgeIndex);
  return tiles.some(t => t.id !== source.id && t.level === source.level &&
    t.vertices.some((_, j) => {
      const [c, d] = edgeAt(t.vertices, j);
      return sameEdge(a, b, c, d);
    }));
}

export function proposeAttachedTile(
  tiles: readonly Tile[], sourceId: string, edgeIndex: number, shape: TileShape, newId: string
): PlacementResult {
  const source = tiles.find(t => t.id === sourceId);
  if (!source) return { ok: false, reason: 'source-missing' };
  if (!Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= source.vertices.length) {
    return { ok: false, reason: 'invalid-edge' };
  }
  if (edgeIsOccupied(tiles, source, edgeIndex)) return { ok: false, reason: 'edge-occupied' };
  const vertices = attachPolygon(source.vertices, edgeIndex, shape);
  if (tiles.some(t => t.level === source.level && overlapsArea(t.vertices, vertices))) {
    return { ok: false, reason: 'overlap' };
  }
  return { ok: true, tile: { id: newId, shape, level: source.level, vertices },
    joinedTo: { tileId: sourceId, edgeIndex } };
}

export function availableSlots(tiles: readonly Tile[], shape: TileShape): readonly PlacementResult[] {
  const slots: PlacementResult[] = [];
  for (const tile of tiles) for (let i = 0; i < tile.vertices.length; i++) {
    const candidate = proposeAttachedTile(tiles, tile.id, i, shape, `${tile.id}-preview-${i}`);
    if (candidate.ok) slots.push(candidate);
  }
  return slots;
}
