import React, { useState, useEffect, useRef, useCallback } from "react";

const BASE = "http://localhost:5000/api/live";

const CAMERA_META = [
  { id: 1, label: "CAM-01", zone: "Main Entrance" },
  { id: 2, label: "CAM-02", zone: "Zone B" },
  { id: 3, label: "CAM-03", zone: "Rooftop Access" },
  { id: 4, label: "CAM-04", zone: "Loading Bay" },
];

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const raf  = useRef(null);
  const prev = useRef(0);
  useEffect(() => {
    if (target === null || target === undefined || !Number.isFinite(target)) { setValue(0); return; }
    const from  = prev.current;
    const start = performance.now();
    const tick  = (now) => {
      const p     = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round((from + (target - from) * eased) * 10) / 10);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = target;
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

function ComplianceRing({ rate }) {
  const R       = 44;
  const circumf = 2 * Math.PI * R;
  const fill    = (rate / 100) * circumf;
  const color   = rate >= 80 ? "#3FB950" : rate >= 50 ? "#F0A500" : "#DA3633";
  const anim    = useCountUp(rate, 1000);
  return (
    <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="#21262D" strokeWidth="8" />
        <circle cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${fill} ${circumf}`} style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.4s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "20px", fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{anim.toFixed(0)}%</span>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3 }}>safe</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, highlight, animate }) {
  const [hover, setHover] = useState(false);
  const numVal   = typeof value === "number" ? value : parseFloat(value);
  const animated = useCountUp(animate && !isNaN(numVal) ? numVal : null, 800);
  const display  = animate && !isNaN(numVal) ? animated : value;
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ border: `1px solid ${hover ? "#30363D" : "#21262D"}`, backgroundColor: hover ? "#0F141A" : "#0D1117", borderRadius: "12px", padding: "24px", transition: "all 0.2s ease", transform: hover ? "translateY(-2px)" : "translateY(0)" }}
    >
      <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#7D8590", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 14px" }}>{label}</p>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "38px", fontWeight: 800, color: highlight ?? "#E6EDF3", margin: "0 0 6px", lineHeight: 1, letterSpacing: "-0.02em" }}>{display ?? "—"}</p>
      {sub && <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#4A5568", margin: 0 }}>{sub}</p>}
    </div>
  );
}

function EventLog({ events }) {
  const listRef = useRef(null);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = 0; }, [events.length]);
  if (events.length === 0) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 80 }}><p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.1em" }}>No violations detected</p></div>;
  }
  return (
    <div ref={listRef} style={{ overflowY: "auto", maxHeight: 200 }}>
      {events.map((e, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #21262D", opacity: Math.max(0.35, 1 - i * 0.06) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#DA3633", flexShrink: 0 }} />
            <div>
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#DA3633", margin: 0 }}>{e.classes.join(", ")}</p>
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568", margin: "2px 0 0" }}>frame {e.frame}</p>
            </div>
          </div>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568", flexShrink: 0, marginLeft: 8 }}>{e.time}</span>
        </div>
      ))}
    </div>
  );
}

function StopModal({ stats, events, fileName, onSaveAndStop, onDiscardAndStop, onCancel }) {
  const violations = stats?.violations ?? 0;
  const compliance = Number.isFinite(stats?.compliance_rate) ? stats.compliance_rate : 100;
  const compColor  = compliance >= 80 ? "#3FB950" : compliance >= 50 ? "#F0A500" : "#DA3633";

  const generateReport = useCallback(() => {
    const now         = new Date();
    const timestamp   = now.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "medium" });
    const statusLabel = compliance >= 80 ? "PASS" : "FAIL";
    const statusColor = compliance >= 80 ? "#16a34a" : "#dc2626";
    const statusBg    = compliance >= 80 ? "#f0fdf4" : "#fef2f2";
    const statusBord  = compliance >= 80 ? "#bbf7d0" : "#fecaca";
    const eventsHtml  = (events ?? []).length === 0
      ? `<tr><td colspan="3" style="padding:16px;text-align:center;color:#6b7280;font-size:12px;">No violations recorded</td></tr>`
      : (events ?? []).map((e, i) => `<tr style="background:${i%2===0?"#fff":"#fafafa"}"><td style="padding:10px 16px;font-size:12px;color:#111;border-bottom:1px solid #e5e7eb;">${e.time}</td><td style="padding:10px 16px;font-size:12px;color:#dc2626;border-bottom:1px solid #e5e7eb;">${e.classes.join(", ")}</td><td style="padding:10px 16px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;font-family:monospace;">#${e.frame}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>SafetyVision Report</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Inter,sans-serif;background:#fff;color:#111;padding:56px 64px}.header{display:flex;align-items:center;justify-content:space-between;padding-bottom:28px;border-bottom:2px solid #f3f4f6;margin-bottom:36px}.section{margin-bottom:36px}.section-title{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:36px}.card{border:1px solid #e5e7eb;border-radius:10px;padding:20px}.label{font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}.val{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1}.badge{display:inline-flex;align-items:center;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;background:${statusBg};color:${statusColor};border:1px solid ${statusBord}}.info-table{width:100%;border-collapse:collapse;font-size:13px}.info-table td{padding:12px 0;border-bottom:1px solid #f3f4f6}.info-table td:first-child{color:#6b7280;width:200px}.events-table{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}.events-table th{background:#f9fafb;padding:10px 16px;font-size:10px;font-weight:600;color:#6b7280;text-align:left;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #e5e7eb}.footer{margin-top:48px;padding-top:20px;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af}</style></head><body><div class="header"><div style="display:flex;align-items:center;gap:12px"><div style="width:36px;height:36px;background:#f0a500;border-radius:8px;display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4z" fill="#080C10"/><path d="M9 12l2 2 4-4" stroke="#F0A500" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div><div style="font-size:18px;font-weight:700">SafetyVision</div><div style="font-size:11px;color:#6b7280">Live Session Report</div></div></div><div style="text-align:right;font-size:11px;color:#6b7280;line-height:1.8">Generated: ${timestamp}<br/>Model: YOLOv8n · FP16 · CUDA<br/>Source: ${fileName||"Unknown"}</div></div><div class="section"><div class="section-title">Overview</div><div class="grid"><div class="card"><div class="label">Compliance</div><div class="val" style="color:${statusColor}">${compliance.toFixed(1)}%</div><div style="margin-top:10px"><span class="badge">${statusLabel}</span></div></div><div class="card"><div class="label">Violations</div><div class="val" style="color:${violations>0?"#dc2626":"#16a34a"}">${violations}</div></div><div class="card"><div class="label">Detections</div><div class="val">${stats?.total_detections??0}</div></div></div></div><div class="section"><div class="section-title">Session Details</div><table class="info-table"><tr><td>File</td><td style="font-weight:500">${fileName||"—"}</td></tr><tr><td>Duration</td><td style="font-weight:500">${stats?.elapsed??0}s</td></tr><tr><td>Frames</td><td style="font-weight:500">${stats?.frame_count??0}</td></tr><tr><td>Safe frames</td><td style="font-weight:500">${stats?.safe_frames??0}</td></tr><tr><td>Average FPS</td><td style="font-weight:500">${stats?.fps??0}</td></tr></table></div><div class="section"><div class="section-title">Violation Log</div><table class="events-table"><thead><tr><th>Timestamp</th><th>Type</th><th>Frame</th></tr></thead><tbody>${eventsHtml}</tbody></table></div><div class="footer"><span>SafetyVision · AI-powered PPE Detection</span><span>YOLOv8n · RTX 4050 · CUDA</span></div><script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`;
    const win = window.open("", "_blank", "width=900,height=700");
    if (win) { win.document.write(html); win.document.close(); }
  }, [compliance, violations, events, fileName, stats]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "relative", zIndex: 9999, width: "420px", backgroundColor: "#0D1117", border: "1px solid #30363D", borderRadius: "14px", boxShadow: "0 32px 80px rgba(0,0,0,0.8)", overflow: "hidden" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #21262D", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: "#E6EDF3" }}>Stop Stream</span>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#4A5568", padding: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7D8590"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#4A5568"; }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[{ label: "Frames", value: stats?.frame_count ?? "—" }, { label: "Detections", value: stats?.total_detections ?? "—" }, { label: "Violations", value: violations, color: violations > 0 ? "#DA3633" : "#3FB950" }].map(({ label, value, color }) => (
              <div key={label} style={{ backgroundColor: "#161B22", border: "1px solid #21262D", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 6px" }}>{label}</p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 800, color: color ?? "#E6EDF3", margin: 0, lineHeight: 1 }}>{value}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#161B22", border: "1px solid #21262D", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7D8590" }}>Compliance rate</span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "18px", fontWeight: 800, color: compColor }}>{compliance.toFixed(1)}%</span>
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7D8590", margin: "0 0 16px", lineHeight: 1.6 }}>Save a PDF report before clearing?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => { generateReport(); onSaveAndStop(); }}
              style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "1px solid #F0A500", backgroundColor: "#F0A500", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", fontWeight: 700, color: "#080C10", textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4920A"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#F0A500"; }}
            >↓ Save Report & Stop</button>
            <button onClick={onDiscardAndStop}
              style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "1px solid #21262D", backgroundColor: "transparent", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", fontWeight: 700, color: "#7D8590", textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#E6EDF3"; e.currentTarget.style.borderColor = "#30363D"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#7D8590"; e.currentTarget.style.borderColor = "#21262D"; }}
            >Stop Without Saving</button>
            <button onClick={onCancel}
              style={{ width: "100%", padding: "9px 0", background: "none", border: "none", fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#4A5568", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#7D8590"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#4A5568"; }}
            >Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CameraCell({ cam, focused, onClick }) {
  const fileRef        = useRef(null);
  const imgRef         = useRef(null);
  const reconnectTimer = useRef(null);
  const isStreamingRef = useRef(cam.is_streaming);
  const camIdRef       = useRef(cam.id);

  const [uploading, setUploading] = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const [hovered,   setHovered]   = useState(false);

  useEffect(() => { isStreamingRef.current = cam.is_streaming; }, [cam.is_streaming]);
  useEffect(() => { camIdRef.current = cam.id; }, [cam.id]);

  const reconnect = useCallback(() => {
    if (imgRef.current && isStreamingRef.current) {
      imgRef.current.src = `${BASE}/stream/${camIdRef.current}?t=${Date.now()}`;
    }
  }, []);

  useEffect(() => {
    if (!cam.is_streaming) {
      clearInterval(reconnectTimer.current);
      if (imgRef.current) imgRef.current.src = "";
      return;
    }
    if (imgRef.current && !imgRef.current.src.includes("/stream/")) {
      imgRef.current.src = `${BASE}/stream/${cam.id}?t=${Date.now()}`;
    }
    reconnectTimer.current = setInterval(reconnect, 18000);
    return () => clearInterval(reconnectTimer.current);
  }, [cam.is_streaming, cam.id, reconnect]);

  const handleImgError = useCallback(() => {
    setTimeout(() => {
      if (isStreamingRef.current && imgRef.current) {
        imgRef.current.src = `${BASE}/stream/${camIdRef.current}?t=${Date.now()}`;
      }
    }, 1500);
  }, []);

  const handleUpload = async (file) => {
    if (!file?.type.startsWith("video/")) return;
    setUploading(true);
    const form = new FormData();
    form.append("video", file);
    try {
      const res = await fetch(`${BASE}/upload/${cam.id}`, { method: "POST", body: form });
      if (res.ok && imgRef.current) {
        imgRef.current.src = `${BASE}/stream/${cam.id}?t=${Date.now()}`;
      }
    } catch (_) {}
    setUploading(false);
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    await fetch(`${BASE}/stop/${cam.id}`, { method: "POST" }).catch(() => {});
    if (imgRef.current) imgRef.current.src = "";
  };

  const handleChange = (e) => { e.stopPropagation(); fileRef.current?.click(); };

  const compliance  = Number.isFinite(cam.compliance) ? cam.compliance : 100;
  const borderColor = cam.is_streaming ? (compliance >= 80 ? "#3FB950" : compliance >= 50 ? "#F0A500" : "#DA3633") : (focused ? "#F0A500" : "#21262D");
  const badgeColor  = compliance >= 80 ? "#3FB950" : compliance >= 50 ? "#F0A500" : "#DA3633";
  const badgeBg     = compliance >= 80 ? "rgba(63,185,80,0.12)" : compliance >= 50 ? "rgba(245,166,35,0.12)" : "rgba(218,54,51,0.15)";

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", border: `1.5px solid ${focused ? "#F0A500" : borderColor}`, borderRadius: 8, overflow: "hidden", backgroundColor: "#0A0E14", cursor: "pointer", transition: "border-color 0.2s, box-shadow 0.2s", boxShadow: focused ? "0 0 0 1px #F0A500, 0 0 20px rgba(240,165,0,0.1)" : cam.is_streaming && compliance < 80 ? "0 0 12px rgba(218,54,51,0.12)" : "none" }}
    >
      {!cam.is_streaming ? (
        <div onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); handleUpload(e.dataTransfer.files?.[0]); }}
          style={{ aspectRatio: "16/9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: dragOver ? "rgba(240,165,0,0.05)" : "#0A0E14", transition: "background 0.2s", cursor: "pointer" }}
        >
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", fontWeight: 700, color: "#F0A500", margin: 0, letterSpacing: "0.1em" }}>{cam.label}</p>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568", margin: "2px 0 0" }}>{cam.zone}</p>
          </div>
          {uploading ? (
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", margin: 0 }}>Uploading…</p>
          ) : (
            <>
              <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="6" width="14" height="12" rx="2" stroke="#F0A500" strokeWidth="1.5"/>
                  <path d="M16 10l6-4v12l-6-4V10z" stroke="#F0A500" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568", margin: 0, letterSpacing: "0.04em" }}>drop video or click</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => handleUpload(e.target.files?.[0])} />
        </div>
      ) : (
        <>
          <img ref={imgRef} alt={cam.label} onError={handleImgError}
            style={{ width: "100%", display: "block", aspectRatio: "16/9", objectFit: "contain", backgroundColor: "#080C10" }}
          />
          <div style={{ position: "absolute", top: 7, left: 8, display: "flex", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 4, padding: "3px 8px", pointerEvents: "none" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#DA3633", animation: "blink 1s step-start infinite" }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#F0A500", fontWeight: 700 }}>{cam.label}</span>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#4A5568" }}>· {cam.zone}</span>
          </div>
          <div style={{ position: "absolute", bottom: 7, right: 8, display: "flex", alignItems: "center", gap: 5, backgroundColor: badgeBg, border: `1px solid ${badgeColor}55`, borderRadius: 4, padding: "3px 8px", pointerEvents: "none" }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: badgeColor }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", fontWeight: 700, color: badgeColor }}>
              {compliance.toFixed(1)}%{cam.violations > 0 ? " ⚠" : " ✓"}
            </span>
          </div>
          {cam.violations > 0 && (
            <div style={{ position: "absolute", bottom: 7, left: 8, backgroundColor: "rgba(218,54,51,0.85)", borderRadius: 4, padding: "2px 7px", fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#fff", fontWeight: 700, pointerEvents: "none" }}>
              {cam.violations} VIOL
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, backgroundColor: hovered ? "rgba(0,0,0,0.45)" : "transparent", transition: "background-color 0.2s", pointerEvents: hovered ? "auto" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {hovered && (
              <>
                <button onClick={handleChange}
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", fontWeight: 700, color: "#E6EDF3", backgroundColor: "rgba(13,17,23,0.9)", border: "1px solid #30363D", borderRadius: 6, padding: "7px 12px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F0A500"; e.currentTarget.style.color = "#F0A500"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#30363D"; e.currentTarget.style.color = "#E6EDF3"; }}
                >↩ Change</button>
                <button onClick={handleRemove}
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", fontWeight: 700, color: "#DA3633", backgroundColor: "rgba(13,17,23,0.9)", border: "1px solid rgba(218,54,51,0.4)", borderRadius: 6, padding: "7px 12px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(218,54,51,0.15)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(13,17,23,0.9)"; }}
                >✕ Remove</button>
                <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => handleUpload(e.target.files?.[0])} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ControlRoom({ onStreamingChange }) {
  const [cameras,   setCameras]   = useState(CAMERA_META.map(m => ({ ...m, is_streaming: false, compliance: 100, violations: 0, fps: 0, filename: "", total_detections: 0, frame_count: 0, safe_frames: 0, elapsed: 0 })));
  const [focusedId, setFocusedId] = useState(null);
  const [violLog,   setViolLog]   = useState([]);
  const [alertText, setAlertText] = useState("");
  const [alertShow, setAlertShow] = useState(false);
  const pollRef  = useRef(null);
  const prevViol = useRef({});

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${BASE}/cameras`);
        const data = await res.json();
        setCameras(data);
        onStreamingChange(data.some(c => c.is_streaming));
        data.forEach(cam => {
          const prev = prevViol.current[cam.id] ?? 0;
          if (cam.violations > prev && cam.is_streaming) {
            const entry = { time: new Date().toLocaleTimeString(), cam: cam.label, zone: cam.zone, id: Date.now() + cam.id };
            setViolLog(log => [entry, ...log].slice(0, 30));
            setAlertText(`⚠  ${cam.label}  ·  ${cam.zone}  ·  Violation detected`);
            setAlertShow(true);
            setTimeout(() => setAlertShow(false), 4000);
          }
          prevViol.current[cam.id] = cam.violations;
        });
      } catch (_) {}
    }, 1000);
    return () => clearInterval(pollRef.current);
  }, [onStreamingChange]);

  const stopAll = async () => { await fetch(`${BASE}/stop/all`, { method: "POST" }).catch(() => {}); };

  const generateControlRoomReport = () => {
    const now           = new Date();
    const timestamp     = now.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "medium" });
    const totalViol     = cameras.reduce((s, c) => s + c.violations, 0);
    const totalDet      = cameras.reduce((s, c) => s + (c.total_detections ?? 0), 0);
    const activeCams    = cameras.filter(c => c.is_streaming);
    const avgCompliance = activeCams.length > 0
      ? (activeCams.reduce((s, c) => s + (Number.isFinite(c.compliance) ? c.compliance : 100), 0) / activeCams.length).toFixed(1)
      : "N/A";

    const camSections = cameras.map(cam => {
      const comp      = Number.isFinite(cam.compliance) ? cam.compliance : 100;
      const passColor = comp >= 80 ? "#16a34a" : "#dc2626";
      const passBg    = comp >= 80 ? "#f0fdf4" : "#fef2f2";
      const passBord  = comp >= 80 ? "#bbf7d0" : "#fecaca";
      const passLabel = comp >= 80 ? "PASS" : "FAIL";
      const violColor = cam.violations > 0 ? "#dc2626" : "#16a34a";
      return `
        <div style="margin-bottom:40px;padding-bottom:40px;border-bottom:1px solid #f3f4f6">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="background:#f0a500;color:#080c10;font-size:10px;font-weight:700;font-family:monospace;padding:4px 10px;border-radius:4px;letter-spacing:.1em">${cam.label}</div>
              <div>
                <div style="font-size:16px;font-weight:700;color:#111">${cam.zone}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px">${cam.filename || "No file"}</div>
              </div>
            </div>
            <span style="display:inline-flex;align-items:center;padding:4px 14px;border-radius:999px;font-size:11px;font-weight:700;background:${passBg};color:${passColor};border:1px solid ${passBord}">${passLabel}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
            ${[
              { label: "Compliance", value: `${comp.toFixed(1)}%`, color: passColor },
              { label: "Violations", value: cam.violations,         color: violColor },
              { label: "Detections", value: cam.total_detections ?? 0, color: "#111" },
              { label: "Avg FPS",    value: cam.fps ?? 0,           color: "#111" },
            ].map(({ label, value, color }) => `
              <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px">
                <div style="font-size:9px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">${label}</div>
                <div style="font-size:24px;font-weight:800;color:${color};letter-spacing:-.02em;line-height:1">${value}</div>
              </div>`).join("")}
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            ${[
              ["Frames analyzed", cam.frame_count ?? 0],
              ["Safe frames",     cam.safe_frames ?? 0],
              ["Flagged frames",  (cam.frame_count ?? 0) - (cam.safe_frames ?? 0)],
              ["Duration",        `${cam.elapsed ?? 0}s`],
              ["Status",          cam.is_streaming ? "Active at export" : "Stopped"],
            ].map(([k, v]) => `<tr><td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;width:180px">${k}</td><td style="padding:8px 0;font-weight:500;border-bottom:1px solid #f3f4f6">${v}</td></tr>`).join("")}
          </table>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>SafetyVision Control Room Report</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Inter,sans-serif;background:#fff;color:#111;padding:56px 64px}.header{display:flex;align-items:center;justify-content:space-between;padding-bottom:28px;border-bottom:2px solid #f3f4f6;margin-bottom:36px}.section{margin-bottom:36px}.section-title{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px}.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:48px}.card{border:1px solid #e5e7eb;border-radius:10px;padding:20px}.card-label{font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}.card-value{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1}.footer{margin-top:48px;padding-top:20px;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af}</style></head><body>
      <div class="header">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:36px;height:36px;background:#f0a500;border-radius:8px;display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4z" fill="#080C10"/><path d="M9 12l2 2 4-4" stroke="#F0A500" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <div><div style="font-size:18px;font-weight:700">SafetyVision</div><div style="font-size:11px;color:#6b7280">Control Room Report</div></div>
        </div>
        <div style="text-align:right;font-size:11px;color:#6b7280;line-height:1.8">Generated: ${timestamp}<br/>Model: YOLOv8n · FP16 · CUDA<br/>Cameras: 4 feeds</div>
      </div>
      <div class="section">
        <div class="section-title">Site Summary</div>
        <div class="summary-grid">
          <div class="card"><div class="card-label">Avg Compliance</div><div class="card-value" style="color:${parseFloat(avgCompliance) >= 80 ? "#16a34a" : "#dc2626"}">${avgCompliance}%</div></div>
          <div class="card"><div class="card-label">Total Violations</div><div class="card-value" style="color:${totalViol > 0 ? "#dc2626" : "#16a34a"}">${totalViol}</div></div>
          <div class="card"><div class="card-label">Total Detections</div><div class="card-value">${totalDet}</div></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Per Camera Breakdown</div>
        ${camSections}
      </div>
      <div class="footer"><span>SafetyVision · AI-powered PPE Detection</span><span>YOLOv8n · RTX 4050 · CUDA</span></div>
      <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
    </body></html>`;

    const win = window.open("", "_blank", "width=1000,height=800");
    if (win) { win.document.write(html); win.document.close(); }
  };

  const activeCount   = cameras.filter(c => c.is_streaming).length;
  const totalViol     = cameras.reduce((s, c) => s + (c.is_streaming ? c.violations : 0), 0);
  const activeCams    = cameras.filter(c => c.is_streaming);
  const avgCompliance = activeCams.length > 0
    ? Math.round(activeCams.reduce((s, c) => s + (Number.isFinite(c.compliance) ? c.compliance : 100), 0) / activeCams.length)
    : 100;
  const avgFps        = activeCams.length > 0 ? (activeCams.reduce((s, c) => s + (c.fps ?? 0), 0) / activeCams.length).toFixed(1) : "—";

  const focusedCam   = cameras.find(c => c.id === focusedId) ?? null;
  const thumbCameras = cameras.filter(c => c.id !== focusedId);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: alertShow ? 40 : 0, overflow: "hidden", transition: "height 0.3s ease", backgroundColor: "rgba(218,54,51,0.1)", borderBottom: alertShow ? "1px solid rgba(218,54,51,0.25)" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", fontWeight: 700, color: "#DA3633", letterSpacing: "0.06em" }}>{alertText}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", minHeight: 480 }}>
        <div style={{ padding: 14, backgroundColor: "#080C10" }}>
          {focusedId === null ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {cameras.map(cam => <CameraCell key={cam.id} cam={cam} focused={false} onClick={() => setFocusedId(cam.id)} />)}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 170px", gap: 10, height: "100%" }}>
              <CameraCell cam={focusedCam} focused onClick={() => setFocusedId(null)} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {thumbCameras.map(cam => <CameraCell key={cam.id} cam={cam} focused={false} onClick={() => setFocusedId(cam.id)} />)}
              </div>
            </div>
          )}
          {focusedId !== null && (
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568", textAlign: "center", marginTop: 10, letterSpacing: "0.08em" }}>Click focused camera to return to grid</p>
          )}
        </div>

        <div style={{ borderLeft: "1px solid #21262D", backgroundColor: "#0D1117", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid #21262D" }}>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>Site Overview</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div style={{ backgroundColor: "#161B22", border: "1px solid #21262D", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#7D8590", textTransform: "uppercase", margin: "0 0 4px" }}>Active</p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 800, color: "#E6EDF3", margin: 0, lineHeight: 1 }}>{activeCount}/4</p>
              </div>
              <div style={{ backgroundColor: "#161B22", border: "1px solid #21262D", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#7D8590", textTransform: "uppercase", margin: "0 0 4px" }}>Violations</p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 800, color: totalViol > 0 ? "#DA3633" : "#3FB950", margin: 0, lineHeight: 1 }}>{totalViol}</p>
              </div>
            </div>
            <div style={{ backgroundColor: "#161B22", border: "1px solid #21262D", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#7D8590", textTransform: "uppercase", margin: "0 0 5px" }}>Avg Compliance</p>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "20px", fontWeight: 800, color: avgCompliance >= 80 ? "#3FB950" : "#F0A500", margin: "0 0 6px", lineHeight: 1 }}>
                {activeCams.length > 0 ? `${avgCompliance}%` : "—"}
              </p>
              <div style={{ height: 3, backgroundColor: "#21262D", borderRadius: 2 }}>
                <div style={{ height: 3, width: `${activeCams.length > 0 ? avgCompliance : 0}%`, backgroundColor: avgCompliance >= 80 ? "#3FB950" : "#F0A500", borderRadius: 2, transition: "width 0.6s ease" }} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ backgroundColor: "#161B22", border: "1px solid #21262D", borderRadius: 8, padding: "8px 10px" }}>
                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#7D8590", margin: "0 0 3px" }}>Avg FPS</p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", fontWeight: 700, color: "#E6EDF3", margin: 0 }}>{avgFps}</p>
              </div>
              <button onClick={() => { generateControlRoomReport(); stopAll(); }}
                style={{ width: "100%", fontFamily: "JetBrains Mono, monospace", fontSize: "8px", fontWeight: 700, color: "#080C10", backgroundColor: "#F0A500", border: "none", borderRadius: 8, padding: "9px 10px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", transition: "background-color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4920A"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#F0A500"; }}
              >↓ Report & Stop All</button>
              <button onClick={stopAll}
                style={{ width: "100%", fontFamily: "JetBrains Mono, monospace", fontSize: "8px", fontWeight: 700, color: "#DA3633", backgroundColor: "rgba(218,54,51,0.08)", border: "1px solid rgba(218,54,51,0.25)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(218,54,51,0.15)"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(218,54,51,0.08)"; }}
              >■ Stop All</button>
            </div>
          </div>

          <div style={{ padding: "12px 14px", borderBottom: "1px solid #21262D" }}>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 10px" }}>Per Camera</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {cameras.map(cam => {
                const comp     = Number.isFinite(cam.compliance) ? cam.compliance : 100;
                const barColor = comp >= 80 ? "#3FB950" : comp >= 50 ? "#F0A500" : "#DA3633";
                return (
                  <div key={cam.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setFocusedId(cam.id === focusedId ? null : cam.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, width: 56, flexShrink: 0 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: cam.is_streaming ? "#3FB950" : "#21262D", flexShrink: 0 }} />
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#4A5568" }}>{cam.label}</span>
                    </div>
                    <div style={{ flex: 1, height: 3, backgroundColor: "#21262D", borderRadius: 2 }}>
                      <div style={{ height: 3, width: cam.is_streaming ? `${comp}%` : "0%", backgroundColor: barColor, borderRadius: 2, transition: "width 0.6s ease" }} />
                    </div>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: cam.is_streaming ? barColor : "#4A5568", width: 40, textAlign: "right", flexShrink: 0 }}>
                      {cam.is_streaming ? `${comp.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: "12px 14px", flex: 1, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Violation Log</p>
              {violLog.length > 0 && <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#DA3633", backgroundColor: "rgba(218,54,51,0.1)", border: "1px solid rgba(218,54,51,0.2)", borderRadius: 4, padding: "1px 6px" }}>{violLog.length}</span>}
            </div>
            {violLog.length === 0 ? (
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.1em" }}>No violations</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", maxHeight: 180 }}>
                {violLog.map((e, i) => (
                  <div key={e.id} style={{ padding: "5px 0", borderBottom: "1px solid #21262D", opacity: Math.max(0.4, 1 - i * 0.06) }}>
                    <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#DA3633", margin: "0 0 1px" }}>{e.cam} · {e.zone}</p>
                    <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#4A5568", margin: 0 }}>{e.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: "10px 14px", borderTop: "1px solid #21262D" }}>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568", margin: 0, lineHeight: 1.7 }}>
              YOLOv8n · FP16 · RTX 4050<br/>
              {activeCount} inference thread{activeCount !== 1 ? "s" : ""} active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Live() {
  const [viewMode,       setViewMode]       = useState("single");
  const [status,         setStatus]         = useState("idle");
  const [fileName,       setFileName]       = useState("");
  const [error,          setError]          = useState("");
  const [stats,          setStats]          = useState(null);
  const [events,         setEvents]         = useState([]);
  const [dragOver,       setDragOver]       = useState(false);
  const [violFlash,      setViolFlash]      = useState(false);
  const [modalOpen,      setModalOpen]      = useState(false);
  const [crAnyStreaming, setCrAnyStreaming]  = useState(false);

  const fileInputRef = useRef(null);
  const pollRef      = useRef(null);
  const imgRef       = useRef(null);
  const reconnTimer  = useRef(null);
  const prevViol     = useRef(0);
  const lastStats    = useRef(null);
  const lastEvents   = useRef([]);
  const lastFileName = useRef("");
  const isStreamRef  = useRef(false);

  useEffect(() => { isStreamRef.current = status === "streaming"; }, [status]);

  const reconnectSingle = useCallback(() => {
    if (imgRef.current && isStreamRef.current) {
      imgRef.current.src = `${BASE}/stream/1?t=${Date.now()}`;
    }
  }, []);

  const stopPolling = useCallback(() => {
    clearInterval(pollRef.current);
    pollRef.current = null;
    clearInterval(reconnTimer.current);
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${BASE}/stats/1`);
        const data = await res.json();
        setStats(data);
        lastStats.current = data;
        const incoming = data.recent_events ?? [];
        setEvents(incoming);
        lastEvents.current = incoming;
        if (data.violations > prevViol.current) {
          setViolFlash(true);
          setTimeout(() => setViolFlash(false), 600);
        }
        prevViol.current = data.violations;
        if (!data.is_streaming) setStatus(s => s === "streaming" ? "stopped" : s);
      } catch (_) {}
    }, 1000);
    reconnTimer.current = setInterval(reconnectSingle, 18000);
  }, [stopPolling, reconnectSingle]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const hardReset = useCallback(() => {
    setStats(null); setEvents([]); setFileName(""); setStatus("idle");
    prevViol.current = 0; lastStats.current = null; lastEvents.current = []; lastFileName.current = "";
    if (imgRef.current) imgRef.current.src = "";
    stopPolling();
  }, [stopPolling]);

  const killBackend = useCallback(async () => {
    stopPolling();
    await fetch(`${BASE}/stop/1`, { method: "POST" }).catch(() => {});
  }, [stopPolling]);

  const startStream = useCallback(async (file) => {
    if (!file) return;
    setError(""); setStatus("uploading"); setFileName(file.name);
    lastFileName.current = file.name;
    setStats(null); setEvents([]); prevViol.current = 0;
    const form = new FormData();
    form.append("video", file);
    try {
      const res = await fetch(`${BASE}/upload/1`, { method: "POST", body: form });
      if (!res.ok) { const b = await res.json(); throw new Error(b.error ?? "Upload failed."); }
      setStatus("streaming");
      if (imgRef.current) imgRef.current.src = `${BASE}/stream/1?t=${Date.now()}`;
      startPolling();
    } catch (e) { setStatus("error"); setError(e.message); }
  }, [startPolling]);

  const handleImgError = useCallback(() => {
    setTimeout(() => { if (isStreamRef.current && imgRef.current) imgRef.current.src = `${BASE}/stream/1?t=${Date.now()}`; }, 1500);
  }, []);

  const handleSaveAndStop    = useCallback(async () => { setModalOpen(false); await killBackend(); hardReset(); }, [killBackend, hardReset]);
  const handleDiscardAndStop = useCallback(async () => { setModalOpen(false); await killBackend(); hardReset(); }, [killBackend, hardReset]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("video/")) startStream(file);
    else setError("Drop a valid video file.");
  }, [startStream]);

  const isStreaming    = status === "streaming";
  const violations     = stats?.violations ?? 0;
  const complianceRate = Number.isFinite(stats?.compliance_rate) ? stats.compliance_rate : 100;
  const safetyPassed   = violations === 0;

  const statusColor  = { idle: "#4A5568", uploading: "#F0A500", streaming: "#3FB950", stopped: "#7D8590", error: "#DA3633" }[status] ?? "#4A5568";
  const statusLabel  = { idle: "Idle", uploading: "Uploading…", streaming: "Live", stopped: "Stopped", error: "Error" }[status] ?? status;
  const headerColor  = viewMode === "controlroom" ? (crAnyStreaming ? "#3FB950" : "#4A5568") : statusColor;
  const headerLabel  = viewMode === "controlroom" ? (crAnyStreaming ? "Live" : "Idle") : statusLabel;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {modalOpen && (
        <StopModal stats={lastStats.current} events={lastEvents.current} fileName={lastFileName.current}
          onSaveAndStop={handleSaveAndStop} onDiscardAndStop={handleDiscardAndStop} onCancel={() => setModalOpen(false)}
        />
      )}

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 6px" }}>Safety Operations Center</p>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "30px", fontWeight: 800, color: "#E6EDF3", margin: 0, letterSpacing: "-0.02em" }}>Live Detection</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", backgroundColor: "#161B22", border: "1px solid #21262D", borderRadius: 8, padding: 3, gap: 2 }}>
            {[{ key: "single", label: "Single Feed" }, { key: "controlroom", label: "Control Room" }].map(({ key, label }) => (
              <button key={key} onClick={() => setViewMode(key)}
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", fontWeight: viewMode === key ? 700 : 400, color: viewMode === key ? "#E6EDF3" : "#7D8590", backgroundColor: viewMode === key ? "#0D1117" : "transparent", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", transition: "all 0.15s", boxShadow: viewMode === key ? "0 1px 4px rgba(0,0,0,0.4)" : "none", letterSpacing: "0.05em", textTransform: "uppercase" }}
              >{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 90 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: headerColor, boxShadow: (isStreaming || crAnyStreaming) ? `0 0 8px ${headerColor}` : "none", animation: (isStreaming || crAnyStreaming) ? "livePulse 1.6s ease-in-out infinite" : "none" }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", fontWeight: 700, color: headerColor, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              {(isStreaming || crAnyStreaming) ? "● Live" : headerLabel}
            </span>
          </div>
          {isStreaming && viewMode === "single" && (
            <button onClick={() => setModalOpen(true)}
              style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", fontWeight: 700, color: "#DA3633", backgroundColor: "transparent", border: "1px solid #DA3633", padding: "9px 18px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(218,54,51,0.1)"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >■ Stop</button>
          )}
        </div>
      </div>

      {viewMode === "controlroom" ? (
        <div style={{ border: "1px solid #21262D", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #21262D", backgroundColor: "#0D1117", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: crAnyStreaming ? "#3FB950" : "#4A5568", animation: crAnyStreaming ? "livePulse 2s infinite" : "none" }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em" }}>SafetyVision Control Center</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568" }}>· hover any feed to change or remove</span>
            </div>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568" }}>{new Date().toLocaleTimeString()}</span>
          </div>
          <ControlRoom onStreamingChange={setCrAnyStreaming} />
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
            <MetricCard label="Live FPS"   value={stats?.fps ?? "—"}              sub="frames per second"   highlight="#E6EDF3"                              animate={!!stats} />
            <MetricCard label="Detections" value={stats?.total_detections ?? "—"} sub="total across stream" highlight="#E6EDF3"                              animate={!!stats} />
            <MetricCard label="Violations" value={violations}                     sub="PPE non-compliance"  highlight={violations > 0 ? "#DA3633" : "#3FB950"} animate={!!stats} />
            <MetricCard label="Frames"     value={stats?.frame_count ?? "—"}      sub={`${stats?.elapsed ?? 0}s elapsed`} highlight="#E6EDF3"               animate={!!stats} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 310px", gap: "14px", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {!isStreaming && (
                <div onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                  style={{ aspectRatio: "16/9", border: `1px dashed ${dragOver ? "#F0A500" : "#21262D"}`, borderRadius: 12, backgroundColor: dragOver ? "rgba(240,165,0,0.04)" : "#0D1117", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", transition: "all 0.2s ease" }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="6" width="14" height="12" rx="2" stroke="#F0A500" strokeWidth="1.5"/>
                      <path d="M16 10l6-4v12l-6-4V10z" stroke="#F0A500" strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#E6EDF3", margin: "0 0 5px" }}>{status === "uploading" ? "Uploading…" : "Drop a video file here"}</p>
                    <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#4A5568", margin: 0, letterSpacing: "0.05em" }}>{fileName || "or click to browse  ·  MP4, AVI, MOV, MKV"}</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => startStream(e.target.files?.[0])} />
                </div>
              )}

              <div style={{ display: isStreaming ? "block" : "none" }}>
                <div style={{ border: `1px solid ${violFlash ? "#DA3633" : "#21262D"}`, borderRadius: 12, overflow: "hidden", backgroundColor: "#0D1117", position: "relative", transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: violFlash ? "0 0 0 1px rgba(218,54,51,0.4), 0 0 24px rgba(218,54,51,0.12)" : "none" }}>
                  {isStreaming && (
                    <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, display: "flex", alignItems: "center", gap: 6, backgroundColor: "rgba(13,17,23,0.85)", border: "1px solid #21262D", borderRadius: 6, padding: "5px 10px" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#DA3633", animation: "livePulse 1s ease-in-out infinite" }} />
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", fontWeight: 700, color: "#DA3633", textTransform: "uppercase", letterSpacing: "0.12em" }}>Live</span>
                    </div>
                  )}
                  {isStreaming && (
                    <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, display: "flex", alignItems: "center", gap: 6, backgroundColor: safetyPassed ? "rgba(63,185,80,0.12)" : "rgba(218,54,51,0.15)", border: `1px solid ${safetyPassed ? "rgba(63,185,80,0.35)" : "rgba(218,54,51,0.4)"}`, borderRadius: 6, padding: "5px 12px" }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: safetyPassed ? "#3FB950" : "#DA3633" }} />
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", fontWeight: 700, color: safetyPassed ? "#3FB950" : "#DA3633", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {safetyPassed ? "All Compliant" : `${violations} Violation${violations !== 1 ? "s" : ""}`}
                      </span>
                    </div>
                  )}
                  <img ref={imgRef} alt="Live PPE detection stream" onError={handleImgError}
                    style={{ width: "100%", display: "block", aspectRatio: "16/9", objectFit: "contain", backgroundColor: "#080C10" }}
                  />
                </div>
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", fontWeight: 700, color: "#7D8590", backgroundColor: "transparent", border: "1px solid #21262D", padding: "8px 14px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#E6EDF3"; e.currentTarget.style.borderColor = "#30363D"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#7D8590"; e.currentTarget.style.borderColor = "#21262D"; }}
                  >↩ Change Video</button>
                  <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => startStream(e.target.files?.[0])} />
                </div>
              </div>

              {error && <div style={{ padding: "11px 16px", borderRadius: 8, backgroundColor: "rgba(218,54,51,0.08)", border: "1px solid rgba(218,54,51,0.2)", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#DA3633" }}>{error}</div>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ border: "1px solid #21262D", borderRadius: 12, padding: 24, backgroundColor: "#0D1117" }}>
                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 20px" }}>Compliance Score</p>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <ComplianceRing rate={isStreaming ? complianceRate : 100} />
                  <div style={{ flex: 1 }}>
                    {[{ label: "Safe frames", value: stats?.safe_frames ?? "—" }, { label: "Flagged frames", value: stats ? (stats.frame_count - stats.safe_frames) : "—" }, { label: "Elapsed", value: stats ? `${stats.elapsed}s` : "—" }].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #21262D" }}>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7D8590" }}>{label}</span>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#E6EDF3" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ border: "1px solid #21262D", borderRadius: 12, padding: 24, backgroundColor: "#0D1117" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Violation Log</p>
                  {events.length > 0 && <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#DA3633", backgroundColor: "rgba(218,54,51,0.1)", border: "1px solid rgba(218,54,51,0.2)", borderRadius: 4, padding: "2px 7px" }}>{events.length}</span>}
                </div>
                <EventLog events={events} />
              </div>
              <div style={{ border: "1px solid #21262D", borderRadius: 12, padding: "20px 24px", backgroundColor: "#0D1117" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid #21262D", marginBottom: 12 }}>
                  <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Stream Info</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: statusColor }} />
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>{statusLabel}</span>
                  </div>
                </div>
                {[{ label: "File", value: fileName || "—" }, { label: "FPS", value: stats?.fps != null ? `${stats.fps}` : "—" }, { label: "Detections", value: stats?.total_detections != null ? `${stats.total_detections}` : "—" }].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #21262D" }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7D8590" }}>{label}</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#E6EDF3", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #21262D" }}>
                  <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#E6EDF3", margin: "0 0 2px" }}>YOLOv8n · FP16 · MJPEG</p>
                  <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#4A5568", margin: 0 }}>RTX 4050 · CUDA</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes livePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
        @keyframes blink     { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}