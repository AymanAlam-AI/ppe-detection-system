import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Routes, Route, NavLink, Link, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import UploadPage from "./pages/UploadPage";
import ReportsPage from "./pages/ReportsPage";
import AnalysisDetail from "./pages/AnalysisDetail";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", end: true },
  { to: "/upload", label: "Upload" },
  { to: "/reports", label: "Reports" },
];

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </Router>
  );
}

function AppShell() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#080C10", color: "#E6EDF3", fontFamily: "Inter, sans-serif" }}>
      <TopBar />
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 40px" }}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/analysis/:id" element={<AnalysisDetail />} />
        </Routes>
      </main>
    </div>
  );
}

function TopBar() {
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const avatarRef = useRef(null);

  const getTitle = () => {
    if (location.pathname === "/dashboard") return "Dashboard";
    if (location.pathname === "/upload") return "New Analysis";
    if (location.pathname === "/reports") return "Reports";
    if (location.pathname.startsWith("/analysis/")) return "Analysis Detail";
    return "SafetyVision";
  };

  const handleAvatarClick = () => {
    if (avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setShowMenu((v) => !v);
  };

  useEffect(() => { setShowMenu(false); }, [location.pathname]);

  const dropdown = showMenu ? ReactDOM.createPortal(
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setShowMenu(false)} />
      <div style={{
        position: "fixed", top: menuPos.top, right: menuPos.right,
        width: "220px", backgroundColor: "#0D1117",
        border: "1px solid #21262D", borderRadius: "10px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.7)", zIndex: 9999, overflow: "hidden",
      }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #21262D" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#E6EDF3", margin: "0 0 2px" }}>Ayman Alam</p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7D8590", margin: 0 }}>aymanalam2005@gmail.com</p>
        </div>
        <div style={{ padding: "6px 0" }}>
          {[{ label: "Dashboard", path: "/dashboard" }, { label: "Upload file", path: "/upload" }, { label: "Reports", path: "/reports" }].map(({ label, path }) => (
            <Link key={path} to={path} onClick={() => setShowMenu(false)}
              style={{ display: "block", padding: "9px 16px", fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#7D8590", textDecoration: "none", transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#E6EDF3"; e.currentTarget.style.backgroundColor = "#161B22"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#7D8590"; e.currentTarget.style.backgroundColor = "transparent"; }}
            >{label}</Link>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #21262D", padding: "6px 0" }}>
          <button onClick={() => setShowMenu(false)}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 16px", fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#7D8590", background: "none", border: "none", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#DA3633"; e.currentTarget.style.backgroundColor = "#161B22"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#7D8590"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >Sign out</button>
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      <header style={{
        height: "60px", borderBottom: "1px solid #21262D", backgroundColor: "#0D1117",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{
          maxWidth: "1180px", margin: "0 auto", padding: "0 40px",
          height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: "28px", height: "28px", backgroundColor: "#F0A500", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4z" fill="#080C10"/>
              <path d="M9 12l2 2 4-4" stroke="#F0A500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "14px", color: "#E6EDF3" }}>SafetyVision</span>
        </Link>

        {/* Center pill nav - Microsoft style */}
        <nav style={{
          display: "flex", alignItems: "center", gap: "2px",
          backgroundColor: "#161B22", border: "1px solid #21262D",
          borderRadius: "10px", padding: "4px",
        }}>
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}
              style={({ isActive }) => ({
                fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: isActive ? 600 : 400,
                color: isActive ? "#E6EDF3" : "#7D8590", textDecoration: "none",
                padding: "6px 16px", borderRadius: "7px",
                backgroundColor: isActive ? "#0D1117" : "transparent",
                boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.4)" : "none",
                transition: "all 0.15s",
              })}
              onMouseEnter={(e) => { if (e.currentTarget.style.backgroundColor === "transparent") e.currentTarget.style.color = "#C0C8D2"; }}
              onMouseLeave={(e) => { if (e.currentTarget.style.backgroundColor === "transparent") e.currentTarget.style.color = "#7D8590"; }}
            >{label}</NavLink>
          ))}
        </nav>

        {/* Right: date + avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <div style={{ width: "1px", height: "18px", backgroundColor: "#21262D" }} />
          <button ref={avatarRef} onClick={handleAvatarClick}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{
              width: "30px", height: "30px", borderRadius: "50%",
              backgroundColor: "rgba(240,165,0,0.15)", border: "1px solid rgba(240,165,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", fontWeight: 700, color: "#F0A500" }}>A</span>
            </div>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#7D8590", fontWeight: 500 }}>Ayman</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 4l3 3 3-3" stroke="#7D8590" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        </div>
      </header>
      {dropdown}
    </>
  );
}