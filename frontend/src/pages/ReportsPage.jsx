import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api";

function StatusBadge({ status }) {
  const map = {
    done: { color: "#3FB950", bg: "rgba(63,185,80,0.1)", border: "rgba(63,185,80,0.25)" },
    processing: { color: "#388BFD", bg: "rgba(56,139,253,0.1)", border: "rgba(56,139,253,0.25)" },
    pending: { color: "#F0A500", bg: "rgba(240,165,0,0.1)", border: "rgba(240,165,0,0.25)" },
    error: { color: "#DA3633", bg: "rgba(218,54,51,0.1)", border: "rgba(218,54,51,0.25)" },
  };
  const s = map[status] ?? { color: "#7D8590", bg: "rgba(125,133,144,0.1)", border: "rgba(125,133,144,0.25)" };
  return (
    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", fontWeight: 700, color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: "4px", padding: "3px 8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
      {status}
    </span>
  );
}

export default function ReportsPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    axios.get(`${API}/analyses`).then((r) => setAnalyses(r.data.analyses)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try { await axios.delete(`${API}/video/${id}`); setAnalyses((p) => p.filter((a) => a.id !== id)); }
    finally { setDeletingId(null); setConfirmId(null); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ width: "20px", height: "20px", border: "2px solid #F0A500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const videoCount = analyses.filter((a) => a.media_type === "video").length;
  const imageCount = analyses.filter((a) => a.media_type === "image").length;
  const violationCount = analyses.filter((a) => (a.inferred_violations ?? 0) > 0).length;

  const filters = [
    { key: "all", label: "All", count: analyses.length },
    { key: "videos", label: "Video", count: videoCount },
    { key: "images", label: "Image", count: imageCount },
    { key: "violations", label: "Violations", count: violationCount },
  ];

  const filtered = analyses.filter((a) => {
    if (filter === "videos") return a.media_type === "video";
    if (filter === "images") return a.media_type === "image";
    if (filter === "violations") return (a.inferred_violations ?? 0) > 0;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 8px" }}>Analysis Archive</p>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "32px", fontWeight: 800, color: "#E6EDF3", margin: "0 0 4px", letterSpacing: "-0.02em" }}>Reports</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", color: "#7D8590", margin: 0 }}>
            {videoCount} video{videoCount !== 1 ? "s" : ""} · {imageCount} image{imageCount !== 1 ? "s" : ""} processed
          </p>
        </div>
        <Link to="/upload" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", fontWeight: 700, color: "#080C10", backgroundColor: "#F0A500", textDecoration: "none", padding: "12px 20px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.1em" }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#D4920A"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#F0A500"}
        >+ New Upload</Link>
      </div>

      {analyses.length > 0 && (
        <div style={{ display: "flex", gap: "4px", backgroundColor: "#0D1117", border: "1px solid #21262D", borderRadius: "8px", padding: "4px", width: "fit-content" }}>
          {filters.map(({ key, label, count }) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: "10px", fontWeight: filter === key ? 700 : 400,
              color: filter === key ? "#080C10" : "#7D8590",
              backgroundColor: filter === key ? "#F0A500" : "transparent",
              border: "none", cursor: "pointer", padding: "6px 14px", borderRadius: "5px",
              textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 0.15s",
            }}>
              {label} ({count})
            </button>
          ))}
        </div>
      )}

      {analyses.length === 0 ? (
        <div style={{ border: "1px solid #21262D", borderRadius: "12px", padding: "64px", textAlign: "center", backgroundColor: "#0D1117" }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 8px" }}>Archive empty</p>
          <Link to="/upload" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#F0A500", textDecoration: "none" }}>Upload a file to begin →</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ border: "1px solid #21262D", borderRadius: "12px", padding: "40px", textAlign: "center", backgroundColor: "#0D1117" }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#4A5568" }}>No files match this filter</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((a) => {
            const pass = (a.compliance_rate ?? 0) >= 80;
            const hasViolations = (a.inferred_violations ?? 0) > 0;
            return (
              <div key={a.id}
                style={{ border: "1px solid #21262D", borderRadius: "12px", overflow: "hidden", backgroundColor: "#0D1117", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#30363D"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#21262D"}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#161B22", border: "1px solid #21262D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#7D8590", textTransform: "uppercase" }}>{a.media_type === "image" ? "IMG" : "VID"}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, color: "#E6EDF3", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "320px" }}>{a.original_filename}</p>
                      <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#4A5568", margin: 0 }}>
                        {new Date(a.upload_time).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
                    <StatusBadge status={a.status} />
                    {a.status === "done" && (
                      <Link to={`/analysis/${a.id}`} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#F0A500", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.08em" }}>View →</Link>
                    )}
                    {confirmId === a.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#7D8590" }}>Delete?</span>
                        <button onClick={() => handleDelete(a.id)} disabled={deletingId === a.id}
                          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#DA3633", border: "1px solid rgba(218,54,51,0.3)", backgroundColor: "transparent", borderRadius: "4px", padding: "3px 8px", cursor: "pointer" }}>
                          {deletingId === a.id ? "..." : "Yes"}
                        </button>
                        <button onClick={() => setConfirmId(null)}
                          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#7D8590", border: "1px solid #21262D", backgroundColor: "transparent", borderRadius: "4px", padding: "3px 8px", cursor: "pointer" }}>
                          No
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmId(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#4A5568", transition: "color 0.15s", padding: "4px" }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "#DA3633"}
                        onMouseLeave={(e) => e.currentTarget.style.color = "#4A5568"}
                        title="Delete">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <path d="M1 3h11M4 3V2h5v1M4.5 5.5v4M8.5 5.5v4M2 3l.8 8h7.4L11 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {a.status === "done" && (
                  <div style={{ borderTop: "1px solid #21262D", padding: "14px 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", backgroundColor: "rgba(22,27,34,0.5)" }}>
                    {[
                      { label: "Workers", value: a.estimated_people ?? 0, color: "#388BFD" },
                      { label: "Without helmet", value: a.inferred_violations ?? 0, color: hasViolations ? "#DA3633" : "#3FB950" },
                      { label: "Compliance", value: `${a.compliance_rate?.toFixed(1)}%`, color: pass ? "#3FB950" : "#DA3633" },
                      { label: a.media_type === "image" ? "Type" : "Duration", value: a.media_type === "image" ? "Image" : `${a.duration_seconds?.toFixed(0)}s`, color: "#7D8590" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px" }}>{label}</p>
                        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "18px", fontWeight: 700, color, margin: 0, letterSpacing: "-0.01em" }}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {a.status === "processing" && (
                  <div style={{ borderTop: "1px solid #21262D", padding: "12px 24px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "12px", height: "12px", border: "2px solid #388BFD", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                    <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#388BFD", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Processing</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}