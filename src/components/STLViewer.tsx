"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { STLMetrics } from "@/types";

interface STLViewerProps {
  file: File;
  metrics: STLMetrics;
}

export default function STLViewer({ file, metrics }: STLViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    // ── Scene setup ───────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // ── Lighting ─────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(1, 2, 3);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffeedd, 0.4);
    dirLight2.position.set(-2, -1, -2);
    scene.add(dirLight2);

    // ── Load STL ─────────────────────────────────────────
    file.arrayBuffer().then((buffer) => {
      const geometry = loadSTLGeometry(buffer);
      geometry.computeVertexNormals();
      geometry.center();

      const material = new THREE.MeshPhongMaterial({
        color: 0xff6b35,
        specular: 0x333333,
        shininess: 40,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      scene.add(mesh);

      // ── Bounding box wireframe ────────────────────────
      const box = new THREE.BoxHelper(mesh, 0x94a3b8);
      scene.add(box);

      // ── Grid ─────────────────────────────────────────
      const bbox = new THREE.Box3().setFromObject(mesh);
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      const gridSize = maxDim * 2;
      const gridHelper = new THREE.GridHelper(gridSize, 10, 0xd1d5db, 0xe5e7eb);
      gridHelper.position.y = bbox.min.y;
      scene.add(gridHelper);

      // ── Camera positioning ────────────────────────────
      const fitDistance = maxDim * 1.8;
      camera.position.set(fitDistance * 0.8, fitDistance * 0.6, fitDistance);
      camera.lookAt(0, 0, 0);

      // ── Orbit controls (manual implementation) ───────
      let isDragging = false;
      let previousMouse = { x: 0, y: 0 };
      let theta = 45;  // horizontal angle
      let phi = 30;    // vertical angle
      let radius = fitDistance;

      function updateCamera() {
        const thetaRad = (theta * Math.PI) / 180;
        const phiRad = (phi * Math.PI) / 180;
        camera.position.x = radius * Math.sin(thetaRad) * Math.cos(phiRad);
        camera.position.y = radius * Math.sin(phiRad);
        camera.position.z = radius * Math.cos(thetaRad) * Math.cos(phiRad);
        camera.lookAt(0, 0, 0);
      }

      canvas.addEventListener("mousedown", (e) => {
        isDragging = true;
        previousMouse = { x: e.clientX, y: e.clientY };
      });

      canvas.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - previousMouse.x;
        const dy = e.clientY - previousMouse.y;
        theta -= dx * 0.5;
        phi = Math.max(-85, Math.min(85, phi + dy * 0.5));
        previousMouse = { x: e.clientX, y: e.clientY };
        updateCamera();
      });

      canvas.addEventListener("mouseup", () => { isDragging = false; });
      canvas.addEventListener("mouseleave", () => { isDragging = false; });

      canvas.addEventListener("wheel", (e) => {
        radius = Math.max(maxDim * 0.5, Math.min(maxDim * 5, radius + e.deltaY * 0.1));
        updateCamera();
        e.preventDefault();
      }, { passive: false });

      // Touch support
      let lastTouchDist = 0;
      canvas.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
          isDragging = true;
          previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.touches.length === 2) {
          lastTouchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
        }
      });

      canvas.addEventListener("touchmove", (e) => {
        if (e.touches.length === 1 && isDragging) {
          const dx = e.touches[0].clientX - previousMouse.x;
          const dy = e.touches[0].clientY - previousMouse.y;
          theta -= dx * 0.5;
          phi = Math.max(-85, Math.min(85, phi + dy * 0.5));
          previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          updateCamera();
        }
        if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
          radius = Math.max(maxDim * 0.5, Math.min(maxDim * 5, radius - (dist - lastTouchDist) * 0.2));
          lastTouchDist = dist;
          updateCamera();
        }
        e.preventDefault();
      }, { passive: false });

      canvas.addEventListener("touchend", () => { isDragging = false; });

      updateCamera();
    });

    // ── Render loop ───────────────────────────────────────
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    // ── Cleanup ───────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="stl-viewer-canvas w-full h-full"
        style={{ touchAction: "none" }}
      />
      {/* Dimension overlay */}
      <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs rounded-lg px-3 py-2 font-mono">
        <div className="grid grid-cols-3 gap-x-4 gap-y-0.5">
          <span className="text-gray-400">X</span>
          <span className="text-gray-400">Y</span>
          <span className="text-gray-400">Z</span>
          <span>{metrics.boundingBoxXMm.toFixed(1)}mm</span>
          <span>{metrics.boundingBoxYMm.toFixed(1)}mm</span>
          <span>{metrics.boundingBoxZMm.toFixed(1)}mm</span>
        </div>
      </div>
      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs rounded-lg px-3 py-1.5">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}

// Parse STL buffer into a Three.js BufferGeometry without the STLLoader dep
function loadSTLGeometry(buffer: ArrayBuffer): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const view = new DataView(buffer);

  // Detect binary vs ASCII
  const firstBytes = new TextDecoder().decode(buffer.slice(0, 5));
  let positions: number[];

  if (firstBytes.toLowerCase().startsWith("solid") && !looksLikeBinary(view)) {
    positions = parseASCIIPositions(new TextDecoder().decode(buffer));
  } else {
    positions = parseBinaryPositions(view);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function looksLikeBinary(view: DataView): boolean {
  if (view.byteLength < 84) return false;
  const count = view.getUint32(80, true);
  return Math.abs(view.byteLength - (84 + count * 50)) < 4;
}

function parseBinaryPositions(view: DataView): number[] {
  const count = view.getUint32(80, true);
  const positions: number[] = [];
  let offset = 84;
  for (let i = 0; i < count; i++) {
    offset += 12; // skip normal
    for (let v = 0; v < 3; v++) {
      positions.push(view.getFloat32(offset, true));
      positions.push(view.getFloat32(offset + 4, true));
      positions.push(view.getFloat32(offset + 8, true));
      offset += 12;
    }
    offset += 2;
  }
  return positions;
}

function parseASCIIPositions(text: string): number[] {
  const positions: number[] = [];
  const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    positions.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  return positions;
}
