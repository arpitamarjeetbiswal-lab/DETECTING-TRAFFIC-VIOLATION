import { useEffect, useMemo, useState } from "react";
import { classifyViolationRecord } from "../utils/violationRecords";

const API_URL = "http://127.0.0.1:5000";

function Violations() {
  const [records, setRecords] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredRecords = useMemo(() => records.filter((item) => {
    const flags = classifyViolationRecord(item);
    const type = item.violation_type || "Unknown";
    const matchesType = typeFilter === "All"
      || (typeFilter === "NO HELMET" && flags.hasNoHelmet)
      || (typeFilter === "POSSIBLE TRIPLE RIDING" && flags.hasTripleRiding);
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch = !search || [item.id, item.bike_id, item.number_plate, item.image_path, type]
      .some((value) => String(value ?? "").toLowerCase().includes(search));
    return matchesType && matchesSearch;
  }), [records, typeFilter, searchTerm]);

  const helmetCount = records.filter((item) => classifyViolationRecord(item).hasNoHelmet).length;
  const reviewCount = records.filter((item) => classifyViolationRecord(item).hasTripleRiding).length;

  return (
    <div className="page-content violations-page">
      <div className="page-header">
        <div>
          <span className="page-label">SAVED IMAGE ANALYSIS RECORDS</span>
          <h1>Violations</h1>
          <p>Confirmed no-helmet records and possible triple-riding alerts saved by the image analysis.</p>
        </div>
      </div>

      <div className="violation-summary">
        <div className="violation-summary-card"><span>Saved Records</span><strong>{records.length}</strong></div>
        <div className="violation-summary-card"><span>No-Helmet Records</span><strong>{helmetCount}</strong></div>
        <div className="violation-summary-card"><span>Triple-Riding Reviews · incl. legacy</span><strong>{reviewCount}</strong></div>
        <div className="violation-summary-card"><span>Overspeed</span><strong>N/A</strong></div>
      </div>

      <div className="violations-panel">
        <div className="violations-toolbar">
          <div><span className="page-label">FROM THE LOCAL DATABASE</span><h3>Saved Violation Records</h3></div>
          <div className="violations-controls">
            <div className="violation-search"><span>⌕</span><input type="search" placeholder="Search plate, bike, image..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="All">All record types</option>
              <option value="NO HELMET">No Helmet</option>
              <option value="POSSIBLE TRIPLE RIDING">Triple Riding · Review</option>
            </select>
          </div>
        </div>
        <div className="violations-table-wrapper">
          <table className="violations-table">
            <thead><tr><th>ID</th><th>Bike</th><th>Record Type</th><th>Number Plate</th><th>Image</th><th>Date &amp; Time</th></tr></thead>
            <tbody>
              {loadError ? <tr><td colSpan="6"><div className="violations-empty"><strong>{loadError}</strong><p>Make sure the Flask API is running, then refresh this page.</p></div></td></tr>
                : filteredRecords.length ? filteredRecords.map((item) => {
                  const recordType = classifyViolationRecord(item);
                  return <tr key={item.id}>
                    <td><span className="violation-id">{item.id}</span></td>
                    <td><strong className="vehicle-name">{item.bike_id == null ? "N/A" : `Bike ${item.bike_id}`}</strong></td>
                    <td><span className="violation-type">{recordType.displayType}</span></td>
                    <td>{item.number_plate && item.number_plate !== "NOT_AVAILABLE" ? item.number_plate : "Unreadable / unavailable"}</td>
                    <td>{item.image_path?.split(/[\\/]/).pop() || "—"}</td>
                    <td><span className="violation-time">{item.timestamp || "—"}</span></td>
                  </tr>;
                }) : <tr><td colSpan="6"><div className="violations-empty"><strong>{records.length ? "No records match these filters" : "No saved records yet"}</strong><p>{records.length ? "Try another search or record type." : "Analyze an image to create database records."}</p></div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="violations-footer"><span>Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> saved records</span></div>
      </div>
    </div>
  );
}

export default Violations;
