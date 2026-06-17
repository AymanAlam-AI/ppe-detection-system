import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api";

function Stat({ label, value, color, icon }) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-center hover:border-zinc-700 transition-colors">
      {icon && <div className="text-lg mb-1">{icon}</div>}
      <div className={`text-2xl font-bold tabular-nums ${color ?? "text-white"}`}>{value ?? 0}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
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

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]);

  const load = async () => {
    try {
      const statusRes = await axios.get(`${API}/video/${id}/status`);
      setStatus(statusRes.data.status);

      if (statusRes.data.status === "done") {
        const [resultRes, reportRes] = await Promise.all([
          axios.get(`${API}/video/${id}/result`),
          axios.get(`${API}/report/${id}`),
        ]);
        setAnalysis(resultRes.data);
        setReport(reportRes.data);
        setLoading(false);
      } else if (
        statusRes.data.status === "processing" ||
        statusRes.data.status === "pending"
      ) {
        setLoading(false);
        pollRef.current = setInterval(async () => {
          const res = await axios.get(`${API}/video/${id}/status`);
          if (res.data.status === "done") {
            clearInterval(pollRef.current);
            load();
          } else if (res.data.status === "error") {
            clearInterval(pollRef.current);
            setStatus("error");
          }
        }, 3000);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "processing" || status === "pending") {
    return (
      <div className="text-center py-24 space-y-3">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-zinc-300">Analyzing...</p>
        <p className="text-zinc-600 text-sm">This may take a few minutes depending on file length.</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-24 text-zinc-600">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-sm">
          Analysis not found.{" "}
          <Link to="/reports" className="text-amber-500 hover:text-amber-400 transition-colors">
            Go back
          </Link>
        </p>
      </div>
    );
  }

  const classChartData = Object.entries(analysis.class_counts ?? {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const estimatedPeople = analysis.estimated_people ?? 0;
  const inferredViolations = analysis.inferred_violations ?? 0;
  const workersWithHelmet = Math.max(0, estimatedPeople - inferredViolations);
  const helmetsDetected = analysis.helmets_detected ?? analysis.class_counts?.helmet ?? 0;
  const pass = estimatedPeople === 0 ? null : inferredViolations === 0;
  const isImage = analysis.media_type === "image";

  const violationFrames = analysis.violation_frames ?? [];
  const totalFrames = analysis.total_frames || 1;

  const downloadUrl = `${API}/video/${id}/download`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
            <Link to="/reports" className="hover:text-zinc-300 transition-colors">Reports</Link>
            <span>/</span>
            <span className="text-zinc-300 truncate max-w-[240px]">{analysis.original_filename}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Analysis report</h1>
        </div>
        <a
          href={downloadUrl}
          className="shrink-0 inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm px-4 py-2.5 rounded-xl transition-colors font-medium border border-zinc-700"
        >
          ⬇ Download annotated {isImage ? "image" : "video"}
        </a>
      </div>

      <div className={`rounded-2xl p-5 border ${
        pass === null
          ? "bg-zinc-800/50 border-zinc-700"
          : pass
          ? "bg-emerald-500/10 border-emerald-500/20"
          : "bg-red-500/10 border-red-500/20"
      }`}>
        <div className="flex items-center gap-4">
          <span className="text-4xl">
            {pass === null ? "➖" : pass ? "✅" : "❌"}
          </span>
          <div>
            <div className="flex items-baseline gap-3">
              {pass === null ? (
                <span className="text-lg font-bold text-zinc-300">No PPE detected</span>
              ) : (
                <span className={`text-2xl font-bold tabular-nums ${pass ? "text-emerald-400" : "text-red-400"}`}>
                  {analysis.compliance_rate?.toFixed(1)}% compliance
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-sm mt-0.5">
              {estimatedPeople > 0
                ? `${estimatedPeople} workers detected · ${inferredViolations} without helmet · ${analysis.original_filename}`
                : `No workers detected · ${analysis.original_filename}`}
            </p>
          </div>
        </div>
      </div>

      {isImage && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Annotated image</p>
          <img
            src={downloadUrl}
            alt="Annotated analysis result"
            className="w-full rounded-xl border border-zinc-800"
          />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Workers detected" value={estimatedPeople} color="text-blue-400" icon="👷" />
        <Stat label="With helmet" value={workersWithHelmet} color="text-emerald-400" icon="🪖" />
        <Stat label="Without helmet" value={inferredViolations} color="text-red-400" icon="⚠️" />
        <Stat label="Compliance" value={`${analysis.compliance_rate?.toFixed(1)}%`} color={pass ? "text-emerald-400" : "text-red-400"} icon="✅" />
        <Stat label="Helmets detected" value={helmetsDetected} />
        <Stat label={isImage ? "Media type" : "Duration"} value={isImage ? "Image" : `${analysis.duration_seconds?.toFixed(0)}s`} />
        <Stat label="Processing time" value={`${analysis.processing_time?.toFixed(1)}s`} />
        <Stat label="Violation frames" value={violationFrames.length} color="text-red-400" />
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-zinc-200 mb-1">Helmet compliance breakdown</h2>
        <p className="text-zinc-500 text-xs mb-5">
          Share of workers detected with vs without a safety helmet in this {isImage ? "image" : "video"}
        </p>
        {estimatedPeople > 0 ? (
          <div className="space-y-4">
            <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden flex">
              {workersWithHelmet > 0 && (
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(workersWithHelmet / estimatedPeople) * 100}%` }}
                />
              )}
              {inferredViolations > 0 && (
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${(inferredViolations / estimatedPeople) * 100}%` }}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-sm text-zinc-300">
                  With helmet — <span className="font-semibold tabular-nums">{workersWithHelmet}</span>{" "}
                  <span className="text-zinc-500">
                    ({estimatedPeople > 0 ? ((workersWithHelmet / estimatedPeople) * 100).toFixed(0) : 0}%)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm text-zinc-300">
                  Without helmet — <span className="font-semibold tabular-nums">{inferredViolations}</span>{" "}
                  <span className="text-zinc-500">
                    ({estimatedPeople > 0 ? ((inferredViolations / estimatedPeople) * 100).toFixed(0) : 0}%)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 shrink-0" />
                <span className="text-sm text-zinc-300">
                  Total workers — <span className="font-semibold tabular-nums">{estimatedPeople}</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[120px] flex items-center justify-center text-zinc-600">
            <span className="text-sm">No workers detected in this file</span>
          </div>
        )}
      </div>

      {violationFrames.length > 0 && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-zinc-200 mb-1">Violation timeline</h2>
          <p className="text-zinc-600 text-xs mb-4">
            First at frame {violationFrames[0]} · {violationFrames.length} violation frames ·{" "}
            {report?.violation_timeline?.violation_density}
          </p>
          <div className="w-full h-5 bg-zinc-800 rounded-full overflow-hidden relative">
            {violationFrames.slice(0, 300).map((frame) => (
              <div
                key={frame}
                className="absolute top-0 h-full w-0.5 bg-red-500 opacity-75"
                style={{ left: `${(frame / totalFrames) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-zinc-700 mt-1.5">
            <span>0</span>
            <span>{analysis.total_frames} frames</span>
          </div>
        </div>
      )}

      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">Class breakdown</h2>
        </div>
        {classChartData.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs">
                <th className="text-left px-6 py-3 font-medium">Class</th>
                <th className="text-left px-4 py-3 font-medium">Count</th>
                <th className="text-left px-4 py-3 font-medium">Share</th>
                <th className="text-left px-6 py-3 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {classChartData.map(({ name, value }) => {
                const isViolation = ["no helmet", "no vest"].some((v) =>
                  name.toLowerCase().includes(v)
                );
                return (
                  <tr key={name} className="border-t border-zinc-800/60">
                    <td className="px-6 py-3 text-zinc-200">{name}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-300">{value}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-500">
                      {analysis.total_detections > 0
                        ? `${((value / analysis.total_detections) * 100).toFixed(1)}%`
                        : "0%"}
                    </td>
                    <td className="px-6 py-3">
                      {isViolation ? (
                        <span className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                          Violation
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Compliant
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-10 text-center text-zinc-600 text-sm">No detections recorded</div>
        )}
      </div>
    </div>
  );
}