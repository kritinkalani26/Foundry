"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import * as THREE from "three";
import type { PartAnalysis } from "@/app/api/analyze-assembly/route";

const PALETTE = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
  "#14B8A6", "#E11D48", "#0EA5E9", "#D97706", "#7C3AED",
  "#059669", "#DC2626", "#2563EB", "#CA8A04", "#9333EA",
];

interface MeshItem {
  geo: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
  partName: string;
  key: string;
}

interface Props {
  file: File;
  parts: PartAnalysis[];
  checked: Set<string>;
  onToggle: (name: string) => void;
}

function norm(s: string) {
  return s
    .replace(/[:<(]\d+[)>]?\s*$/, "")  // strip instance suffixes: ":1", "<2>", "(3)"
    .replace(/_/g, " ")                  // underscores → spaces (OBJ vs STEP name mismatch)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function matchPart(rawName: string, partNorms: Record<string, string>): string {
  const n = norm(rawName);
  // Exact match
  if (partNorms[n]) return partNorms[n];
  // Substring / prefix match
  for (const [pn, orig] of Object.entries(partNorms)) {
    if (n === pn || n.startsWith(pn) || pn.startsWith(n) || n.includes(pn) || pn.includes(n)) return orig;
  }
  // No match — return the raw name so the mesh is still clickable/coloured
  return rawName;
}

