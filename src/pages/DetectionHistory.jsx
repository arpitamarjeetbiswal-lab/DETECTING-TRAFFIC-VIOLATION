import { useMemo, useState } from "react";

function DetectionHistory({ analysisHistory = [] }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHistory = useMemo(() => {
    return analysisHistory.filter((item) => {
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      const search = searchTerm.toLowerCase();

      const matchesSearch =
        item.fileName.toLowerCase().includes(search) ||
        item.id.toLowerCase().includes(search) ||
        item.violations.toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [analysisHistory, statusFilter, searchTerm]);

  const totalAnalyses = analysisHistory.length;

  const completedAnalyses = analysisHistory.filter(
    (item) => item.status === "Completed"
  ).length;

  const vehiclesProcessed = analysisHistory.reduce(
    (total, item) => total + item.vehicles,
    0
  );

  const violationsFound = analysisHistory.reduce(
    (total, item) => total + item.violationCount,
    0
  );

  return (
    <div className="page-content history-page">
      <div className="page-header">
        <div>
          <span className="page-label">ANALYSIS RECORDS</span>
          <h1>Detection History</h1>
          <p>
            Review previous traffic media analysis and AI detection results.
          </p>
        </div>
      </div>

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
          <span>Vehicles Processed</span>
          <strong>{vehiclesProcessed.toLocaleString()}</strong>
        </div>

        <div className="history-summary-card">
          <span>Violations Found</span>
          <strong>{violationsFound}</strong>
        </div>
      </div>

      {/* History Card */}
      <div className="history-card">
        <div className="history-toolbar">
          <div>
            <span className="page-label">RECENT ANALYSIS</span>
            <h3>Detection Records</h3>
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
              <option value="Processing">Processing</option>
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
                <th>Violations</th>
                <th>Vehicles</th>
                <th>Detected</th>
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
                          <strong>{item.fileName}</strong>
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
                        {item.confidence}%
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
                        Try changing the search term or status filter.
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

          <div className="history-page-info">
            <button type="button" disabled>
              ←
            </button>

            <span className="active-page-number">1</span>

            <button type="button" disabled>
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetectionHistory;