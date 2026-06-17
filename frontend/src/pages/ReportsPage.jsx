import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api";

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

function MetricBlock({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold tabular-nums ${color ?? "text-white"}`}>{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function ReportsPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = () => {
    axios
      .get(`${API}/analyses`)
      .then((res) => setAnalyses(res.data.analyses))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await axios.delete(`${API}/video/${id}`);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const videoCount = analyses.filter((a) => a.media_type === "video").length;
  const imageCount = analyses.filter((a) => a.media_type === "image").length;

  const filtered = analyses.filter((a) => {
    if (filter === "videos") return a.media_type === "video";
    if (filter === "images") return a.media_type === "image";
    if (filter === "violations") return (a.inferred_violations ?? 0) > 0;
    return true;
  });

  const subtitle =
    analyses.length === 0
      ? "No files processed yet"
      : `${videoCount} video${videoCount !== 1 ? "s" : ""}, ${imageCount} image${imageCount !== 1 ? "s" : ""} processed`;

  const filters = [
    { key: "all", label: "All", count: analyses.length },
    { key: "videos", label: "Videos", count: videoCount },
    { key: "images", label: "Images", count: imageCount },
    { key: "violations", label: "Violations", count: analyses.filter((a) => (a.inferred_violations ?? 0) > 0).length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-zinc-500 text-sm mt-1">{subtitle}</p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5 w-fit"
        >
          <span className="text-base leading-none">+</span> New upload
        </Link>
      </div>

      {analyses.length > 0 && (
        <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1 w-fit">
          {filters.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-sm px-3.5 py-1.5 rounded-lg transition-all font-medium ${
                filter === key
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-md shadow-amber-500/20"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
              }`}
            >
              {label} <span className="opacity-70 tabular-nums">({count})</span>
            </button>
          ))}
        </div>
      )}

      {analyses.length === 0 ? (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl py-16 text-center text-zinc-600">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">
            No reports yet.{" "}
            <Link to="/upload" className="text-amber-500 hover:text-amber-400 transition-colors">
              Upload a video or image
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl py-16 text-center text-zinc-600">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm">No files match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const hasViolations = (a.inferred_violations ?? 0) > 0;
            return (
              <div
                key={a.id}
                className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-base shrink-0 mt-0.5">
                      {a.media_type === "image" ? "🖼️" : "🎞️"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-200 truncate">{a.original_filename}</p>
                      <p className="text-zinc-600 text-xs mt-0.5">
                        {new Date(a.upload_time).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusPill status={a.status} />
                    {a.status === "done" && (
                      <Link
                        to={`/analysis/${a.id}`}
                        className="text-xs text-amber-500 hover:text-amber-400 font-medium transition-colors"
                      >
                        View →
                      </Link>
                    )}

                    {confirmId === a.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">Delete?</span>
                        <button
                          onClick={() => handleDelete(a.id)}
                          disabled={deletingId === a.id}
                          className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                        >
                          {deletingId === a.id ? "Deleting..." : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-1 rounded-md transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(a.id)}
                        className="text-xs text-zinc-600 hover:text-red-400 transition-colors p-1 rounded"
                        title="Delete report"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {a.status === "done" && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-4 gap-3">
                    <MetricBlock label="Workers detected" value={a.estimated_people ?? 0} />
                    <MetricBlock label="Without helmet" value={a.inferred_violations ?? 0} color={hasViolations ? "text-red-400" : "text-emerald-400"} />
                    <MetricBlock
                      label="Compliance"
                      value={`${a.compliance_rate?.toFixed(1)}%`}
                      color={a.compliance_rate >= 80 ? "text-emerald-400" : "text-red-400"}
                    />
                    <MetricBlock
                      label={a.media_type === "image" ? "Type" : "Duration"}
                      value={a.media_type === "image" ? "Image" : `${a.duration_seconds?.toFixed(0)}s`}
                      color="text-zinc-300"
                    />
                  </div>
                )}

                {a.status === "processing" && (
                  <div className="mt-3 flex items-center gap-2 text-blue-400 text-sm">
                    <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}