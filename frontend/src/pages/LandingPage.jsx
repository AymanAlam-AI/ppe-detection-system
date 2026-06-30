import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function FadeUp({ children, delay = 0, stretch = false }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`, ...(stretch ? { height: "100%" } : {}) }}>
      {children}
    </div>
  );
}

function AnimCounter({ target, suffix = "" }) {
  const [val, setVal] = useState(0);
  const [ref, inView] = useInView();
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 1800, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

function InputField({ label, type, value, onChange, placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === "password";
  const inputType  = isPassword && showPwd ? "text" : type;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", fontWeight: 700, color: "#7D8590", textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: isPassword ? "11px 44px 11px 14px" : "11px 14px",
            borderRadius: "8px", border: `1px solid ${focused ? "rgba(240,165,0,0.5)" : "#21262D"}`,
            backgroundColor: focused ? "#0D1117" : "#161B22", color: "#E6EDF3",
            fontFamily: "Inter, sans-serif", fontSize: "14px", outline: "none",
            boxSizing: "border-box", transition: "border-color 0.15s, background-color 0.15s",
            boxShadow: focused ? "0 0 0 3px rgba(240,165,0,0.08)" : "none",
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1}
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4A5568", padding: "2px", display: "flex", alignItems: "center", transition: "color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7D8590"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#4A5568"; }}
          >
            {showPwd ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function AuthModal({ isOpen, initialTab = "login", onClose }) {
  const [tab,      setTab]      = useState(initialTab);
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const { login, signup } = useAuth();
  const navigate          = useNavigate();

  useEffect(() => {
    if (isOpen) { setTab(initialTab); setError(""); setName(""); setEmail(""); setPassword(""); }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") { await login(email, password); }
      else { await signup(name, email, password); }
      onClose();
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 9998, backdropFilter: "blur(4px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999, width: "100%", maxWidth: "420px", backgroundColor: "#0D1117", border: "1px solid #30363D", borderRadius: "14px", boxShadow: "0 32px 80px rgba(0,0,0,0.85)", overflow: "hidden" }}>
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid #21262D", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", backgroundColor: "#F0A500", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4z" fill="#080C10"/>
                <path d="M9 12l2 2 4-4" stroke="#F0A500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 700, color: "#E6EDF3" }}>SafetyVision</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#4A5568", padding: 4, lineHeight: 1, transition: "color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7D8590"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#4A5568"; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid #21262D" }}>
          {[{ key: "login", label: "Sign In" }, { key: "signup", label: "Create Account" }].map(({ key, label }) => (
            <button key={key} onClick={() => { setTab(key); setError(""); }}
              style={{ flex: 1, padding: "14px 0", background: "none", border: "none", borderBottom: tab === key ? "2px solid #F0A500" : "2px solid transparent", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: tab === key ? 600 : 400, color: tab === key ? "#E6EDF3" : "#7D8590", cursor: "pointer", transition: "color 0.15s", marginBottom: "-1px" }}
            >{label}</button>
          ))}
        </div>
        <form onSubmit={handleSubmit} autoComplete="off" style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {tab === "signup" && (
            <InputField label="Full Name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoComplete="new-password" />
          )}
          <InputField label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="new-password" />
          <InputField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tab === "signup" ? "At least 6 characters" : "Your password"} autoComplete="new-password" />
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "rgba(218,54,51,0.08)", border: "1px solid rgba(218,54,51,0.2)", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#DA3633", lineHeight: 1.5 }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "12px 0", borderRadius: "8px", border: "none", backgroundColor: loading ? "#9A6800" : "#F0A500", color: "#080C10", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", cursor: loading ? "not-allowed" : "pointer", transition: "background-color 0.2s", marginTop: "4px" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#D4920A"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#F0A500"; }}
          >
            {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
          </button>
          <p style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#4A5568", margin: 0 }}>
            {tab === "login" ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => { setTab(tab === "login" ? "signup" : "login"); setError(""); }}
              style={{ background: "none", border: "none", color: "#F0A500", fontSize: "12px", cursor: "pointer", fontFamily: "Inter, sans-serif", padding: 0 }}>
              {tab === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </>,
    document.body
  );
}

const WORKERS = [
  { id: "P-01", x: 120, hasHelmet: true,  conf: 97 },
  { id: "P-02", x: 248, hasHelmet: false, conf: 94 },
  { id: "P-03", x: 400, hasHelmet: true,  conf: 99 },
  { id: "P-04", x: 558, hasHelmet: false, conf: 91 },
  { id: "P-05", x: 700, hasHelmet: true,  conf: 96 },
];

function DetectionScene() {
  const [phase, setPhase] = useState(0);
  const timers = useRef([]);

  const runCycle = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase(0);
    timers.current.push(setTimeout(() => setPhase(1), 1400));
    timers.current.push(setTimeout(() => setPhase(2), 2400));
    timers.current.push(setTimeout(runCycle, 6000));
  }, []);

  useEffect(() => {
    runCycle();
    return () => timers.current.forEach(clearTimeout);
  }, [runCycle]);

  const compliant = WORKERS.filter(w => w.hasHelmet).length;
  const rate      = Math.round((compliant / WORKERS.length) * 100);

  return (
    <div style={{ position: "relative", border: "1px solid #21262D", borderRadius: "12px", overflow: "hidden", backgroundColor: "#080C10" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40px", background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#DA3633", animation: "blink 1s step-start infinite" }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#DA3633", fontWeight: 700, letterSpacing: "0.1em" }}>REC</span>
          </div>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568" }}>CAM-01 · SITE A · CONSTRUCTION ZONE</span>
        </div>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568" }}>{new Date().toLocaleTimeString()} · 1080p</span>
      </div>

      <svg viewBox="0 0 854 380" style={{ width: "100%", display: "block" }}>
        <rect width={854} height={380} fill="#0A0E14" />
        {[...Array(10)].map((_, i) => <line key={`h${i}`} x1={0} y1={280 + i * 10} x2={854} y2={280 + i * 10} stroke="#0D1117" strokeWidth={1} />)}
        {[...Array(14)].map((_, i) => <line key={`v${i}`} x1={i * 65} y1={260} x2={427 + (i - 7) * 100} y2={380} stroke="#0D1117" strokeWidth={1} />)}
        <rect x={0} y={295} width={854} height={4} fill="#0F1520" />

        {WORKERS.map((w, i) => {
          const bx = w.x - 32, by = 168, bw = 64, bh = 130;
          const perim = 2 * (bw + bh);
          const color = w.hasHelmet ? "#3FB950" : "#DA3633";

          return (
            <g key={w.id}>
              <rect x={w.x - 13} y={222} width={26} height={72} rx={3} fill="#1A2030" />
              <line x1={w.x - 2} y1={294} x2={w.x - 6} y2={330} stroke="#1A2030" strokeWidth={8} strokeLinecap="round" />
              <line x1={w.x + 2} y1={294} x2={w.x + 6} y2={330} stroke="#1A2030" strokeWidth={8} strokeLinecap="round" />
              <circle cx={w.x} cy={207} r={17} fill="#222C3C" />
              {w.hasHelmet && (
                <>
                  <path d={`M${w.x - 15},${196} Q${w.x},${182} ${w.x + 15},${196} Z`} fill="#F0A500" />
                  <rect x={w.x - 17} y={194} width={34} height={5} rx={1} fill="#D4920A" />
                </>
              )}
              {w.hasHelmet && (
                <>
                  <line x1={w.x - 6} y1={226} x2={w.x - 6} y2={285} stroke="#F0A500" strokeWidth={1.5} opacity={0.5} />
                  <line x1={w.x + 6} y1={226} x2={w.x + 6} y2={285} stroke="#F0A500" strokeWidth={1.5} opacity={0.5} />
                </>
              )}

              <rect
                x={bx} y={by} width={bw} height={bh}
                fill="none" stroke={color} strokeWidth={1.5}
                strokeDasharray={perim}
                strokeDashoffset={phase >= 1 ? 0 : perim}
                style={{ transition: `stroke-dashoffset 0.6s ease ${i * 0.1}s` }}
              />
              {phase >= 1 && (
                <>
                  {[[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]].map(([cx, cy], ci) => (
                    <g key={ci}>
                      <line x1={cx + (ci % 2 === 0 ? 0 : -10)} y1={cy} x2={cx + (ci % 2 === 0 ? 10 : 0)} y2={cy} stroke={color} strokeWidth={2.5} />
                      <line x1={cx} y1={cy + (ci < 2 ? 0 : -10)} x2={cx} y2={cy + (ci < 2 ? 10 : 0)} stroke={color} strokeWidth={2.5} />
                    </g>
                  ))}
                </>
              )}

              <g opacity={phase >= 2 ? 1 : 0} style={{ transition: `opacity 0.4s ease ${i * 0.1 + 0.15}s` }}>
                <rect x={bx} y={by - 20} width={bw + 28} height={19} rx={3} fill={color} />
                <text x={bx + 5} y={by - 8} fontSize={8} fill={w.hasHelmet ? "#080C10" : "#fff"} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
                  {w.id} · {w.hasHelmet ? "✓ HELMET" : "✗ BARE HEAD"} {w.conf}%
                </text>
              </g>
            </g>
          );
        })}

        {phase === 0 && (
          <line x1={0} y1={0} x2={0} y2={380} stroke="rgba(240,165,0,0.5)" strokeWidth={2} style={{ animation: "scanLine 1.4s ease-out forwards" }} />
        )}

        <g opacity={phase >= 2 ? 1 : 0} style={{ transition: "opacity 0.6s ease 0.6s" }}>
          <rect x={636} y={310} width={200} height={58} rx={6} fill="rgba(8,12,16,0.95)" stroke="#21262D" strokeWidth={1} />
          <text x={648} y={326} fontSize={8} fill="#7D8590" fontFamily="JetBrains Mono, monospace" letterSpacing={1}>COMPLIANCE RATE</text>
          <text x={648} y={352} fontSize={26} fontWeight={800} fill={rate >= 80 ? "#3FB950" : "#DA3633"} fontFamily="Inter, sans-serif">{rate}%</text>
          <text x={720} y={340} fontSize={8} fill="#4A5568" fontFamily="JetBrains Mono, monospace">{compliant}/{WORKERS.length} safe</text>
          <rect x={648} y={356} width={170} height={4} rx={2} fill="#21262D" />
          <rect x={648} y={356} width={Math.round((rate / 100) * 170)} height={4} rx={2} fill={rate >= 80 ? "#3FB950" : "#DA3633"} style={{ transition: "width 0.8s ease 0.8s" }} />
        </g>

        <text x={12} y={372} fontSize={8} fill="#1A2030" fontFamily="JetBrains Mono, monospace">
          YOLOv8n · CUDA · RTX 4050 · 2.6ms/frame
        </text>
      </svg>
    </div>
  );
}

function BeforeAfterDemo() {
  const [divX, setDivX]       = useState(427);
  const [dragging, setDragging] = useState(false);
  const svgRef                 = useRef(null);

  const updateDiv = useCallback((clientX) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x    = Math.max(40, Math.min(814, ((clientX - rect.left) / rect.width) * 854));
    setDivX(x);
  }, []);

  useEffect(() => {
    const onMove = (e) => { if (dragging) updateDiv(e.clientX ?? e.touches?.[0]?.clientX); };
    const onUp   = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, updateDiv]);

  const bx = 337, by = 60, bw = 180, bh = 260;
  const perim = 2 * (bw + bh);

  return (
    <div style={{ border: "1px solid #21262D", borderRadius: "12px", overflow: "hidden", backgroundColor: "#0D1117" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #21262D", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 2px" }}>Interactive Demo</p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#E6EDF3", margin: 0 }}>Drag to reveal PPE detection</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#4A5568" }}>RAW</span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#7D8590" }}>← DRAG →</span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#F0A500" }}>DETECTED</span>
        </div>
      </div>
      <div style={{ position: "relative", cursor: "ew-resize", userSelect: "none" }}>
        <svg
          ref={svgRef}
          viewBox="0 0 854 380"
          style={{ width: "100%", display: "block" }}
          onMouseDown={(e) => { setDragging(true); updateDiv(e.clientX); }}
          onTouchStart={(e) => { setDragging(true); updateDiv(e.touches[0].clientX); }}
        >
          <rect width={854} height={380} fill="#0A0E14" />
          {[...Array(10)].map((_, i) => <line key={i} x1={0} y1={280 + i * 10} x2={854} y2={280 + i * 10} stroke="#0D1117" strokeWidth={1} />)}

          <circle cx={427} cy={130} r={50} fill="#222C3C" />
          <rect x={414} y={178} width={26} height={140} rx={4} fill="#1A2030" />
          <line x1={421} y1={318} x2={410} y2={368} stroke="#1A2030" strokeWidth={18} strokeLinecap="round" />
          <line x1={433} y1={318} x2={444} y2={368} stroke="#1A2030" strokeWidth={18} strokeLinecap="round" />
          <path d="M412,92 Q427,72 442,92 Z" fill="#F0A500" />
          <rect x={410} y={90} width={34} height={6} rx={1} fill="#D4920A" />

          <g clipPath="url(#revealClip)">
            <rect x={divX} y={0} width={854 - divX} height={380} fill="rgba(240,165,0,0.02)" />
            <rect x={bx} y={by} width={bw} height={bh} fill="none" stroke="#3FB950" strokeWidth={2} strokeDasharray={perim} strokeDashoffset={0} />
            {[[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]].map(([cx, cy], ci) => (
              <g key={ci}>
                <line x1={cx + (ci % 2 === 0 ? 0 : -12)} y1={cy} x2={cx + (ci % 2 === 0 ? 12 : 0)} y2={cy} stroke="#3FB950" strokeWidth={3} />
                <line x1={cx} y1={cy + (ci < 2 ? 0 : -12)} x2={cx} y2={cy + (ci < 2 ? 12 : 0)} stroke="#3FB950" strokeWidth={3} />
              </g>
            ))}
            <rect x={bx} y={by - 24} width={bw} height={22} rx={3} fill="#3FB950" />
            <text x={bx + 8} y={by - 10} fontSize={10} fill="#080C10" fontFamily="JetBrains Mono, monospace" fontWeight={700}>P-03 · ✓ HELMET · 99%</text>
            <rect x={660} y={310} width={168} height={52} rx={6} fill="rgba(8,12,16,0.95)" stroke="#21262D" strokeWidth={1} />
            <text x={672} y={326} fontSize={8} fill="#7D8590" fontFamily="JetBrains Mono, monospace">COMPLIANCE</text>
            <text x={672} y={350} fontSize={22} fontWeight={800} fill="#3FB950" fontFamily="Inter, sans-serif">100%</text>
          </g>

          <defs>
            <clipPath id="revealClip">
              <rect x={divX} y={0} width={854 - divX} height={380} />
            </clipPath>
          </defs>

          <line x1={divX} y1={0} x2={divX} y2={380} stroke="white" strokeWidth={2} strokeOpacity={0.8} />
          <circle cx={divX} cy={190} r={22} fill="white" fillOpacity={0.95}
            onMouseDown={(e) => { e.stopPropagation(); setDragging(true); }}
          />
          <text x={divX} y={197} textAnchor="middle" fontSize={14} fill="#111" style={{ pointerEvents: "none" }}>⟺</text>

          <rect x={12} y={12} width={52} height={18} rx={3} fill="rgba(0,0,0,0.6)" />
          <text x={20} y={24} fontSize={8} fill="#7D8590" fontFamily="JetBrains Mono, monospace">BEFORE</text>
          <rect x={790} y={12} width={52} height={18} rx={3} fill="rgba(240,165,0,0.15)" />
          <text x={798} y={24} fontSize={8} fill="#F0A500" fontFamily="JetBrains Mono, monospace">AFTER</text>
        </svg>
      </div>
    </div>
  );
}

const FAQS = [
  { q: "Do I need any technical knowledge to use SafetyVision?", a: "No. You just upload a video or photo from your phone or computer. SafetyVision does everything else — it finds each worker in the image and automatically checks whether they are wearing a safety helmet. You get a clear result in minutes." },
  { q: "What exactly is PPE and why does it matter?", a: "PPE stands for Personal Protective Equipment — the safety gear workers wear to protect themselves from injury. On a construction site, this includes hard hats (helmets), high-visibility vests, gloves, and safety boots. Not wearing the right PPE is one of the leading causes of workplace accidents. SafetyVision helps you spot these violations before an accident happens." },
  { q: "How accurate is the detection?", a: "The AI model detects safety helmets with 92% accuracy and was trained on over 3,000 labeled images of real construction and factory workers. It works across different lighting conditions, camera angles, and worker densities." },
  { q: "Can it work with my CCTV cameras?", a: "Yes — the system is built to connect to live CCTV camera feeds. For this version you upload a recorded video clip, but the same detection engine can process live streams from IP cameras in real time. This is the same technology used in industrial safety monitoring systems." },
  { q: "How long does it take to analyze a video?", a: "A 30-second video clip typically takes about 2–3 minutes to fully analyze. The system goes through every frame, identifies every worker, and produces an annotated output video showing who is and isn't wearing a helmet." },
  { q: "What do I get after the analysis is complete?", a: "You get a full compliance report showing: how many workers were detected, how many were wearing helmets, how many were not, the overall compliance rate as a percentage, a timeline showing exactly which moments in the video had violations, and an annotated video you can download and share." },
  { q: "Is my video data kept private?", a: "Yes. Videos are processed locally on your server and are not sent to any third-party service. All analysis happens within your own infrastructure." },
  { q: "What types of videos or images can I upload?", a: "SafetyVision accepts MP4, AVI, MOV, and MKV video files, as well as JPG and PNG images. You can use footage from any camera — a mobile phone, CCTV, or a drone." },
];

export default function LandingPage() {
  const [tick,      setTick]      = useState(0);
  const [openFaq,   setOpenFaq]   = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab,  setModalTab]  = useState("login");

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (location.state?.openModal) {
      setModalTab("login");
      setModalOpen(true);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const handleCTA = (tab = "login") => {
    if (user) { navigate("/dashboard"); } else { setModalTab(tab); setModalOpen(true); }
  };

  const s = {
    page:     { backgroundColor: "#080C10", minHeight: "100vh", color: "#E6EDF3", fontFamily: "Inter, sans-serif" },
    nav:      { position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #21262D", backgroundColor: "rgba(8,12,16,0.9)", backdropFilter: "blur(12px)", height: "64px" },
    navInner: { maxWidth: "1200px", margin: "0 auto", padding: "0 48px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" },
    mono:     { fontFamily: "JetBrains Mono, monospace" },
    amber:    { color: "#F0A500" },
    muted:    { color: "#7D8590" },
    section:  { maxWidth: "1200px", margin: "0 auto", padding: "0 48px" },
  };

  const ctaBase = { fontFamily: "JetBrains Mono, monospace", fontSize: "12px", fontWeight: 700, color: "#080C10", backgroundColor: "#F0A500", border: "none", padding: "14px 28px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s", display: "inline-block" };

  return (
    <div style={s.page}>
      <AuthModal isOpen={modalOpen} initialTab={modalTab} onClose={() => setModalOpen(false)} />

      <nav style={s.nav}>
        <div style={s.navInner}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
            <div style={{ width: "32px", height: "32px", backgroundColor: "#F0A500", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4z" fill="#080C10"/>
                <path d="M9 12l2 2 4-4" stroke="#F0A500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p style={{ ...s.mono, fontWeight: 700, fontSize: "14px", color: "#E6EDF3", margin: 0, lineHeight: 1.2 }}>SafetyVision</p>
              <p style={{ ...s.mono, fontSize: "9px", color: "#7D8590", margin: 0, letterSpacing: "0.12em", textTransform: "uppercase" }}>PPE Detection</p>
            </div>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: "2px", backgroundColor: "#161B22", border: "1px solid #21262D", borderRadius: "10px", padding: "4px" }}>
            {[{ label: "How it works", href: "#how" }, { label: "Features", href: "#features" }, { label: "FAQ", href: "#faq" }].map(({ label, href }) => (
              <a key={label} href={href} style={{ ...s.mono, fontSize: "12px", color: "#7D8590", textDecoration: "none", padding: "6px 14px", borderRadius: "7px", transition: "color 0.15s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#E6EDF3"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#7D8590"}
              >{label}</a>
            ))}
          </nav>
          <button onClick={() => handleCTA("login")}
            style={{ ...s.mono, fontSize: "11px", fontWeight: 700, color: "#080C10", backgroundColor: "#F0A500", border: "none", padding: "9px 18px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4920A"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#F0A500"; e.currentTarget.style.transform = "translateY(0)"; }}
          >{user ? "Go to Dashboard" : "Sign In"}</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ ...s.section, padding: "120px 48px 80px", textAlign: "center" }}>
        <FadeUp>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", border: "1px solid rgba(240,165,0,0.3)", backgroundColor: "rgba(240,165,0,0.07)", padding: "5px 14px 5px 10px", borderRadius: "100px", marginBottom: "40px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#F0A500", animation: "pulse 2s infinite" }} />
            <span style={{ ...s.mono, fontSize: "11px", ...s.amber, letterSpacing: "0.08em", textTransform: "uppercase" }}>AI-Powered Workplace Safety</span>
          </div>
          <h1 style={{ fontSize: "clamp(40px, 6vw, 68px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#E6EDF3", margin: "0 0 24px" }}>
            Every worker.<br/>
            <span style={s.amber}>Every helmet.</span><br/>
            Every second.
          </h1>
          <p style={{ fontSize: "18px", ...s.muted, lineHeight: 1.75, maxWidth: "540px", margin: "0 auto 48px" }}>
            SafetyVision watches your site so you don't have to. Upload a video or connect a camera — it instantly spots every worker and flags anyone not wearing a safety helmet.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button onClick={() => handleCTA("login")} style={ctaBase}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4920A"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(240,165,0,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#F0A500"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >{user ? "Open Dashboard →" : "Get Started →"}</button>
            <a href="#demo" style={{ ...s.mono, fontSize: "12px", color: "#7D8590", border: "1px solid #21262D", textDecoration: "none", padding: "14px 28px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.1em", transition: "all 0.2s", display: "inline-block" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#E6EDF3"; e.currentTarget.style.borderColor = "#30363D"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#7D8590"; e.currentTarget.style.borderColor = "#21262D"; }}
            >See it live ↓</a>
          </div>
        </FadeUp>

        <FadeUp delay={0.15}>
          <div style={{ marginTop: "80px", border: "1px solid #21262D", borderRadius: "10px", overflow: "hidden", backgroundColor: "#0D1117", textAlign: "left" }}>
            <div style={{ borderBottom: "1px solid #21262D", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {["#DA3633", "#F0A500", "#3FB950"].map((c, i) => <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: c, opacity: 0.8 }} />)}
              </div>
              <span style={{ ...s.mono, fontSize: "10px", ...s.muted, letterSpacing: "0.05em" }}>safetyvision — live inference</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#3FB950", animation: "pulse 1.5s infinite" }} />
                <span style={{ ...s.mono, fontSize: "9px", color: "#3FB950", textTransform: "uppercase", letterSpacing: "0.1em" }}>Processing</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", backgroundColor: "#21262D" }}>
              {[
                { label: "Workers detected",  value: "7",                      color: "#E6EDF3" },
                { label: "Wearing helmet",     value: "5",                      color: "#3FB950" },
                { label: "Not wearing helmet", value: "2",                      color: "#DA3633" },
                { label: "Compliance rate",    value: "71.4%",                  color: tick % 2 === 0 ? "#F0A500" : "#DA3633" },
                { label: "Current frame",      value: `${240 + tick * 47}/828`, color: "#7D8590" },
                { label: "Detection speed",    value: "2.6ms",                  color: "#7D8590" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ backgroundColor: "#0D1117", padding: "20px 24px" }}>
                  <p style={{ ...s.mono, fontSize: "9px", ...s.muted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>{label}</p>
                  <p style={{ ...s.mono, fontSize: "22px", fontWeight: 700, color, margin: 0, transition: "color 0.4s" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ── NEW: Animated Detection Demo ── */}
      <section id="demo" style={{ borderTop: "1px solid #21262D", borderBottom: "1px solid #21262D", backgroundColor: "#0D1117" }}>
        <div style={{ ...s.section, padding: "80px 48px" }}>
          <FadeUp>
            <p style={{ ...s.mono, fontSize: "10px", ...s.amber, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>Live Detection · AI in action</p>
            <h2 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#E6EDF3" }}>Watch it detect in real time</h2>
            <p style={{ fontSize: "15px", ...s.muted, margin: "0 0 40px", lineHeight: 1.6, maxWidth: "540px" }}>
              This is what SafetyVision sees when it processes your footage. Bounding boxes draw automatically around every worker. Green means compliant. Red means violation.
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <DetectionScene />
          </FadeUp>
          <div style={{ marginTop: "32px" }}>
            <FadeUp delay={0.15}>
              <BeforeAfterDemo />
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ borderBottom: "1px solid #21262D" }}>
        <div style={{ ...s.section, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "0 48px" }}>
          {[
            { value: 81,   suffix: "%", label: "Overall accuracy" },
            { value: 92,   suffix: "%", label: "Helmet detection" },
            { value: 3000, suffix: "+", label: "Training images" },
            { value: 44,   suffix: "",  label: "Training epochs" },
          ].map(({ value, suffix, label }, i) => (
            <div key={label} style={{ padding: "48px 24px", textAlign: "center", borderRight: i < 3 ? "1px solid #21262D" : "none" }}>
              <FadeUp delay={i * 0.08}>
                <p style={{ ...s.mono, fontSize: "48px", fontWeight: 900, ...s.amber, margin: "0 0 8px", lineHeight: 1 }}>
                  <AnimCounter target={value} suffix={suffix} />
                </p>
                <p style={{ ...s.mono, fontSize: "10px", ...s.muted, textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>{label}</p>
              </FadeUp>
            </div>
          ))}
        </div>
      </section>

      {/* ── PPE explainer ── */}
      <section style={{ borderBottom: "1px solid #21262D", backgroundColor: "#0D1117" }}>
        <div style={{ ...s.section, padding: "100px 48px" }}>
          <FadeUp>
            <p style={{ ...s.mono, fontSize: "10px", ...s.amber, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>The problem we solve</p>
            <h2 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px", color: "#E6EDF3" }}>What is PPE — and why does it matter?</h2>
            <p style={{ fontSize: "17px", ...s.muted, lineHeight: 1.8, maxWidth: "620px", margin: "0 0 64px" }}>
              PPE stands for <strong style={{ color: "#E6EDF3" }}>Personal Protective Equipment</strong> — the safety gear workers wear to protect themselves from injury on site. A safety helmet is the most important piece of PPE on any construction or factory floor. Without it, a single falling object can be fatal.
            </p>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", backgroundColor: "#21262D", border: "1px solid #21262D", borderRadius: "10px", overflow: "hidden" }}>
            {[
              { icon: "🪖", title: "Safety helmet", desc: "Protects the head from falling objects, bumps, and debris. Required on all construction sites by law in India and internationally.", tag: "Most critical" },
              { icon: "🦺", title: "High-vis vest",  desc: "Makes workers visible to machinery operators, especially in low light. Reduces the risk of being struck by moving vehicles.",   tag: "High importance" },
              { icon: "🧤", title: "Safety gloves",  desc: "Protect hands from cuts, chemicals, and heat. Essential for workers handling materials or operating machinery.",                 tag: "High importance" },
            ].map(({ icon, title, desc, tag }, i) => (
              <FadeUp key={title} delay={i * 0.08}>
                <div style={{ backgroundColor: "#0D1117", padding: "32px", height: "100%", boxSizing: "border-box", transition: "background-color 0.2s", cursor: "default" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#161B22"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#0D1117"}
                >
                  <div style={{ fontSize: "28px", marginBottom: "12px" }}>{icon}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#E6EDF3", margin: 0 }}>{title}</p>
                    <span style={{ ...s.mono, fontSize: "8px", color: "#F0A500", border: "1px solid rgba(240,165,0,0.3)", borderRadius: "3px", padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{tag}</span>
                  </div>
                  <p style={{ fontSize: "13px", ...s.muted, lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.2}>
            <div style={{ marginTop: "32px", border: "1px solid rgba(218,54,51,0.3)", backgroundColor: "rgba(218,54,51,0.05)", borderRadius: "10px", padding: "24px 28px", display: "flex", alignItems: "flex-start", gap: "16px" }}>
              <span style={{ fontSize: "20px", flexShrink: 0, marginTop: "2px" }}>⚠️</span>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#E6EDF3", margin: "0 0 4px" }}>The scale of the problem</p>
                <p style={{ fontSize: "13px", ...s.muted, margin: 0, lineHeight: 1.65 }}>
                  According to the International Labour Organization, over <strong style={{ color: "#E6EDF3" }}>2.3 million workers</strong> suffer fatal or non-fatal workplace accidents every year globally. The majority of construction-site injuries are preventable — and most are caused by workers not wearing the right safety gear. Manual inspection is slow, inconsistent, and impossible to scale across large sites. SafetyVision automates this entirely.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ borderBottom: "1px solid #21262D" }}>
        <div style={{ ...s.section, padding: "100px 48px" }}>
          <FadeUp>
            <p style={{ ...s.mono, fontSize: "10px", ...s.amber, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>Simple to use</p>
            <h2 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 64px", color: "#E6EDF3" }}>From video to report in minutes</h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "stretch" }}>
            {[
              { step: "01", icon: "📹", title: "Upload your video or photo",      desc: "Take a video on your phone, download CCTV footage, or upload any photo of workers on site. SafetyVision accepts MP4, AVI, MOV, and JPG/PNG formats." },
              { step: "02", icon: "🔍", title: "AI scans every single frame",     desc: "The system looks at every frame of your video — up to 30 times per second. It finds each worker and checks: are they wearing a helmet? This happens automatically, no human review needed." },
              { step: "03", icon: "🚨", title: "Violations are flagged instantly", desc: "Every worker without a helmet gets a red marker. Every worker wearing one gets a green marker. You can see exactly who, where, and when in the video the violations occurred." },
              { step: "04", icon: "📊", title: "Download your compliance report", desc: "Get a full report: overall compliance rate, worker count, violation timeline, and an annotated video you can share with site managers, inspectors, or clients." },
            ].map(({ step, icon, title, desc }, i) => (
              <FadeUp key={step} delay={i * 0.08} stretch>
                <div style={{ border: "1px solid #21262D", borderRadius: "10px", padding: "28px", backgroundColor: "#0D1117", display: "flex", gap: "20px", transition: "border-color 0.2s", cursor: "default", height: "100%", boxSizing: "border-box" }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#30363D"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "#21262D"}
                >
                  <div style={{ flexShrink: 0 }}>
                    <p style={{ ...s.mono, fontSize: "10px", ...s.amber, margin: "0 0 4px" }}>{step}</p>
                    <div style={{ fontSize: "24px" }}>{icon}</div>
                  </div>
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "#E6EDF3", margin: "0 0 8px" }}>{title}</p>
                    <p style={{ fontSize: "13px", ...s.muted, lineHeight: 1.65, margin: 0 }}>{desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ borderBottom: "1px solid #21262D", backgroundColor: "#0D1117" }}>
        <div style={{ ...s.section, padding: "100px 48px" }}>
          <FadeUp>
            <p style={{ ...s.mono, fontSize: "10px", ...s.amber, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>Capabilities</p>
            <h2 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 64px", color: "#E6EDF3" }}>Built for the real world</h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", backgroundColor: "#21262D", border: "1px solid #21262D", borderRadius: "10px", overflow: "hidden" }}>
            {[
              { icon: "⚡", title: "Real-time detection",     desc: "Processes video feeds frame by frame, detecting every worker and checking helmet compliance in milliseconds." },
              { icon: "🎯", title: "92% accuracy",            desc: "Fine-tuned on 3,000+ labeled images of real construction and factory workers across lighting conditions and angles." },
              { icon: "📊", title: "Full compliance reports", desc: "Per-video compliance rates, violation timelines, worker counts — everything a safety manager needs in one place." },
              { icon: "📹", title: "Any camera, any format",  desc: "Works with MP4, AVI, MOV, MKV, JPG, and PNG. CCTV, mobile phone, or drone footage — all accepted." },
              { icon: "🏗",  title: "Scales to any site size", desc: "From a single camera to a full CCTV network. The architecture is designed for enterprise-scale deployment." },
              { icon: "🔒", title: "Data stays private",      desc: "All processing happens on your own server. No video data is sent to external services or third parties." },
            ].map(({ icon, title, desc }, i) => (
              <FadeUp key={title} delay={i * 0.06}>
                <div style={{ backgroundColor: "#0D1117", padding: "32px", height: "100%", boxSizing: "border-box", transition: "background-color 0.2s", cursor: "default" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#161B22"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#0D1117"}
                >
                  <div style={{ fontSize: "24px", marginBottom: "14px" }}>{icon}</div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#E6EDF3", margin: "0 0 8px" }}>{title}</p>
                  <p style={{ fontSize: "13px", ...s.muted, lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ borderBottom: "1px solid #21262D" }}>
        <div style={{ ...s.section, padding: "100px 48px" }}>
          <FadeUp>
            <p style={{ ...s.mono, fontSize: "10px", ...s.amber, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>FAQ</p>
            <h2 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 12px", color: "#E6EDF3" }}>Common questions</h2>
            <p style={{ fontSize: "16px", ...s.muted, margin: "0 0 56px", lineHeight: 1.6 }}>Everything you need to know before getting started.</p>
          </FadeUp>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {FAQS.map(({ q, a }, i) => {
              const open = openFaq === i;
              return (
                <FadeUp key={i} delay={i * 0.04}>
                  <div style={{ border: "1px solid #21262D", borderRadius: "8px", overflow: "hidden", marginBottom: "2px", borderColor: open ? "#30363D" : "#21262D", transition: "border-color 0.2s" }}>
                    <button onClick={() => setOpenFaq(open ? null : i)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: open ? "#0F141A" : "#0D1117", border: "none", cursor: "pointer", textAlign: "left", transition: "background-color 0.2s", gap: "16px" }}
                      onMouseEnter={(e) => { if (!open) e.currentTarget.style.backgroundColor = "#0F141A"; }}
                      onMouseLeave={(e) => { if (!open) e.currentTarget.style.backgroundColor = "#0D1117"; }}
                    >
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#E6EDF3", lineHeight: 1.4 }}>{q}</span>
                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "1px solid #30363D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "rotate(0)" }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M5 2v6M2 5h6" stroke="#7D8590" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </button>
                    {open && (
                      <div style={{ padding: "0 24px 20px", backgroundColor: "#0F141A" }}>
                        <p style={{ fontSize: "14px", ...s.muted, lineHeight: 1.75, margin: 0, paddingTop: "16px", borderTop: "1px solid #21262D" }}>{a}</p>
                      </div>
                    )}
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section>
        <div style={{ ...s.section, padding: "100px 48px", textAlign: "center" }}>
          <FadeUp>
            <h2 style={{ fontSize: "48px", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 16px", color: "#E6EDF3" }}>Ready to monitor your site?</h2>
            <p style={{ fontSize: "16px", ...s.muted, margin: "0 0 48px", lineHeight: 1.7 }}>
              Upload a video and get your first compliance report in minutes.<br/>No technical setup. No training required.
            </p>
            <button onClick={() => handleCTA("signup")}
              style={{ ...s.mono, fontSize: "13px", fontWeight: 700, color: "#080C10", backgroundColor: "#F0A500", border: "none", padding: "16px 36px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s", display: "inline-block" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4920A"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(240,165,0,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#F0A500"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >{user ? "Open Dashboard →" : "Get started →"}</button>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #21262D", padding: "32px 48px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "24px", height: "24px", backgroundColor: "#F0A500", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4z" fill="#080C10"/>
              </svg>
            </div>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#7D8590" }}>© {new Date().getFullYear()} SafetyVision. All rights reserved.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#3FB950" }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#7D8590", textTransform: "uppercase", letterSpacing: "0.1em" }}>YOLOv8 · Flask · React · CUDA</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse  { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes blink  { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes scanLine {
          from { transform: translateX(0px); }
          to   { transform: translateX(854px); }
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #161B22 inset !important;
          -webkit-text-fill-color: #E6EDF3 !important;
          caret-color: #E6EDF3;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}