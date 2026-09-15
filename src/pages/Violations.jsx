function Violations() {
  const violations = [
    {
      id: "V-1024",
      vehicle: "Vehicle #1024",
      type: "No Helmet",
      confidence: "96.4%",
      time: "09:24 AM",
      severity: "High",
      status: "Detected",
    },
    {
      id: "V-1021",
      vehicle: "Vehicle #1021",
      type: "Overspeed",
      confidence: "93.8%",
      time: "09:18 AM",
      severity: "High",
      status: "Detected",
    },
    {
      id: "V-1017",
      vehicle: "Vehicle #1017",
      type: "Triple Riding",
      confidence: "91.2%",
      time: "09:11 AM",
      severity: "Medium",
      status: "Review",
    },
    {
      id: "V-1013",
      vehicle: "Vehicle #1013",
      type: "No Helmet",
      confidence: "95.1%",
      time: "08:56 AM",
      severity: "High",
      status: "Detected",
    },
    {
      id: "V-1008",
      vehicle: "Vehicle #1008",
      type: "Overspeed",
      confidence: "89.7%",
      time: "08:42 AM",
      severity: "Medium",
      status: "Review",
    },
  ];

  return (
    <div className="page-content violations-page">

      {/* Header */}
      <div className="page-header violation-page-header">
        <div>
          <span className="page-label">VIOLATION MANAGEMENT</span>
          <h1>Violations</h1>
          <p>
            Review and manage AI-detected traffic violations.
          </p>
        </div>

        <button className="export-btn">
          ↓ Export Report
        </button>
      </div>

      {/* Summary */}
      <section className="violation-summary">

        <div className="violation-summary-card">
          <span>Total Violations</span>
          <strong>186</strong>
          <small>Today</small>
        </div>

        <div className="violation-summary-card">
          <span>High Severity</span>
          <strong>116</strong>
          <small>62.4% of violations</small>
        </div>

        <div className="violation-summary-card">
          <span>Under Review</span>
          <strong>24</strong>
          <small>Requires attention</small>
        </div>

        <div className="violation-summary-card">
          <span>Resolved</span>
          <strong>46</strong>
          <small>Today</small>
        </div>

      </section>

      {/* Filters */}
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

        {/* Table */}
        <div className="table-wrapper">

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

              {violations.map((item) => (
                <tr key={item.id}>

                  <td className="violation-id">
                    {item.id}
                  </td>

                  <td className="vehicle-name">
                    {item.vehicle}
                  </td>

                  <td>
                    <div className="violation-type-cell">

                      <span
                        className={`violation-type-icon ${
                          item.type === "No Helmet"
                            ? "helmet-type"
                            : item.type === "Overspeed"
                            ? "speed-type"
                            : "triple-type"
                        }`}
                      >
                        {item.type === "No Helmet"
                          ? "H"
                          : item.type === "Overspeed"
                          ? "S"
                          : "3"}
                      </span>

                      <span>{item.type}</span>

                    </div>
                  </td>

                  <td>
                    <span className="confidence">
                      {item.confidence}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`severity ${
                        item.severity === "High"
                          ? "severity-high"
                          : "severity-medium"
                      }`}
                    >
                      {item.severity}
                    </span>
                  </td>

                  <td>{item.time}</td>

                  <td>
                    <span
                      className={`violation-status ${
                        item.status === "Detected"
                          ? "status-detected"
                          : "status-review"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

        {/* Footer */}
        <div className="violation-table-footer">
          <span>Showing 5 of 186 violations</span>

          <div>
            <button>‹</button>
            <button className="page-active">1</button>
            <button>2</button>
            <button>3</button>
            <button>›</button>
          </div>
        </div>

      </section>

    </div>
  );
}

export default Violations;