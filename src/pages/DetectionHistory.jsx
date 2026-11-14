import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../api";

function DetectionHistory({ analysisHistory = [], historyLoaded = false, historyError = "" }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [savedViolations, setSavedViolations] = useState([]);
  const [savedViolationsError, setSavedViolationsError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_URL}/api/violations`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load saved violations.");
        }
        return response.json();
      })
      .then((records) => {
        setSavedViolations(Array.isArray(records) ? records : []);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setSavedViolationsError(error.message);
        }
      });

    return () => controller.abort();
  }, []);

  const filteredHistory = useMemo(() => {
    return analysisHistory.filter((item) => {
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      const search = searchTerm.toLowerCase();

      const matchesSearch =
        String(item.fileName || "").toLowerCase().includes(search) ||
        String(item.id || "").toLowerCase().includes(search) ||
        String(item.violations || "").toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [analysisHistory, statusFilter, searchTerm]);

  const totalAnalyses = analysisHistory.length;

  const completedAnalyses = analysisHistory.filter(
    (item) => item.status === "Completed"
  ).length;

  const vehiclesProcessed = analysisHistory.reduce(
    (total, item) => total + (Number(item.vehicles) || 0),
    0
  );

  const confirmedViolations = analysisHistory.reduce(
    (total, item) => total + (Number(item.violationCount) || 0),
    0
  );
  const reviewAlerts = analysisHistory.reduce(
    (total, item) => total + (Number(item.reviewCount) || 0),
    0
  );

  return (
    <div className="page-content history-page">
      <div className="page-header">
        <div>
            <span className="page-label">{historyError ? "LOCAL HISTORY COPY" : "SHARED ANALYSIS RECORDS"}</span>
          <h1>Detection History</h1>
          <p>
            {historyError
              ? "The shared history is unavailable; showing this browser’s saved copy."
              : "Review image analyses saved in the shared project database."}
          </p>
        </div>
      </div>

      {historyError && <p className="history-sync-warning" role="status">{historyError}</p>}

      {/* Summary Cards */}
      <div className="history-summary">
        <div className="history-summary-card">
          <span>Total Analyses</span>
          <strong>{totalAnalyses}</strong>
        </div>

        <div className="history-summary-card">
          <span>Completed</span>
          <strong>{completedAnalyses}</strong>
        </div>

        <div className="history-summary-card">
          <span>Motorcycles Processed</span>
          <strong>{vehiclesProcessed.toLocaleString()}</strong>
        </div>

        <div className="history-summary-card">
          <span>Confirmed No-Helmet</span>
          <strong>{confirmedViolations}</strong>
        </div>

        <div className="history-summary-card history-summary-card--review">
          <span>Triple-Riding Estimates · Review</span>
          <strong>{reviewAlerts}</strong>
        </div>
      </div>

      {/* History Card */}
      <div className="history-card">
        <div className="history-toolbar">
          <div>
            <span className="page-label">RECENT ANALYSIS</span>
            <h3>Image Analysis Records</h3>
          </div>

          <div className="history-controls">
            <div className="history-search">
              <span>⌕</span>

              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Media File</th>
                <th>AI Finding Summary</th>
                <th>Motorcycles</th>
                <th>Confirmed No-Helmet</th>
                <th>Confidence</th>
                <th>Date & Time</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="history-id">{item.id}</span>
                    </td>

                    <td>
                      <div className="history-file">
                        <div className="history-file-icon">
                          {item.type === "Video" ? "VID" : "IMG"}
                        </div>

                        <div>
                          <strong title={item.fileName}>{item.fileName}</strong>
                          <span>{item.type}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="history-violation">
                        {item.violations}
                      </span>
                    </td>

                    <td>
                      <strong className="history-number">
                        {item.vehicles}
                      </strong>
                    </td>

                    <td>
                      <strong className="history-number">
                        {item.violationCount}
                      </strong>
                    </td>

                    <td>
                      <span className="history-confidence">
                        {item.confidence == null
                          ? "N/A"
                          : `${item.confidence}%`}
                      </span>
                    </td>

                    <td>
                      <div className="history-date">
                        <strong>{item.date}</strong>
                        <span>{item.time}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`history-status ${item.status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        <span className="history-status-dot"></span>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">
                    <div className="history-empty">
                      <div className="history-empty-icon">⌕</div>

                      <strong>No records found</strong>

                      <p>
                        {!historyLoaded ? "Loading shared history…" : "No image analyses have been saved yet, or the current"}{historyLoaded && " "}
                        {historyLoaded && "search and status filters found no matches."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="history-footer">
          <span>
            Showing <strong>{filteredHistory.length}</strong> of{" "}
            <strong>{analysisHistory.length}</strong> analyses
          </span>
          <small>Confirmed counts include no-helmet detections. Triple-riding counts are estimates and need review.</small>
        </div>
      </div>

      <div className="history-card">
        <div className="history-toolbar">
          <div>
            <span className="page-label">SAVED IN DATABASE</span>
            <h3>Violation Records</h3>
          </div>
        </div>

        {savedViolationsError ? (
          <p role="alert">{savedViolationsError} Check that the Flask API is running.</p>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Violation</th>
                  <th>Bike</th>
                  <th>Number Plate</th>
                  <th>Image</th>
                  <th>Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {savedViolations.length > 0 ? savedViolations.map((record) => (
                  <tr key={record.id}>
                    <td><span className="history-id">{record.id}</span></td>
                    <td><span className="history-violation">{record.violation_type}</span></td>
                    <td>{record.bike_id == null ? "N/A" : `Bike ${record.bike_id}`}</td>
                    <td>{record.number_plate === "NOT_AVAILABLE" ? "Unreadable / unavailable" : record.number_plate}</td>
                    <td><span className="table-file-name" title={record.image_path?.split(/[\\/]/).pop() || "N/A"}>{record.image_path?.split(/[\\/]/).pop() || "N/A"}</span></td>
                    <td>{record.timestamp || "N/A"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6">No saved violation records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DetectionHistory;
