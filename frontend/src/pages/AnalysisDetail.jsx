import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api";

function DataCard({ label, value, color }) {
  return (
    <div style={{ border: "1px solid #21262D", borderRadius: "10px", padding: "20px", backgroundColor: "#0D1117" }}>
      <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 10px" }}>{label}</p>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "28px", fontWeight: 800, color: color ?? "#E6EDF3", margin: 0, letterSpacing: "-0.02em" }}>{value ?? 0}</p>
    </div>
  );
}

export default function AnalysisDetail() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  const load = async () => {
    try {
      const s = await axios.get(`${API}/video/${id}/status`);
      setStatus(s.data.status);
      if (s.data.status === "done") {
        const [r, rep] = await Promise.all([axios.get(`${API}/video/${id}/result`), axios.get(`${API}/report/${id}`)]);
        setAnalysis(r.data); setReport(rep.data); setLoading(false);
      } else if (s.data.status === "processing" || s.data.status === "pending") {
        setLoading(false);
        pollRef.current = setInterval(async () => {
          const r = await axios.get(`${API}/video/${id}/status`);
          if (r.data.status === "done") { clearInterval(pollRef.current); load(); }
          else if (r.data.status === "error") { clearInterval(pollRef.current); setStatus("error"); }
        }, 3000);
      } else { setLoading(false); }
    } catch { setLoading(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ width: "20px", height: "20px", border: "2px solid #F0A500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (status === "processing" || status === "pending") return (
    <div style={{ textAlign: "center", padding: "100px 0" }}>
      <div style={{ width: "40px", height: "40px", border: "2px solid #F0A500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", color: "#E6EDF3", margin: "0 0 8px" }}>Analyzing...</p>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#7D8590", margin: 0 }}>This may take a few minutes depending on file length.</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!analysis) return (
    <div style={{ textAlign: "center", padding: "100px 0" }}>
      <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 8px" }}>Not found</p>
      <Link to="/reports" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#F0A500", textDecoration: "none" }}>← Back to reports</Link>
    </div>
  );

  const classChartData = Object.entries(analysis.class_counts ?? {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const estimatedPeople = analysis.estimated_people ?? 0;
  const inferredViolations = analysis.inferred_violations ?? 0;
  const workersWithHelmet = Math.max(0, estimatedPeople - inferredViolations);
  const pass = estimatedPeople === 0 ? null : (analysis.compliance_rate ?? 0) >= 80;
  const isImage = analysis.media_type === "image";
  const violationFrames = analysis.violation_frames ?? [];
  const totalFrames = analysis.total_frames || 1;
  const downloadUrl = `${API}/video/${id}/download`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#7D8590", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
            <Link to="/reports" style={{ color: "#7D8590", textDecoration: "none", transition: "color 0.15s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#E6EDF3"} onMouseLeave={(e) => e.currentTarget.style.color = "#7D8590"}>Reports</Link>
            <span>/</span>
            <span style={{ color: "#E6EDF3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "280px" }}>{analysis.original_filename}</span>
          </div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "32px", fontWeight: 800, color: "#E6EDF3", margin: 0, letterSpacing: "-0.02em" }}>Analysis Report</h1>
        </div>
        <a href={downloadUrl} style={{
          flexShrink: 0, fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#E6EDF3",
          border: "1px solid #21262D", textDecoration: "none", padding: "10px 16px", borderRadius: "6px",
          textTransform: "uppercase", letterSpacing: "0.08em", transition: "border-color 0.15s",
          backgroundColor: "#0D1117",
        }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#30363D"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "#21262D"}
        >⬇ Download {isImage ? "Image" : "Video"}</a>
      </div>

      <div style={{
        border: `1px solid ${pass === null ? "#21262D" : pass ? "rgba(63,185,80,0.3)" : "rgba(218,54,51,0.3)"}`,
        backgroundColor: pass === null ? "#0D1117" : pass ? "rgba(63,185,80,0.05)" : "rgba(218,54,51,0.05)",
        borderRadius: "12px", padding: "28px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#7D8590", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>Compliance Status</p>
          {pass === null ? (
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "24px", fontWeight: 700, color: "#7D8590", margin: "0 0 8px" }}>No workers detected</p>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "56px", fontWeight: 900, color: pass ? "#3FB950" : "#DA3633", lineHeight: 1, letterSpacing: "-0.03em" }}>
                {analysis.compliance_rate?.toFixed(1)}%
              </span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: pass ? "rgba(63,185,80,0.6)" : "rgba(218,54,51,0.6)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {pass ? "Compliant" : "Non-compliant"}
              </span>
            </div>
          )}
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#7D8590", margin: 0 }}>
            {estimatedPeople > 0 ? `${estimatedPeople} workers · ${workersWithHelmet} with helmet · ${inferredViolations} without` : analysis.original_filename}
          </p>
        </div>
        <div style={{
          width: "64px", height: "64px", borderRadius: "10px",
          border: `2px solid ${pass === null ? "#21262D" : pass ? "rgba(63,185,80,0.4)" : "rgba(218,54,51,0.4)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Inter, sans-serif", fontSize: "28px", fontWeight: 800,
          color: pass === null ? "#7D8590" : pass ? "#3FB950" : "#DA3633",
        }}>
          {pass === null ? "—" : pass ? "✓" : "✗"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <DataCard label="Workers detected" value={estimatedPeople} color="#388BFD" />
        <DataCard label="With helmet" value={workersWithHelmet} color="#3FB950" />
        <DataCard label="Without helmet" value={inferredViolations} color="#DA3633" />
        <DataCard label="Compliance" value={`${analysis.compliance_rate?.toFixed(1)}%`} color={(analysis.compliance_rate ?? 0) >= 80 ? "#3FB950" : "#DA3633"} />
        <DataCard label={isImage ? "Media type" : "Duration"} value={isImage ? "Image" : `${analysis.duration_seconds?.toFixed(0)}s`} />
        <DataCard label="Processing time" value={`${analysis.processing_time?.toFixed(1)}s`} />
        <DataCard label="Total frames" value={analysis.total_frames} />
        <DataCard label="Violation frames" value={violationFrames.length} color="#DA3633" />
      </div>

      {isImage && (
        <div style={{ border: "1px solid #21262D", borderRadius: "12px", overflow: "hidden", backgroundColor: "#0D1117" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #21262D" }}>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Annotated Output</p>
          </div>
          <img src={downloadUrl} alt="Annotated output" style={{ width: "100%", display: "block" }} />
        </div>
      )}

      <div style={{ border: "1px solid #21262D", borderRadius: "12px", padding: "28px", backgroundColor: "#0D1117" }}>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 20px" }}>Helmet Compliance Breakdown</p>
        {estimatedPeople > 0 ? (
          <div>
            <div style={{ width: "100%", height: "8px", backgroundColor: "#161B22", borderRadius: "4px", overflow: "hidden", display: "flex", marginBottom: "20px" }}>
              <div style={{ height: "100%", backgroundColor: "#3FB950", width: `${(workersWithHelmet / estimatedPeople) * 100}%`, transition: "width 0.8s ease" }} />
              <div style={{ height: "100%", backgroundColor: "#DA3633", width: `${(inferredViolations / estimatedPeople) * 100}%`, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ display: "flex", gap: "40px" }}>
              {[
                { color: "#3FB950", label: "With helmet", value: workersWithHelmet, pct: ((workersWithHelmet / estimatedPeople) * 100).toFixed(0) },
                { color: "#DA3633", label: "Without helmet", value: inferredViolations, pct: ((inferredViolations / estimatedPeople) * 100).toFixed(0) },
                { color: "#4A5568", label: "Total workers", value: estimatedPeople, pct: 100 },
              ].map(({ color, label, value, pct }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#7D8590", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "18px", fontWeight: 700, color: "#E6EDF3", margin: 0 }}>
                      {value} <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#7D8590", fontWeight: 400 }}>({pct}%)</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#4A5568", textAlign: "center", padding: "32px 0", margin: 0 }}>No workers detected</p>
        )}
      </div>

      {violationFrames.length > 0 && (
        <div style={{ border: "1px solid #21262D", borderRadius: "12px", padding: "28px", backgroundColor: "#0D1117" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Violation Timeline</p>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#7D8590", margin: 0 }}>
              {violationFrames.length} frames · {report?.violation_timeline?.violation_density}
            </p>
          </div>
          <div style={{ width: "100%", height: "28px", backgroundColor: "#161B22", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
            {violationFrames.slice(0, 400).map((frame) => (
              <div key={frame} style={{ position: "absolute", top: 0, left: `${(frame / totalFrames) * 100}%`, width: "2px", height: "100%", backgroundColor: "#DA3633", opacity: 0.75 }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568", marginTop: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            <span>Frame 0</span>
            <span>Frame {analysis.total_frames}</span>
          </div>
        </div>
      )}

      <div style={{ border: "1px solid #21262D", borderRadius: "12px", overflow: "hidden", backgroundColor: "#0D1117" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #21262D" }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Detection Breakdown</p>
        </div>
        {classChartData.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #21262D" }}>
                {["Class", "Count", "Share", "Category"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classChartData.map(({ name, value }) => {
                const isViolation = ["no helmet", "no vest"].some((v) => name.toLowerCase().includes(v));
                return (
                  <tr key={name} style={{ borderBottom: "1px solid rgba(33,38,45,0.5)", transition: "background-color 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#161B22"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <td style={{ padding: "12px 24px", fontFamily: "Inter, sans-serif", color: "#E6EDF3" }}>{name}</td>
                    <td style={{ padding: "12px 24px", fontFamily: "JetBrains Mono, monospace", color: "#E6EDF3", fontWeight: 600 }}>{value}</td>
                    <td style={{ padding: "12px 24px", fontFamily: "JetBrains Mono, monospace", color: "#7D8590" }}>
                      {analysis.total_detections > 0 ? `${((value / analysis.total_detections) * 100).toFixed(1)}%` : "0%"}
                    </td>
                    <td style={{ padding: "12px 24px" }}>
                      <span style={{
                        fontFamily: "JetBrains Mono, monospace", fontSize: "9px", fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.1em",
                        color: isViolation ? "#DA3633" : "#3FB950",
                        backgroundColor: isViolation ? "rgba(218,54,51,0.1)" : "rgba(63,185,80,0.1)",
                        border: `1px solid ${isViolation ? "rgba(218,54,51,0.25)" : "rgba(63,185,80,0.25)"}`,
                        borderRadius: "4px", padding: "3px 8px",
                      }}>
                        {isViolation ? "Violation" : "Compliant"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ padding: "40px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#4A5568", textAlign: "center", margin: 0 }}>No detections recorded</p>
        )}
      </div>
    </div>
  );
}