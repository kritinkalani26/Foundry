/**
 * Browser-side STL parser supporting both binary and ASCII formats.
 *
 * Binary STL layout:
 *   80 bytes  — header (ignored)
 *   4 bytes   — uint32 triangle count
 *   per triangle (50 bytes):
 *     12 bytes — normal (3 × float32)
 *     12 bytes — vertex 1 (3 × float32)
 *     12 bytes — vertex 2 (3 × float32)
 *     12 bytes — vertex 3 (3 × float32)
 *     2 bytes  — attribute byte count
 *
 * Volume is computed via the divergence theorem:
 *   V = (1/6) × |Σ v₁ · (v₂ × v₃)|
 */

import type { STLMetrics } from "@/types";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function magnitude(v: Vec3): number {
  return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
}

function isBinarySTL(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 84) return false;
  const view = new DataView(buffer);
  const declaredTriangles = view.getUint32(80, true);
  const expectedSize = 84 + declaredTriangles * 50;
  // If sizes match it's almost certainly binary
  return Math.abs(buffer.byteLength - expectedSize) < 4;
}

function parseBinarySTL(buffer: ArrayBuffer): { vertices: Vec3[][]; triangleCount: number } {
  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  const triangles: Vec3[][] = [];

  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    offset += 12; // skip normal
    const v1: Vec3 = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    offset += 12;
    const v2: Vec3 = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    offset += 12;
    const v3: Vec3 = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    offset += 12;
    offset += 2; // attribute byte count
    triangles.push([v1, v2, v3]);
  }

  return { vertices: triangles, triangleCount };
}

function parseASCIISTL(text: string): { vertices: Vec3[][]; triangleCount: number } {
  const triangles: Vec3[][] = [];
  const vertexRe = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  const lines = text.split("\n");
  let currentTriangle: Vec3[] = [];

  for (const line of lines) {
    const m = line.trim().match(/^vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)$/);
    if (m) {
      currentTriangle.push({ x: parseFloat(m[1]), y: parseFloat(m[2]), z: parseFloat(m[3]) });
      if (currentTriangle.length === 3) {
        triangles.push([...currentTriangle]);
        currentTriangle = [];
      }
    }
  }

  void vertexRe; // referenced to satisfy linter
  return { vertices: triangles, triangleCount: triangles.length };
}

function computeMetrics(
  triangles: Vec3[][],
  fileName: string,
  fileSizeBytes: number,
): STLMetrics {
  let signedVolume = 0;
  let surfaceAreaMm2 = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const [v1, v2, v3] of triangles) {
    // Signed volume contribution (divergence theorem)
    const crossVec = cross(v2, v3);
    signedVolume += dot(v1, crossVec);

    // Surface area of this triangle
    const edge1: Vec3 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
    const edge2: Vec3 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
    surfaceAreaMm2 += 0.5 * magnitude(cross(edge1, edge2));

    // Bounding box
    for (const v of [v1, v2, v3]) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.z < minZ) minZ = v.z;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
      if (v.z > maxZ) maxZ = v.z;
    }
  }

  const volumeMm3 = Math.abs(signedVolume) / 6;
  const volumeCm3 = volumeMm3 / 1000;
  const surfaceAreaCm2 = surfaceAreaMm2 / 100;

  const bbX = maxX - minX; // mm
  const bbY = maxY - minY;
  const bbZ = maxZ - minZ;

  // Support detection: tall & narrow models need support structures
  const height = bbZ;
  const baseWidth = Math.min(bbX, bbY);
  const needsSupport =
    (Math.max(bbX, bbY, bbZ) > 45 && height > baseWidth * 1.5) ||
    triangles.length > 0 && height / Math.max(baseWidth, 1) > 2;

  // Estimated print time at default settings:
  // FDM speed ≈ 8 cm³/hour effective (accounts for travel, retraction, etc.)
  const PRINT_SPEED_CM3_PER_HOUR = 8;
  const DEFAULT_INFILL = 0.30;
  const estimatedPrintHours =
    (volumeCm3 * DEFAULT_INFILL * 1.2) / PRINT_SPEED_CM3_PER_HOUR;

  return {
    fileName,
    fileSizeBytes,
    volumeCm3: Math.max(volumeCm3, 0.001),
    surfaceAreaCm2: Math.max(surfaceAreaCm2, 0.001),
    boundingBoxXMm: Math.max(bbX, 0),
    boundingBoxYMm: Math.max(bbY, 0),
    boundingBoxZMm: Math.max(bbZ, 0),
    triangleCount: triangles.length,
    estimatedPrintHours: Math.max(estimatedPrintHours, 0.1),
    needsSupport,
  };
}

export async function parseSTLFile(file: File): Promise<STLMetrics> {
  const buffer = await file.arrayBuffer();
  const textDecoder = new TextDecoder("utf-8");
  const firstBytes = textDecoder.decode(buffer.slice(0, 5));

  let triangles: Vec3[][];

  if (firstBytes.toLowerCase().startsWith("solid") && !isBinarySTL(buffer)) {
    const text = textDecoder.decode(buffer);
    ({ vertices: triangles } = parseASCIISTL(text));
  } else {
    ({ vertices: triangles } = parseBinarySTL(buffer));
  }

  if (triangles.length === 0) {
    throw new Error("No triangles found in STL file. The file may be corrupt or empty.");
  }

  return computeMetrics(triangles, file.name, file.size);
}