// ── Auto-fit camera to the full model ────────────────────────────────────────
function AutoFit({ items }: { items: MeshItem[] }) {
  const { camera, controls } = useThree() as { camera: THREE.PerspectiveCamera; controls: any };
  const done = useRef(false);

  useEffect(() => {
    if (done.current || items.length === 0) return;
    done.current = true;

    const box = new THREE.Box3();
    items.forEach(({ geo, matrix }) => {
      const tmp = new THREE.BufferGeometry();
      tmp.setAttribute("position", geo.getAttribute("position"));
      tmp.applyMatrix4(matrix);
      tmp.computeBoundingBox();
      if (tmp.boundingBox) box.union(tmp.boundingBox);
    });
    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    const size   = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fovRad = camera.fov * (Math.PI / 180);
    const dist   = (maxDim / 2) / Math.tan(fovRad / 2) * 2.2;

    camera.position.set(center.x + dist * 0.5, center.y + dist * 0.5, center.z + dist);
    camera.lookAt(center);
    camera.near = dist * 0.001;
    camera.far  = dist * 100;
    camera.updateProjectionMatrix();
    if (controls) { controls.target.copy(center); controls.update(); }
  }, [items, camera, controls]);

  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function StepViewer({ file, parts, checked, onToggle }: Props) {
  const [items,   setItems]   = useState<MeshItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg,  setErrMsg]  = useState("");
  const [hovered, setHovered] = useState<string | null>(null);

  const colorMap = useMemo(() => {
    const m: Record<string, string> = {};
    parts.forEach((p, i) => { m[p.partName] = PALETTE[i % PALETTE.length]; });
    return m;
  }, [parts]);

  // Convert STEP → OBJ on the server (child process, bypasses webpack), then render
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setItems([]);
    setErrMsg("");

    const form = new FormData();
    form.append("step", file);

    fetch("/api/step-to-obj", { method: "POST", body: form })
      .then(r => {
        if (!r.ok) return r.json().then((d: { error?: string }) => { throw new Error(d.error || "Conversion failed"); });
        return r.text();
      })
      .then(raw => {
      if (cancelled) return;

      const text = raw.split("\n").filter((l: string) => !l.trim().startsWith("mtllib")).join("\n");
      const group = new OBJLoader().parse(text);

      const partNorms: Record<string, string> = {};
      parts.forEach(p => { partNorms[norm(p.partName)] = p.partName; });

      const result: MeshItem[] = [];
      group.updateWorldMatrix(true, true);

      group.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        const rawName  = node.name || (node.parent instanceof THREE.Group ? node.parent.name : "") || "";
        const partName = matchPart(rawName, partNorms);
        const matrix   = new THREE.Matrix4();
        node.updateWorldMatrix(true, false);
        matrix.copy(node.matrixWorld);
        result.push({ geo: node.geometry, matrix, partName, key: `${partName}-${result.length}` });
      });

      if (!cancelled) { setItems(result); setLoading(false); }
    })
    .catch(err => {
      if (!cancelled) { setErrMsg(err?.message || "Failed to load 3D model"); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, [file, parts]);

  const allSelected = checked.size === parts.length;
  const toggleAll = () => {
    if (allSelected) parts.forEach(p => checked.has(p.partName) && onToggle(p.partName));
    else             parts.forEach(p => !checked.has(p.partName) && onToggle(p.partName));
  };

  return (
    <div className="flex rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white" style={{ height: 580 }}>

      {/* ── Canvas ── */}
      <div className="relative flex-1 bg-[#1a1a2e]">

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
            <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mb-3" />
            <p className="text-sm font-medium">Converting STEP to 3D…</p>
            <p className="text-xs text-gray-400 mt-1">This takes 10–60 s depending on complexity</p>
          </div>
        )}

        {errMsg && (
          <div className="absolute inset-0 flex items-center justify-center z-10 px-8 text-center">
            <p className="bg-red-900/70 text-white text-sm rounded-xl px-4 py-3">{errMsg}</p>
          </div>
        )}

        {!loading && !errMsg && (
          <Canvas
            gl={{ antialias: true }}
            camera={{ fov: 45, near: 0.01, far: 1_000_000 }}
            style={{ background: "#1a1a2e" }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 7]} intensity={1.0} />
            <directionalLight position={[-5, -5, -5]} intensity={0.3} />

            {items.map(item => {
              const color      = colorMap[item.partName] ?? "#9CA3AF";
              const anyChecked = checked.size > 0;
              const selected   = checked.has(item.partName);
              const dimmed     = anyChecked && !selected;
              const isHov      = hovered === item.partName;
              const opacity    = isHov ? 1.0 : dimmed ? 0.12 : 1.0;

              return (
                <mesh
                  key={item.key}
                  geometry={item.geo}
                  matrixAutoUpdate={false}
                  matrix={item.matrix}
                  onClick={e => { e.stopPropagation(); onToggle(item.partName); }}
                  onPointerOver={e => { e.stopPropagation(); setHovered(item.partName); document.body.style.cursor = "pointer"; }}
                  onPointerOut={() => { setHovered(null); document.body.style.cursor = "default"; }}
                >
                  <meshStandardMaterial
                    color={color}
                    transparent={opacity < 1}
                    opacity={opacity}
                    roughness={0.5}
                    metalness={0.1}
                    side={THREE.DoubleSide}
                    depthWrite={!dimmed}
                  />
                </mesh>
              );
            })}

            <OrbitControls makeDefault enablePan enableZoom enableRotate />
            <AutoFit items={items} />
          </Canvas>
        )}

        {hovered && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none backdrop-blur-sm">
            {hovered}
          </div>
        )}

        {!loading && !errMsg && (
          <div className="absolute bottom-3 left-3 text-[10px] text-gray-400 bg-black/40 px-2.5 py-1 rounded-lg backdrop-blur-sm pointer-events-none">
            Drag · rotate &nbsp;|&nbsp; Scroll · zoom &nbsp;|&nbsp; Click part · select
          </div>
        )}
      </div>

      {/* ── Sidebar ── */}
      <div className="w-72 flex flex-col border-l border-gray-100 shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Components</h3>
            <p className="text-xs text-gray-400">{checked.size} / {parts.length} selected</p>
          </div>
          <button onClick={toggleAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {parts.map(part => {
            const color      = colorMap[part.partName] ?? "#9CA3AF";
            const isChecked  = checked.has(part.partName);
            const anyChecked = checked.size > 0;
            const isHov      = hovered === part.partName;
            return (
              <button
                key={part.partName}
                onClick={() => onToggle(part.partName)}
                onMouseEnter={() => setHovered(part.partName)}
                onMouseLeave={() => setHovered(null)}
                className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors
                  ${isHov ? "bg-gray-50" : ""}
                  ${isChecked && anyChecked ? "bg-blue-50/50" : ""}`}
              >
                <div
                  className="w-3 h-3 rounded-sm shrink-0 ring-2 ring-white"
                  style={{ background: color, opacity: (!anyChecked || isChecked) ? 1 : 0.3 }}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate leading-tight ${(!anyChecked || isChecked) ? "text-gray-900" : "text-gray-400"}`}>
                    {part.partName}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {part.process} · ₹{part.estimatedCostInr.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${isChecked ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}>
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
