import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = "http://localhost:5000/api";

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#18181b",
    border: "1px solid #3f3f46",
    borderRadius: "10px",
    fontSize: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },
};

function StatusPill({ status }) {
  const variants = {
    done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    processing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    error: "bg-red-500/15 text-red-400 border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[status] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
      {status}
    </span>
  );
}

function MetricCard({ label, value, icon, accent, sub }) {
  const accents = {
    amber: "from-amber-500/15 to-amber-500/0 border-l-amber-500",
    red: "from-red-500/15 to-red-500/0 border-l-red-500",
    emerald: "from-emerald-500/15 to-emerald-500/0 border-l-emerald-500",
    blue: "from-blue-500/15 to-blue-500/0 border-l-blue-500",
  };
  return (
    <div className={`relative overflow-hidden bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 border-l-2 ${accents[accent]} hover:border-zinc-700 transition-colors group`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${accents[accent]} opacity-50 group-hover:opacity-80 transition-opacity`} />
      <div className="relative">
        <div className="text-2xl mb-3">{icon}</div>
        <div className="text-3xl font-bold tabular-nums tracking-tight">{value}</div>
        <div className="text-zinc-500 text-sm mt-1">{label}</div>
        {sub && <div className="text-zinc-600 text-xs mt-1">{sub}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/dashboard/stats`);
        setStats(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const complianceChartData = (stats?.recent_analyses ?? [])
    .map((a) => ({
      name: a.original_filename.length > 14 ? a.original_filename.slice(0, 12) + "…" : a.original_filename,
      compliance: a.compliance_rate ?? 0,
    }))
    .reverse();

  const totalFiles = stats?.total_files ?? 0;
  const totalVideos = stats?.total_videos ?? 0;
  const totalImages = stats?.total_images ?? 0;
  const helmetsDetected = stats?.total_workers_with_helmet ?? 0;
  const workersWithoutHelmet = stats?.total_violations ?? 0;

  const filesBreakdown =
    totalFiles === 0
      ? "No files yet"
      : `${totalVideos} video${totalVideos !== 1 ? "s" : ""}, ${totalImages} image${totalImages !== 1 ? "s" : ""}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Real-time PPE compliance overview across all analyzed media</p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5 w-fit"
        >
          <span className="text-base leading-none">+</span> New analysis
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Files analyzed" value={totalFiles} icon="🗂️" accent="amber" sub={filesBreakdown} />
        <MetricCard label="Workers with helmet" value={helmetsDetected} icon="🪖" accent="blue" sub="peak per file, summed" />
        <MetricCard label="Without helmet" value={workersWithoutHelmet} icon="⚠️" accent="red" sub="workers flagged" />
        <MetricCard label="Avg compliance" value={`${stats?.average_compliance_rate ?? 0}%`} icon="✅" accent="emerald" sub="across all uploads" />
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Compliance by file</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Helmet compliance rate for the most recent analyses</p>
          </div>
        </div>
        {complianceChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={complianceChartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} formatter={(v) => [`${v.toFixed(1)}%`, "Compliance"]} />
              <Bar dataKey="compliance" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {complianceChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.compliance >= 80 ? "#34d399" : "#f87171"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex flex-col items-center justify-center text-zinc-600">
            <span className="text-4xl mb-2">📊</span>
            <span className="text-sm">No data yet — upload a file to get started</span>
          </div>
        )}
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">Recent analyses</h2>
          <Link to="/reports" className="text-amber-500 text-sm hover:text-amber-400 transition-colors font-medium">
            View all →
          </Link>
        </div>
        {(stats?.recent_analyses?.length ?? 0) > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs">
                <th className="text-left px-6 py-3 font-medium">File</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">With helmet</th>
                <th className="text-left px-4 py-3 font-medium">Without helmet</th>
                <th className="text-left px-4 py-3 font-medium">Compliance</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {stats.recent_analyses.map((a) => (
                <tr key={a.id} className="border-t border-zinc-800/60 hover:bg-zinc-800/40 transition-colors">
                  <td className="px-6 py-3.5 text-zinc-200 max-w-[220px] truncate">{a.original_filename}</td>
                  <td className="px-4 py-3.5 text-zinc-400">
                    {a.media_type === "image" ? "🖼️ Image" : "🎞️ Video"}
                  </td>
                  <td className="px-4 py-3.5"><StatusPill status={a.status} /></td>
                  <td className="px-4 py-3.5 tabular-nums text-emerald-400">
                    {Math.max(0, (a.estimated_people ?? 0) - (a.inferred_violations ?? 0))}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-red-400">{a.inferred_violations ?? 0}</td>
                  <td className="px-4 py-3.5 tabular-nums">
                    <span className={a.compliance_rate >= 80 ? "text-emerald-400" : "text-red-400"}>
                      {a.compliance_rate?.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Link to={`/analysis/${a.id}`} className="text-amber-500 hover:text-amber-400 text-xs transition-colors font-medium">
                      Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-16 text-center text-zinc-600">
            <p className="text-4xl mb-3">📹</p>
            <p className="text-sm">
              No analyses yet —{" "}
              <Link to="/upload" className="text-amber-500 hover:text-amber-400 transition-colors">
                upload a file
              </Link>{" "}
              to begin
            </p>
          </div>
        )}
      </div>
    </div>
  );
}