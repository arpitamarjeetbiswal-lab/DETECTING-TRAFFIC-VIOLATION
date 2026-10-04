import { useEffect, useState } from "react";

function Violations() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/violations")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch violations");
        }
        return response.json();
      })
      .then((data) => {
        setViolations(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to connect to Traffic Violation API");
        setLoading(false);
      });
  }, []);

  const getSeverity = (type) => {
    const value = type.toLowerCase();

    if (value.includes("helmet") || value.includes("triple")) {
      return "High";
    }

    return "Medium";
  };

  const getIconClass = (type) => {
    const value = type.toLowerCase();

    if (value.includes("helmet")) return "helmet-type";
    if (value.includes("triple")) return "triple-type";

    return "speed-type";
  };

  const getIcon = (type) => {
    const value = type.toLowerCase();

    if (value.includes("helmet")) return "H";
    if (value.includes("triple")) return "3";

    return "S";
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "-";

    const date = new Date(timestamp.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalViolations = violations.length;

  const highSeverity = violations.filter(
    (item) => getSeverity(item.violation_type) === "High"
  ).length;

  return (
    <div className="page-content violations-page">

      <div className="page-header violation-page-header">
        <div>
          <span className="page-label">
            VIOLATION MANAGEMENT
          </span>

          <h1>Violations</h1>

          <p>
            Review and manage AI-detected traffic violations.
          </p>
        </div>

        <button className="export-btn">
          ↗ Export Report
        </button>
      </div>

      <section className="violation-summary">

        <div className="violation-summary-card">
          <span>Total Violations</span>
          <strong>{totalViolations}</strong>
          <small>Recorded in database</small>
        </div>

        <div className="violation-summary-card">
          <span>High Severity</span>
          <strong>{highSeverity}</strong>
          <small>Current records</small>
        </div>

        <div className="violation-summary-card">
          <span>Under Review</span>
          <strong>0</strong>
          <small>Requires attention</small>
        </div>

        <div className="violation-summary-card">
          <span>Resolved</span>
          <strong>0</strong>
          <small>Current records</small>
        </div>

      </section>

      <section className="panel violation-table-panel">

        <div className="violation-toolbar">

          <div>
            <h3>Detected Violations</h3>
            <p>AI-generated violation records</p>
          </div>

          <div className="violation-filters">

            <select defaultValue="all">
              <option value="all">All Violations</option>
              <option value="helmet">No Helmet</option>
              <option value="triple">Triple Riding</option>
              <option value="speed">Overspeed</option>
            </select>

            <select defaultValue="all">
              <option value="all">All Severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>

          </div>

        </div>

        <div className="table-wrapper">

          {loading && (
            <p style={{ padding: "20px" }}>
              Loading violations...
            </p>
          )}

          {error && (
            <p style={{ padding: "20px" }}>
              {error}
            </p>
          )}

          {!loading && !error && (
            <table className="violation-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Vehicle</th>
                  <th>Violation</th>
                  <th>Confidence</th>
                  <th>Severity</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {violations.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center" }}>
                      No violations recorded yet.
                    </td>
                  </tr>
                ) : (
                  violations.map((item) => {

                    const severity =
                      getSeverity(item.violation_type);

                    return (
                      <tr key={item.id}>

                        <td className="violation-id">
                          V-{item.id}
                        </td>

                        <td className="vehicle-name">
                          Vehicle #{item.bike_id}
                        </td>

                        <td>
                          <div className="violation-type-cell">

                            <span
                              className={`violation-type-icon ${getIconClass(
                                item.violation_type
                              )}`}
                            >
                              {getIcon(item.violation_type)}
                            </span>

                            <span>
                              {item.violation_type}
                            </span>

                          </div>
                        </td>

                        <td>
                          <span className="confidence">
                            N/A
                          </span>
                        </td>

                        <td>
                          <span
                            className={`severity ${
                              severity === "High"
                                ? "severity-high"
                                : "severity-medium"
                            }`}
                          >
                            {severity}
                          </span>
                        </td>

                        <td>
                          {formatTime(item.timestamp)}
                        </td>

                        <td>
                          <span className="violation-status status-detected">
                            Detected
                          </span>
                        </td>

                      </tr>
                    );
                  })
                )}

              </tbody>

            </table>
          )}

        </div>

        <div className="violation-table-footer">

          <span>
            Showing {violations.length} violation
            {violations.length !== 1 ? "s" : ""}
          </span>

          <div>
            <button>‹</button>
            <button className="page-active">1</button>
            <button>›</button>
          </div>

        </div>

      </section>

    </div>
  );
}

export default Violations;
