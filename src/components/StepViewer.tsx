"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { PartAnalysis } from "@/app/api/analyze-assembly/route";

// 20 visually distinct colours
const PALETTE = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
  "#14B8A6", "#E11D48", "#0EA5E9", "#D97706", "#7C3AED",
  "#059669", "#DC2626", "#2563EB", "#CA8A04", "#9333EA",
];

interface ParsedMesh {
  id: string;
  partName: string;   // matched to a PartAnalysis.partName
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

interface Props {
  file: File;
  parts: PartAnalysis[];
  checked: Set<string>;
  onToggle: (partName: string) => void;
}

// ─── name normaliser (strips Fusion 360 instance suffixes, lowercases) ───────
function norm(s: string): string {
  return s
    .replace(/[:<(]\d+[)>]?$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// ─── Auto-fit camera to the full model ──────────────────────────────────────
function AutoFit({ meshes }: { meshes: ParsedMesh[] }) {
  const { camera, controls } = useThree() as { camera: THREE.PerspectiveCamera; controls: any };
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || meshes.length === 0) return;
    fitted.current = true;

    const box = new THREE.Box3();
    meshes.forEach(m => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(m.positions.slice(), 3));
      geo.computeBoundingBox();
      if (geo.boundingBox) box.union(geo.boundingBox);
    });

    const center = new THREE.Vector3();
    const size   = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim   = Math.max(size.x, size.y, size.z);
    const fovRad   = camera.fov * (Math.PI / 180);
    const distance = (maxDim / 2) / Math.tan(fovRad / 2) * 2.2;

    camera.position.set(center.x + distance * 0.6, center.y + distance * 0.4, center.z + distance);
    camera.lookAt(center);
    camera.near = distance * 0.001;
    camera.far  = distance * 100;
    camera.updateProjectionMatrix();

    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
  }, [meshes, camera, controls]);

  return null;
}

