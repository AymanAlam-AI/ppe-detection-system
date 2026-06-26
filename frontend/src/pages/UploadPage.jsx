import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api";
const VIDEO_EXTENSIONS = /\.(mp4|avi|mov|mkv|webm)$/i;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|bmp)$/i;
const VIDEO_TYPES = ["video/mp4","video/avi","video/quicktime","video/x-matroska","video/webm"];
const IMAGE_TYPES = ["image/jpeg","image/png","image/bmp"];
const STATUS_LABELS = { pending: "Queued for processing", processing: "Running inference engine", done: "Analysis complete", error: "Processing failed" };

const STEPS = [
  { num: "01", title: "Person detection", desc: "YOLOv8 locates every worker in the frame" },
  { num: "02", title: "PPE classification", desc: "Checks each person for a safety helmet" },
  { num: "03", title: "Violation flagging", desc: "Workers without helmet are marked as violations" },
  { num: "04", title: "Report generation", desc: "Compliance rate, timeline, and annotated output" },
];

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef();
  const pollRef = useRef(null);
  const navigate = useNavigate();

  const detectFileType = (f) => {
    if (VIDEO_TYPES.includes(f.type) || VIDEO_EXTENSIONS.test(f.name)) return "video";
    if (IMAGE_TYPES.includes(f.type) || IMAGE_EXTENSIONS.test(f.name)) return "image";
    return null;
  };

  const selectFile = useCallback((f) => {
    if (!f) return;
    const type = detectFileType(f);
    if (!type) { setError("Unsupported format. Accepted: MP4, AVI, MOV, MKV, JPG, PNG."); return; }
    setFile(f); setFileType(type); setError(null);
  }, []);

  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); selectFile(e.dataTransfer.files[0]); }, [selectFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError(null);
    const formData = new FormData();
    if (fileType === "video") {
      formData.append("video", file);
      try {
        const res = await axios.post(`${API}/upload/video`, formData, { headers: { "Content-Type": "multipart/form-data" }, onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100)) });
        setProcessingStatus("processing");
        pollRef.current = setInterval(async () => {
          try {
            const r = await axios.get(`${API}/video/${res.data.video_id}/status`);
            setProcessingStatus(r.data.status);
            if (r.data.status === "done") { clearInterval(pollRef.current); setUploading(false); setTimeout(() => navigate(`/analysis/${res.data.video_id}`), 600); }
            else if (r.data.status === "error") { clearInterval(pollRef.current); setUploading(false); setError("Inference engine failed to process this file."); }
          } catch { clearInterval(pollRef.current); }
        }, 2500);
      } catch (err) { setError(err.response?.data?.error ?? "Upload failed."); setUploading(false); }
    } else {
      formData.append("image", file);
      try {
        setUploadProgress(100); setProcessingStatus("processing");
        const res = await axios.post(`${API}/upload/image`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        setProcessingStatus("done");
        setTimeout(() => navigate(`/analysis/${res.data.image_id}`), 600);
      } catch (err) { setError(err.response?.data?.error ?? "Upload failed."); setUploading(false); }
    }
  };

  const reset = () => { setFile(null); setFileType(null); setError(null); setUploadProgress(0); setProcessingStatus(null); setUploading(false); if (pollRef.current) clearInterval(pollRef.current); };

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>
      <div>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 8px" }}>Inference Pipeline</p>
        <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "32px", fontWeight: 800, color: "#E6EDF3", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Submit Media for Analysis</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", color: "#7D8590", margin: 0, lineHeight: 1.6 }}>Upload a video or image. The model detects every worker and flags those without safety helmets.</p>
      </div>

      <div
        onClick={() => !file && !uploading && fileInputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? "#F0A500" : file ? "rgba(63,185,80,0.4)" : "#21262D"}`,
          borderRadius: "12px", padding: "56px 40px", textAlign: "center",
          cursor: file || uploading ? "default" : "pointer",
          backgroundColor: dragOver ? "rgba(240,165,0,0.04)" : file ? "rgba(63,185,80,0.04)" : "#0D1117",
          transition: "all 0.2s",
          pointerEvents: uploading ? "none" : "auto",
          opacity: uploading ? 0.7 : 1,
        }}
      >
        <input ref={fileInputRef} type="file" accept="video/*,image/*" style={{ display: "none" }} onChange={(e) => selectFile(e.target.files[0])} />
        {file ? (
          <div>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#3FB950", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>File ready</p>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", fontWeight: 600, color: "#E6EDF3", margin: "0 0 4px" }}>{file.name}</p>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#7D8590", margin: "0 0 16px" }}>{(file.size / 1024 / 1024).toFixed(2)} MB · {fileType?.toUpperCase()}</p>
            {!uploading && <button onClick={(e) => { e.stopPropagation(); reset(); }} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#7D8590", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em" }}>Remove</button>}
          </div>
        ) : (
          <div>
            <div style={{ width: "48px", height: "48px", border: "1px solid #21262D", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2v12M6 5l4-3 4 3" stroke="#7D8590" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 15v3h16v-3" stroke="#7D8590" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#E6EDF3", margin: "0 0 8px" }}>Drop file here or click to browse</p>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#7D8590", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Video: MP4 AVI MOV MKV · Image: JPG PNG</p>
          </div>
        )}
      </div>

      {error && (
        <div style={{ border: "1px solid rgba(218,54,51,0.3)", backgroundColor: "rgba(218,54,51,0.06)", borderRadius: "8px", padding: "12px 16px" }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "#DA3633", margin: 0 }}>{error}</p>
        </div>
      )}

      {file && !uploading && (
        <button
          onClick={handleUpload}
          style={{ width: "100%", backgroundColor: "#F0A500", color: "#080C10", fontFamily: "JetBrains Mono, monospace", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer", padding: "16px", borderRadius: "8px", textTransform: "uppercase", letterSpacing: "0.12em", transition: "background-color 0.2s" }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#D4920A"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#F0A500"}
        >Run Analysis</button>
      )}

      {uploading && (
        <div style={{ border: "1px solid #21262D", borderRadius: "8px", padding: "20px", backgroundColor: "#0D1117" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#7D8590", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
              {uploadProgress < 100 ? "Uploading" : STATUS_LABELS[processingStatus] ?? "Processing"}
            </p>
            {uploadProgress < 100 && <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#E6EDF3", margin: 0 }}>{uploadProgress}%</p>}
          </div>
          {uploadProgress < 100 ? (
            <div style={{ width: "100%", height: "2px", backgroundColor: "#21262D", borderRadius: "1px", overflow: "hidden" }}>
              <div style={{ height: "100%", backgroundColor: "#F0A500", width: `${uploadProgress}%`, transition: "width 0.3s" }} />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "16px", height: "16px", border: "2px solid #F0A500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#7D8590", margin: 0 }}>
                {fileType === "image" ? "Detecting workers and PPE..." : STATUS_LABELS[processingStatus] ?? "Processing..."}
              </p>
            </div>
          )}
        </div>
      )}

      <div style={{ border: "1px solid #21262D", borderRadius: "12px", padding: "28px", backgroundColor: "#0D1117" }}>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 20px" }}>Detection Pipeline</p>
        <div>
          {STEPS.map(({ num, title, desc }, i) => (
            <div key={num} style={{ display: "flex", gap: "20px", paddingBottom: i < STEPS.length - 1 ? "20px" : 0, marginBottom: i < STEPS.length - 1 ? "20px" : 0, borderBottom: i < STEPS.length - 1 ? "1px solid #21262D" : "none" }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#F0A500", flexShrink: 0, marginTop: "2px" }}>{num}</span>
              <div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#E6EDF3", margin: "0 0 4px" }}>{title}</p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7D8590", margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}