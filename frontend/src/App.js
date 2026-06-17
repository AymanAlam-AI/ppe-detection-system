import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import UploadPage from "./pages/UploadPage";
import ReportsPage from "./pages/ReportsPage";
import AnalysisDetail from "./pages/AnalysisDetail";

export default function App() {
  const year = new Date().getFullYear();

  return (
    <Router>
      <div className="min-h-screen bg-zinc-950 text-white font-sans relative overflow-x-hidden flex flex-col">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] bg-orange-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-[24rem] h-[24rem] bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4z" fill="white" fillOpacity="0.95" />
                  <path d="M9 12l2 2 4-4" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold tracking-tight text-white text-[15px] group-hover:text-amber-400 transition-colors">
                  SafetyVision
                </span>
                <span className="text-zinc-500 text-[11px] hidden sm:block -mt-0.5">
                  AI-Powered PPE Detection
                </span>
              </div>
            </Link>

            <nav className="flex gap-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1">
              {[
                { to: "/", label: "Dashboard", end: true },
                { to: "/upload", label: "Upload" },
                { to: "/reports", label: "Reports" },
              ].map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `text-sm px-3.5 py-1.5 rounded-lg transition-all font-medium ${
                      isActive
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-md shadow-amber-500/20"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8 relative z-10 flex-1 w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/analysis/:id" element={<AnalysisDetail />} />
          </Routes>
        </main>

        <footer className="border-t border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl relative z-10 mt-12">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-600 rounded-lg flex items-center justify-center shadow-md shadow-amber-500/10">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4z" fill="white" fillOpacity="0.95" />
                    <path d="M9 12l2 2 4-4" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-zinc-200">SafetyVision</p>
                  <p className="text-zinc-500 text-xs">AI-Powered PPE Detection System</p>
                </div>
              </div>

              <div className="flex items-center gap-5 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Model online
                </span>
                <span className="hidden sm:inline">YOLOv8 · Flask · React</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
              <p>&copy; {year} SafetyVision. All rights reserved.</p>
              <p>Built for workplace safety monitoring · Internal demo build</p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}