// ─── Individual mesh rendered in Three.js ────────────────────────────────────
function PartMesh({
  mesh, color, selected, dimmed, hovered,
  onClick, onEnter, onLeave,
}: {
  mesh: ParsedMesh;
  color: string;
  selected: boolean;
  dimmed: boolean;
  hovered: boolean;
  onClick: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    geo.setAttribute("normal",   new THREE.BufferAttribute(mesh.normals, 3));
    geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    geo.computeBoundingSphere();
    return geo;
  }, [mesh]);

  const opacity = hovered ? 1.0 : dimmed ? 0.18 : 1.0;
  const emissive = hovered || selected ? new THREE.Color(color).multiplyScalar(0.15) : new THREE.Color(0, 0, 0);

  return (
    <mesh
      geometry={geometry}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onPointerOver={e => { e.stopPropagation(); onEnter(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { onLeave(); document.body.style.cursor = "default"; }}
    >
      <meshStandardMaterial
        color={color}
        transparent={dimmed}
        opacity={opacity}
        roughness={0.45}
        metalness={0.15}
        emissive={emissive}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function StepViewer({ file, parts, checked, onToggle }: Props) {
  const [meshes, setMeshes]     = useState<ParsedMesh[]>([]);
  const [phase, setPhase]       = useState<"loading" | "done" | "error">("loading");
  const [errMsg, setErrMsg]     = useState("");
  const [hovered, setHovered]   = useState<string | null>(null);

  // Stable colour map: part index → hex colour
  const colorMap = useMemo(() => {
    const m: Record<string, string> = {};
    parts.forEach((p, i) => { m[p.partName] = PALETTE[i % PALETTE.length]; });
    return m;
  }, [parts]);

  // Parse the STEP file in the browser using occt-import-js (WASM)
  useEffect(() => {
    let cancelled = false;
    setPhase("loading");

    (async () => {
      try {
        // Dynamic import keeps the 15 MB WASM out of the initial bundle
        const mod  = await import("occt-import-js");
        const init = mod.default as (opts?: object) => Promise<any>;
        const occt = await init();

        const bytes  = new Uint8Array(await file.arrayBuffer());
        const result = occt.ReadStepFile(bytes, null);

        if (cancelled) return;
        if (!result.success) throw new Error("STEP parse failed");

        const partNorms: Record<string, string> = {};
        parts.forEach(p => { partNorms[norm(p.partName)] = p.partName; });

        const parsed: ParsedMesh[] = [];

        for (let mi = 0; mi < result.meshCount; mi++) {
          const mesh      = result.GetMesh(mi);
          const rawName   = (mesh.name as string | undefined) || `Part ${mi + 1}`;
          const normName  = norm(rawName);

          // Find best-matching analyzed part name
          let matched = rawName;
          if (partNorms[normName]) {
            matched = partNorms[normName];
          } else {
            // Prefix / substring fallback
            const entries = Object.entries(partNorms);
            for (let ei = 0; ei < entries.length; ei++) {
              const [pn, orig] = entries[ei];
              if (normName.startsWith(pn) || pn.startsWith(normName)) {
                matched = orig;
                break;
              }
            }
          }

          const vCount = mesh.VertexCount() as number;
          const tCount = mesh.TriangleCount() as number;
          if (vCount === 0 || tCount === 0) continue;

          const positions = new Float32Array(vCount * 3);
          const normals   = new Float32Array(vCount * 3);
          const indices   = new Uint32Array(tCount * 3);

          for (let v = 0; v < vCount; v++) {
            const vtx = mesh.GetVertex(v) as { x: number; y: number; z: number };
            positions[v * 3]     = vtx.x;
            positions[v * 3 + 1] = vtx.y;
            positions[v * 3 + 2] = vtx.z;
            const nrm = mesh.GetNormal(v) as { x: number; y: number; z: number };
            normals[v * 3]     = nrm.x;
            normals[v * 3 + 1] = nrm.y;
            normals[v * 3 + 2] = nrm.z;
          }

          for (let t = 0; t < tCount; t++) {
            const tri = mesh.GetTriangle(t) as { v0: number; v1: number; v2: number };
            indices[t * 3]     = tri.v0;
            indices[t * 3 + 1] = tri.v1;
            indices[t * 3 + 2] = tri.v2;
          }

          parsed.push({ id: `m${mi}`, partName: matched, positions, normals, indices });
        }

        if (cancelled) return;
        setMeshes(parsed);
        setPhase("done");
      } catch (err) {
        if (!cancelled) {
          setErrMsg(err instanceof Error ? err.message : "Failed to load model");
          setPhase("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [file, parts]);

  const allSelected = checked.size === parts.length;

  return (
    <div className="flex rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white" style={{ height: 580 }}>

      {/* ── 3-D canvas ── */}
      <div className="relative flex-1 bg-[#1a1a2e]">
        {phase === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
            <div className="animate-spin w-9 h-9 border-4 border-blue-400 border-t-transparent rounded-full mb-3" />
            <p className="text-sm font-medium">Parsing STEP geometry…</p>
            <p className="text-xs text-gray-400 mt-1">First load takes ~5 s (CAD engine initialising)</p>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 px-8 text-center">
            <p className="text-3xl mb-3">⚠️</p>
            <p className="text-sm text-red-400 font-medium">{errMsg}</p>
            <p className="text-xs text-gray-500 mt-2">
              3-D rendering failed — the part analysis above is still accurate.
            </p>
          </div>
        )}

        {phase === "done" && (
          <Canvas
            gl={{ antialias: true, alpha: false }}
            camera={{ fov: 45, near: 0.01, far: 1_000_000 }}
            style={{ background: "#1a1a2e" }}
          >
            <ambientLight intensity={0.55} />
            <directionalLight position={[1, 2, 1.5]} intensity={0.9} />
            <directionalLight position={[-1, -1, -0.5]} intensity={0.35} />

            <Suspense fallback={null}>
              {meshes.map(mesh => {
                const color    = colorMap[mesh.partName] ?? "#9CA3AF";
                const selected = checked.has(mesh.partName);
                const dimmed   = !selected;
                const isHovered = hovered === mesh.partName;

                return (
                  <PartMesh
                    key={mesh.id}
                    mesh={mesh}
                    color={color}
                    selected={selected}
                    dimmed={dimmed && !isHovered}
                    hovered={isHovered}
                    onClick={() => onToggle(mesh.partName)}
                    onEnter={() => setHovered(mesh.partName)}
                    onLeave={() => setHovered(null)}
                  />
                );
              })}
            </Suspense>

            <OrbitControls makeDefault enablePan enableZoom enableRotate />
            <AutoFit meshes={meshes} />
          </Canvas>
        )}

        {/* Controls hint */}
        {phase === "done" && (
          <div className="absolute bottom-3 left-3 text-[10px] text-gray-400 bg-black/40 px-2.5 py-1 rounded-lg backdrop-blur-sm pointer-events-none">
            Drag · rotate &nbsp;|&nbsp; Scroll · zoom &nbsp;|&nbsp; Right-drag · pan
          </div>
        )}
      </div>

      {/* ── Part list sidebar ── */}
      <div className="w-72 flex flex-col border-l border-gray-100 shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Components</h3>
            <p className="text-xs text-gray-400">{checked.size} / {parts.length} selected</p>
          </div>
          <button
            onClick={() => {
              if (allSelected) {
                parts.forEach(p => checked.has(p.partName) && onToggle(p.partName));
              } else {
                parts.forEach(p => !checked.has(p.partName) && onToggle(p.partName));
              }
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {parts.map((part) => {
            const color     = colorMap[part.partName] ?? "#9CA3AF";
            const isChecked = checked.has(part.partName);
            const isHov     = hovered === part.partName;

            return (
              <button
                key={part.partName}
                onClick={() => onToggle(part.partName)}
                onMouseEnter={() => setHovered(part.partName)}
                onMouseLeave={() => setHovered(null)}
                className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors
                  ${isHov ? "bg-gray-50" : ""}
                  ${isChecked ? "bg-blue-50/50" : ""}`}
              >
                {/* Colour dot */}
                <div
                  className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white"
                  style={{ background: color, opacity: isChecked ? 1 : 0.3 }}
                />

                {/* Name + process */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate leading-tight ${isChecked ? "text-gray-900" : "text-gray-400"}`}>
                    {part.partName}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {part.process} &nbsp;·&nbsp; ₹{part.estimatedCostInr.toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Checkbox */}
                <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                  isChecked ? "border-blue-600 bg-blue-600" : "border-gray-300"
                }`}>
                  {isChecked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
