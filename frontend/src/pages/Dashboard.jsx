import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const API = "http://localhost:5000/api";

function useCountUp(target, duration = 1400) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (!target) { setValue(0); return; }
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target * 10) / 10);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

const tooltipStyle = {
  contentStyle: { backgroundColor: "#0D1117", border: "1px solid #21262D", borderRadius: "6px", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" },
  labelStyle: { color: "#7D8590" },
};

function MetricCard({ label, value, sub, highlight }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `1px solid ${hover ? "#30363D" : "#21262D"}`,
        backgroundColor: hover ? "#0F141A" : "#0D1117",
        borderRadius: "12px", padding: "24px",
        transition: "all 0.2s ease",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        cursor: "default",
      }}
    >
      <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#7D8590", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 14px" }}>{label}</p>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "38px", fontWeight: 800, color: highlight ?? "#E6EDF3", margin: "0 0 6px", lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#4A5568", margin: 0 }}>{sub}</p>}
    </div>
  );
}

function StatusRow({ label, status, online }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #21262D" }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7D8590" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: online ? "#3FB950" : "#F0A500", animation: "pulse 2s infinite" }} />
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", fontWeight: 700, color: online ? "#3FB950" : "#F0A500", textTransform: "uppercase", letterSpacing: "0.1em" }}>{status}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const compliance = useCountUp(stats?.average_compliance_rate ?? 0);
  const violations = useCountUp(stats?.total_violations ?? 0);
  const withHelmet = useCountUp(stats?.total_workers_with_helmet ?? 0);

  useEffect(() => {
    const load = async () => {
      try { const r = await axios.get(`${API}/dashboard/stats`); setStats(r.data); }
      finally { setLoading(false); }
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div className="spinner" />
    </div>
  );

  const totalFiles = stats?.total_files ?? 0;
  const totalVideos = stats?.total_videos ?? 0;
  const totalImages = stats?.total_images ?? 0;
  const recentAnalyses = stats?.recent_analyses ?? [];
  const chartData = recentAnalyses.map((a) => {
    const name = a.original_filename.replace(/\.[^.]+$/, "");
    return { name: name.length > 16 ? `…${name.slice(-13)}` : name, rate: a.compliance_rate ?? 0 };
  }).reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 6px" }}>Safety Operations Center</p>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "30px", fontWeight: 800, color: "#E6EDF3", margin: 0, letterSpacing: "-0.02em" }}>Compliance Overview</h1>
        </div>
        <Link to="/upload"
          className="btn-primary"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", fontWeight: 700, color: "#080C10", backgroundColor: "#F0A500", textDecoration: "none", padding: "11px 20px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.1em", display: "inline-block", transition: "all 0.2s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4920A"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(240,165,0,0.25)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#F0A500"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
        >+ New Analysis</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
        <MetricCard label="Avg Compliance" value={`${compliance.toFixed(1)}%`} sub={`across ${totalFiles} file${totalFiles !== 1 ? "s" : ""}`} highlight="#E6EDF3" />
        <MetricCard label="Without Helmet" value={violations} sub="workers flagged" highlight="#DA3633" />
        <MetricCard label="With Helmet" value={withHelmet} sub="workers compliant" highlight="#E6EDF3" />
        <MetricCard label="Files Analyzed" value={totalFiles} sub={`${totalVideos} video${totalVideos !== 1 ? "s" : ""} · ${totalImages} image${totalImages !== 1 ? "s" : ""}`} highlight="#E6EDF3" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "14px" }}>
        <div style={{ border: "1px solid #21262D", borderRadius: "12px", padding: "24px", backgroundColor: "#0D1117" }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 4px" }}>Compliance Rate</p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#E6EDF3", margin: "0 0 20px" }}>Per file — most recent first</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F0A500" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#F0A500" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: "#7D8590", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: "#7D8590", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%"/>
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v.toFixed(1)}%`, "Compliance"]}/>
                <Area type="monotone" dataKey="rate" stroke="#F0A500" strokeWidth={2} fill="url(#ag)" dot={{ fill: "#F0A500", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#F0A500" }}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "190px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#4A5568" }}>Upload files to see chart</p>
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #21262D", borderRadius: "12px", padding: "24px", backgroundColor: "#0D1117", display: "flex", flexDirection: "column" }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 16px" }}>System Status</p>
          <div style={{ flex: 1 }}>
            <StatusRow label="Inference Engine" status="Online" online={true}/>
            <StatusRow label="Person Detector" status="Online" online={true}/>
            <StatusRow label="PPE Classifier" status="Online" online={true}/>
            <StatusRow label="Database" status="Online" online={true}/>
            <StatusRow label="Stream API" status="Ready" online={false}/>
          </div>
          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #21262D" }}>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#E6EDF3", margin: "0 0 2px" }}>YOLOv8n · 81.3% mAP</p>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#4A5568", margin: 0 }}>RTX 4050 · CUDA enabled</p>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #21262D", borderRadius: "12px", overflow: "hidden", backgroundColor: "#0D1117" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #21262D" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#E6EDF3", margin: 0 }}>Recent Analyses</p>
          <Link to="/reports" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#F0A500", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.1em", transition: "opacity 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >View all →</Link>
        </div>
        {recentAnalyses.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #21262D" }}>
                {["File", "Type", "Workers", "Without Helmet", "Compliance", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAnalyses.map((a) => {
                const pass = (a.compliance_rate ?? 0) >= 80;
                return (
                  <tr key={a.id} style={{ borderBottom: "1px solid rgba(33,38,45,0.5)", transition: "background-color 0.15s", cursor: "default" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0F141A"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <td style={{ padding: "13px 24px", fontFamily: "Inter, sans-serif", color: "#C0C8D2", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.original_filename}</td>
                    <td style={{ padding: "13px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#7D8590", textTransform: "uppercase" }}>{a.media_type === "image" ? "IMG" : "VID"}</td>
                    <td style={{ padding: "13px 24px", fontFamily: "JetBrains Mono, monospace", fontWeight: 600, color: "#E6EDF3" }}>{a.estimated_people ?? 0}</td>
                    <td style={{ padding: "13px 24px", fontFamily: "JetBrains Mono, monospace", fontWeight: 600, color: (a.inferred_violations ?? 0) > 0 ? "#DA3633" : "#E6EDF3" }}>{a.inferred_violations ?? 0}</td>
                    <td style={{ padding: "13px 24px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: pass ? "#3FB950" : "#DA3633" }}>{a.compliance_rate?.toFixed(1)}%</td>
                    <td style={{ padding: "13px 24px", textAlign: "right" }}>
                      <Link to={`/analysis/${a.id}`} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#F0A500", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.08em", transition: "opacity 0.15s" }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                      >View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#4A5568", margin: "0 0 8px" }}>No analyses yet</p>
            <Link to="/upload" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#F0A500", textDecoration: "none" }}>Upload a file to begin →</Link>
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        .spinner{width:18px;height:18px;border:2px solid #F0A500;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}