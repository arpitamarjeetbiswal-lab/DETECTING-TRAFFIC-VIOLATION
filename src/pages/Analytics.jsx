import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API_URL = "http://127.0.0.1:5000";
const COLORS = ["#60a5fa", "#f59e0b"];

function Analytics({ analysisHistory = [] }) {
  const [records, setRecords] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/violations`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load saved records.");
        return response.json();
      })
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch((error) => {
        if (error.name !== "AbortError") setLoadError(error.message);
      });
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const confidenceValues = analysisHistory
      .filter((item) => item.confidence !== null && item.confidence !== undefined && item.confidence !== "")
      .map((item) => Number(item.confidence))
      .filter(Number.isFinite);
    const motorcycles = analysisHistory.reduce(
      (sum, item) => sum + (Number(item.vehicles) || 0), 0
    );
    return {
      analyses: analysisHistory.length,
      motorcycles,
      savedRecords: records.length,
      averageConfidence: confidenceValues.length
        ? `${(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(1)}%`
        : "N/A",
    };
  }, [analysisHistory, records]);

  const dailyRecords = useMemo(() => {
    const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return { key: dateKey(date), day: date.toLocaleDateString(undefined, { weekday: "short" }), records: 0 };
    });
    const byDate = new Map(days.map((day) => [day.key, day]));
    records.forEach((item) => {
      const key = String(item.timestamp || "").slice(0, 10);
      const day = byDate.get(key);
      if (day) day.records += 1;
    });
    return days;
  }, [records]);

  const distribution = useMemo(() => [
    { name: "Confirmed no helmet", value: records.filter((item) => item.violation_type === "NO HELMET").length },
    { name: "Triple riding · review", value: records.filter((item) => item.violation_type === "POSSIBLE TRIPLE RIDING").length },
  ].filter((item) => item.value > 0), [records]);

  return (
    <div className="page-content analytics-page">
      <div className="page-header analytics-header">
        <div>
          <span className="page-label">IMAGE ANALYSIS INSIGHTS</span>
          <h1>Analytics</h1>
          <p>Summaries from analyses saved in this browser and violation records saved by Flask.</p>
        </div>
      </div>

      <div className="analytics-summary">
        <div className="analytics-summary-card"><span>Image Analyses</span><strong>{summary.analyses}</strong><small>Saved on this browser</small></div>
        <div className="analytics-summary-card"><span>Motorcycles Detected</span><strong>{summary.motorcycles}</strong><small>Across saved image analyses</small></div>
        <div className="analytics-summary-card"><span>Saved Violation Records</span><strong>{loadError ? "—" : summary.savedRecords}</strong><small>{loadError ? "Flask API unavailable" : "From the local database"}</small></div>
        <div className="analytics-summary-card"><span>Avg. Helmet Confidence</span><strong>{summary.averageConfidence}</strong><small>Only analyses with detections</small></div>
      </div>

      {loadError && <div className="analytics-panel"><p>{loadError} Start the Flask API to load database analytics.</p></div>}

      <div className="analytics-chart-grid">
        <div className="analytics-panel">
          <div className="analytics-panel-header"><div><span className="page-label">SAVED DATABASE RECORDS</span><h3>Records by Day</h3></div><span className="analytics-badge">LAST 7 DAYS</span></div>
          <div className="analytics-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyRecords} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid stroke="#263449" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #263449", borderRadius: "8px", color: "#ffffff" }} />
                <Line type="monotone" dataKey="records" name="Saved records" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="analytics-panel">
          <div className="analytics-panel-header"><div><span className="page-label">DATABASE BREAKDOWN</span><h3>Record Types</h3></div><span className="analytics-badge">SAVED</span></div>
          <div className="analytics-chart" style={{ height: "320px" }}>
            {distribution.length ? <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={distribution} cx="50%" cy="45%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value">{distribution.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #263449", borderRadius: "8px", color: "#ffffff" }} />
                <Legend verticalAlign="bottom" iconType="circle" />
              </PieChart>
            </ResponsiveContainer> : <div className="dashboard-empty">No saved violation records to chart yet.</div>}
          </div>
        </div>
      </div>

      <div className="analytics-panel analytics-wide-panel">
        <div className="analytics-panel-header"><div><span className="page-label">CURRENT PROJECT SCOPE</span><h3>Metrics not available in image-only analysis</h3></div></div>
        <p>Vehicle traffic volume by hour, live camera counts, overspeed, and model accuracy are not measured by this prototype. Overspeed is N/A; possible triple riding is a review alert, not a confirmed violation.</p>
      </div>
    </div>
  );
}

export default Analytics;
