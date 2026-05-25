export interface STLResult {
  triangleCount: number;
  volumeCm3: number;
  surfaceAreaCm2: number;
  boundingBoxXMm: number;
  boundingBoxYMm: number;
  boundingBoxZMm: number;
}

interface Vec3 { x: number; y: number; z: number }

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function isBinary(buf: Buffer): boolean {
  if (buf.length < 84) return false;
  const numTriangles = buf.readUInt32LE(80);
  return 84 + numTriangles * 50 === buf.length;
}

function computeStats(triangles: Vec3[][]): STLResult {
  let volume = 0;
  let surfaceArea = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const [v0, v1, v2] of triangles) {
    volume +=
      v0.x * (v1.y * v2.z - v2.y * v1.z) +
      v1.x * (v2.y * v0.z - v0.y * v2.z) +
      v2.x * (v0.y * v1.z - v1.y * v0.z);

    const a = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    const b = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
    const c = cross(a, b);
    surfaceArea += Math.sqrt(c.x * c.x + c.y * c.y + c.z * c.z) / 2;

    for (const v of [v0, v1, v2]) {
      if (v.x < minX) minX = v.x; if (v.y < minY) minY = v.y; if (v.z < minZ) minZ = v.z;
      if (v.x > maxX) maxX = v.x; if (v.y > maxY) maxY = v.y; if (v.z > maxZ) maxZ = v.z;
    }
  }

  return {
    triangleCount: triangles.length,
    volumeCm3: Math.abs(volume) / 6 / 1000,
    surfaceAreaCm2: surfaceArea / 100,
    boundingBoxXMm: triangles.length ? maxX - minX : 0,
    boundingBoxYMm: triangles.length ? maxY - minY : 0,
    boundingBoxZMm: triangles.length ? maxZ - minZ : 0,
  };
}

function parseBinary(buf: Buffer): STLResult {
  const numTriangles = buf.readUInt32LE(80);
  const triangles: Vec3[][] = [];
  for (let i = 0; i < numTriangles; i++) {
    const base = 84 + i * 50 + 12;
    const v0 = { x: buf.readFloatLE(base), y: buf.readFloatLE(base + 4), z: buf.readFloatLE(base + 8) };
    const v1 = { x: buf.readFloatLE(base + 12), y: buf.readFloatLE(base + 16), z: buf.readFloatLE(base + 20) };
    const v2 = { x: buf.readFloatLE(base + 24), y: buf.readFloatLE(base + 28), z: buf.readFloatLE(base + 32) };
    triangles.push([v0, v1, v2]);
  }
  return computeStats(triangles);
}

function parseASCII(buf: Buffer): STLResult {
  const text = buf.toString("utf8");
  const vertexRe = /vertex\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)/g;
  const verts: Vec3[] = [];
  let m: RegExpExecArray | null;
  while ((m = vertexRe.exec(text)) !== null) {
    verts.push({ x: parseFloat(m[1]), y: parseFloat(m[2]), z: parseFloat(m[3]) });
  }
  const triangles: Vec3[][] = [];
  for (let i = 0; i + 2 < verts.length; i += 3) {
    triangles.push([verts[i], verts[i + 1], verts[i + 2]]);
  }
  return computeStats(triangles);
}

export function parseSTL(buf: Buffer): STLResult {
  return isBinary(buf) ? parseBinary(buf) : parseASCII(buf);
}
