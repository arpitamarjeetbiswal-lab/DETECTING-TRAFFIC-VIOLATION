import { useMemo, useState } from "react";

function Violations() {
  const [typeFilter, setTypeFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const violationsData = [
    {
      id: "V-1024",
      vehicle: "Vehicle #1024",
      type: "No Helmet",
      confidence: 96.4,
      time: "09:24 AM",
      severity: "High",
      status: "Detected",
    },
    {
      id: "V-1021",
      vehicle: "Vehicle #1021",
      type: "Overspeed",
      confidence: 93.8,
      time: "09:18 AM",
      severity: "High",
      status: "Detected",
    },
    {
      id: "V-1017",
      vehicle: "Vehicle #1017",
      type: "Triple Riding",
      confidence: 91.2,
      time: "09:11 AM",
      severity: "Medium",
      status: "Review",
    },
    {
      id: "V-1013",
      vehicle: "Vehicle #1013",
      type: "No Helmet",
      confidence: 95.1,
      time: "08:56 AM",
      severity: "High",
      status: "Detected",
    },
    {
      id: "V-1008",
      vehicle: "Vehicle #1008",
      type: "Overspeed",
      confidence: 89.7,
      time: "08:42 AM",
      severity: "Medium",
      status: "Review",
    },
  ];

  const filteredViolations = useMemo(() => {
    return violationsData.filter((item) => {
      const matchesType =
        typeFilter === "All" || item.type === typeFilter;

      const matchesSeverity =
        severityFilter === "All" ||
        item.severity === severityFilter;

      const search = searchTerm.toLowerCase();

      const matchesSearch =
        item.id.toLowerCase().includes(search) ||
        item.vehicle.toLowerCase().includes(search) ||
        item.type.toLowerCase().includes(search);

      return matchesType && matchesSeverity && matchesSearch;
    });
  }, [typeFilter, severityFilter, searchTerm]);

  const totalViolations = violationsData.length;

  const highSeverity = violationsData.filter(
    (item) => item.severity === "High"
  ).length;

  const underReview = violationsData.filter(
    (item) => item.status === "Review"
  ).length;

  const resolved = violationsData.filter(
    (item) => item.status === "Resolved"
  ).length;

  return (
    <div className="page-content violations-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <span className="page-label">TRAFFIC VIOLATIONS</span>

          <h1>Violations</h1>

          <p>
            Review and manage AI-detected traffic violations.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="violation-summary">
        <div className="violation-summary-card">
          <span>Total Violations</span>
          <strong>{totalViolations}</strong>
        </div>

        <div className="violation-summary-card">
          <span>High Severity</span>
          <strong>{highSeverity}</strong>
        </div>

        <div className="violation-summary-card">
          <span>Under Review</span>
          <strong>{underReview}</strong>
        </div>

        <div className="violation-summary-card">
          <span>Resolved</span>
          <strong>{resolved}</strong>
        </div>
      </div>

      {/* Main Panel */}
      <div className="violations-panel">
        {/* Toolbar */}
        <div className="violations-toolbar">
          <div>
            <span className="page-label">DETECTION RECORDS</span>

            <h3>Recent Violations</h3>
          </div>

          <div className="violations-controls">
            {/* Search */}
            <div className="violation-search">
              <span>⌕</span>

              <input
                type="text"
                placeholder="Search violations..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
              />
            </div>

            {/* Type */}
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value)
              }
            >
              <option value="All">All Types</option>
              <option value="No Helmet">No Helmet</option>
              <option value="Overspeed">Overspeed</option>
              <option value="Triple Riding">
                Triple Riding
              </option>
            </select>

            {/* Severity */}
            <select
              value={severityFilter}
              onChange={(e) =>
                setSeverityFilter(e.target.value)
              }
            >
              <option value="All">All Severity</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="violations-table-wrapper">
          <table className="violations-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Vehicle</th>
                <th>Violation Type</th>
                <th>Confidence</th>
                <th>Time</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredViolations.length > 0 ? (
                filteredViolations.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="violation-id">
                        {item.id}
                      </span>
                    </td>

                    <td>
                      <strong className="vehicle-name">
                        {item.vehicle}
                      </strong>
                    </td>

                    <td>
                      <span className="violation-type">
                        {item.type}
                      </span>
                    </td>

                    <td>
                      <span className="violation-confidence">
                        {item.confidence}%
                      </span>
                    </td>

                    <td>
                      <span className="violation-time">
                        {item.time}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`severity-badge ${item.severity.toLowerCase()}`}
                      >
                        {item.severity}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`violation-status ${item.status.toLowerCase()}`}
                      >
                        <span className="violation-status-dot"></span>

                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="violations-empty">
                      <div className="violations-empty-icon">
                        ✓
                      </div>

                      <strong>No violations found</strong>

                      <p>
                        Try changing your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="violations-footer">
          <span>
            Showing{" "}
            <strong>{filteredViolations.length}</strong>{" "}
            of <strong>{violationsData.length}</strong>{" "}
            violations
          </span>

          <div className="violations-pagination">
            <button type="button" disabled>
              ←
            </button>

            <span className="violations-page-active">
              1
            </span>

            <button type="button" disabled>
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Violations;