import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api";

const DETECTION_CLASSES = [
  { label: "Protective Helmet", type: "safe" },
  { label: "Worker without helmet", type: "violation" },
];

const STATUS_LABELS = {
  pending: "Queued for processing...",
  processing: "Running detection model on video...",
  done: "Done. Loading results...",
  error: "Processing failed.",
};

const VIDEO_EXTENSIONS = /\.(mp4|avi|mov|mkv|webm)$/i;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|bmp)$/i;
const VIDEO_TYPES = ["video/mp4", "video/avi", "video/quicktime", "video/x-matroska", "video/webm"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/bmp"];

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
    if (!type) {
      setError("Select a valid file: MP4, AVI, MOV, MKV, JPG, or PNG.");
      return;
    }
    setFile(f);
    setFileType(type);
    setError(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    selectFile(e.dataTransfer.files[0]);
  }, [selectFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();

    if (fileType === "video") {
      formData.append("video", file);
      try {
        const res = await axios.post(`${API}/upload/video`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100)),
        });
        setProcessingStatus("processing");
        startPolling(res.data.video_id);
      } catch (err) {
        setError(err.response?.data?.error ?? "Upload failed. Make sure the backend is running.");
        setUploading(false);
      }
    } else {
      formData.append("image", file);
      try {
        setUploadProgress(100);
        setProcessingStatus("processing");
        const res = await axios.post(`${API}/upload/image`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100)),
        });
        setProcessingStatus("done");
        setTimeout(() => navigate(`/analysis/${res.data.image_id}`), 600);
      } catch (err) {
        setError(err.response?.data?.error ?? "Upload failed. Make sure the backend is running.");
        setUploading(false);
      }
    }
  };

  const startPolling = (videoId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/video/${videoId}/status`);
        setProcessingStatus(res.data.status);
        if (res.data.status === "done") {
          clearInterval(pollRef.current);
          setUploading(false);
          setTimeout(() => navigate(`/analysis/${videoId}`), 800);
        } else if (res.data.status === "error") {
          clearInterval(pollRef.current);
          setUploading(false);
          setError("The model failed to process this video.");
        }
      } catch {
        clearInterval(pollRef.current);
      }
    }, 2500);
  };

  const resetState = () => {
    setFile(null);
    setFileType(null);
    setError(null);
    setUploadProgress(0);
    setProcessingStatus(null);
    setUploading(false);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New analysis</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Upload a video or image to detect PPE compliance with the trained model.
        </p>
      </div>

      <div
        className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all select-none
          ${dragOver ? "border-amber-500 bg-amber-500/5 scale-[1.01]" : "border-zinc-700 hover:border-zinc-500"}
          ${file ? "border-emerald-500/50 bg-emerald-500/5 cursor-default" : ""}
          ${uploading ? "pointer-events-none opacity-70" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !file && !uploading && fileInputRef.current.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !file && fileInputRef.current.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          className="hidden"
          onChange={(e) => selectFile(e.target.files[0])}
        />
        {file ? (
          <div className="space-y-2">
            <div className="text-5xl">{fileType === "video" ? "🎞️" : "🖼️"}</div>
            <p className="text-emerald-400 font-semibold">{file.name}</p>
            <p className="text-zinc-500 text-sm">
              {(file.size / 1024 / 1024).toFixed(1)} MB · {fileType}
            </p>
            {!uploading && (
              <button
                onClick={(e) => { e.stopPropagation(); resetState(); }}
                className="mt-1 text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-5xl">📂</div>
            <p className="text-zinc-300 font-semibold">Drop file here</p>
            <p className="text-zinc-600 text-sm">Video: MP4, AVI, MOV, MKV · Image: JPG, PNG</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {file && !uploading && (
        <button
          onClick={handleUpload}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5"
        >
          Run analysis
        </button>
      )}

      {uploading && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
          {uploadProgress < 100 ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Uploading...</span>
                <span className="text-zinc-300 tabular-nums">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-zinc-300 text-sm">
                {fileType === "image" ? "Running detection model on image..." : STATUS_LABELS[processingStatus] ?? "Processing..."}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
          How it works
        </p>
        <p className="text-zinc-500 text-xs mb-4">
          The model detects every worker, then checks if a safety helmet is present.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {DETECTION_CLASSES.map(({ label, type }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-zinc-400">
              <span className={`w-2 h-2 rounded-full shrink-0 ${type === "safe" ? "bg-emerald-500" : "bg-red-500"}`} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}