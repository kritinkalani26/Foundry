"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, File, X, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { parseSTLFile } from "@/lib/stl-parser";
import type { STLMetrics } from "@/types";

interface STLUploaderProps {
  onAnalyzed: (file: File, metrics: STLMetrics) => void;
}

const MAX_FILE_SIZE_MB = 50;

export default function STLUploader({ onAnalyzed }: STLUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.name.toLowerCase().endsWith(".stl")) {
        setError("Please upload an .STL file. Other 3D formats are not supported yet.");
        return;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }

      setSelectedFile(file);
      setIsAnalyzing(true);

      try {
        const metrics = await parseSTLFile(file);
        onAnalyzed(file, metrics);
      } catch (err) {
        setError(
          err instanceof Error
            ? `Failed to parse STL: ${err.message}`
            : "Unknown error parsing STL file.",
        );
        setSelectedFile(null);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [onAnalyzed],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div style={{ width: "100%" }}>
      <input
        ref={inputRef}
        type="file"
        accept=".stl"
        style={{ display: "none" }}
        onChange={handleChange}
      />

      {!selectedFile && !isAnalyzing ? (
        <div
          className={`dropzone${isDragOver ? " dropzone-active" : ""}`}
          style={{ padding: "80px 48px", minHeight: 380 }}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <div
            className="dropzone-icon"
            style={{ width: 108, height: 108, marginBottom: 28, boxShadow: "0 8px 24px rgba(249,115,22,.15)" }}
          >
            <Upload size={52} color="#F97316" />
          </div>

          <p className="dropzone-title" style={{ fontSize: 26, marginBottom: 12 }}>
            Drop your STL file here
          </p>
          <p className="dropzone-sub" style={{ fontSize: 16, marginBottom: 32 }}>
            or click anywhere to browse your files
          </p>

          <div className="dropzone-features" style={{ marginBottom: 36, gap: 28 }}>
            <span className="dropzone-feature" style={{ fontSize: 14 }}>
              <span style={{ color: "#22C55E", fontWeight: 700 }}>✓</span> Binary &amp; ASCII STL
            </span>
            <span className="dropzone-feature" style={{ fontSize: 14 }}>
              <span style={{ color: "#22C55E", fontWeight: 700 }}>✓</span> Up to 50 MB
            </span>
            <span className="dropzone-feature" style={{ fontSize: 14 }}>
              <span style={{ color: "#22C55E", fontWeight: 700 }}>✓</span> Parsed in-browser
            </span>
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ fontSize: 17, padding: "16px 48px", boxShadow: "0 6px 20px rgba(249,115,22,.35)" }}
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          >
            <Upload size={20} style={{ marginRight: 8 }} />
            Select STL File
          </button>
        </div>
      ) : isAnalyzing ? (
        <div
          style={{
            border: "2px dashed #FED7AA",
            borderRadius: 20,
            padding: "64px 40px",
            textAlign: "center",
            background: "#FFF7ED",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{
              width: 96, height: 96, borderRadius: "50%",
              background: "#FFF7ED", border: "3px solid #FED7AA",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Loader2 size={44} color="#F97316" className="spin" />
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
                Analyzing your model...
              </p>
              <p style={{ fontSize: 14, color: "#9CA3AF" }}>
                Computing volume, surface area, bounding box, and complexity
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9CA3AF" }}>
              <File size={14} />
              {selectedFile?.name}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: "20px 24px",
          background: "#F0FDF4",
          border: "2px solid #86EFAC",
          borderRadius: 16,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: "#DCFCE7",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <CheckCircle size={26} color="#16A34A" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, color: "#15803D", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedFile?.name}
            </p>
            <p style={{ fontSize: 13, color: "#16A34A", marginTop: 3 }}>
              {selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : 0} MB · Analysis complete
            </p>
          </div>
          <button
            style={{
              padding: "6px 8px", borderRadius: 8, background: "none", border: "none",
              cursor: "pointer", color: "#6B7280",
            }}
            onClick={() => { setSelectedFile(null); setError(null); }}
            aria-label="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-red" style={{ marginTop: 12 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
