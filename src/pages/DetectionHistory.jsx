function DetectionHistory() {
  const history = [
    {
      id: "D-2048",
      media: "traffic_road_01.mp4",
      type: "Helmet + Overspeed",
      vehicles: 42,
      violations: 8,
      confidence: "95.8%",
      date: "15 Sep 2026",
      time: "09:24 AM",
      status: "Completed",
    },
    {
      id: "D-2047",
      media: "junction_camera_02.mp4",
      type: "Triple Riding",
      vehicles: 36,
      violations: 5,
      confidence: "93.6%",
      date: "15 Sep 2026",
      time: "09:10 AM",
      status: "Completed",
    },
    {
      id: "D-2046",
      media: "highway_sample.mp4",
      type: "Overspeed",
      vehicles: 58,
      violations: 12,
      confidence: "91.4%",
      date: "15 Sep 2026",
      time: "08:52 AM",
      status: "Completed",
    },
    {
      id: "D-2045",
      media: "traffic_image_04.jpg",
      type: "No Helmet",
      vehicles: 18,
      violations: 4,
      confidence: "96.2%",
      date: "14 Sep 2026",
      time: "05:42 PM",
      status: "Completed",
    },
    {
      id: "D-2044",
      media: "city_road_03.mp4",
      type: "Multiple Violations",
      vehicles: 71,
      violations: 16,
      confidence: "94.7%",
      date: "14 Sep 2026",
      time: "04:18 PM",
      status: "Completed",
    },
  ];

  return (
    <div className="page-content history-page">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <span className="page-label">AI DETECTION RECORDS</span>

          <h1>Detection History</h1>

          <p>
            Review previous traffic media analysis and detection results.
          </p>
        </div>

        <button className="history-filter-btn">
          Filter Results
        </button>
      </div>

      {/* SUMMARY */}
      <section className="history-summary">

        <div className="history-summary-card">
          <span>Total Analyses</span>
          <strong>248</strong>
          <small>All time</small>
        </div>

        <div className="history-summary-card">
          <span>Completed</span>
          <strong>231</strong>
          <small>93.1% success rate</small>
        </div>

        <div className="history-summary-card">
          <span>Vehicles Processed</span>
          <strong>12,846</strong>
          <small>Across all analyses</small>
        </div>

        <div className="history-summary-card">
          <span>Violations Found</span>
          <strong>1,482</strong>
          <small>AI detected</small>
        </div>

      </section>

      {/* HISTORY TABLE */}
      <section className="panel history-table-panel">

        <div className="history-table-header">
          <div>
            <h3>Analysis Records</h3>
            <p>Previously processed traffic media</p>
          </div>

          <select className="history-select" defaultValue="all">
            <option value="all">All Records</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
          </select>
        </div>

        <div className="table-wrapper">

          <table className="history-table">

            <thead>
              <tr>
                <th>ID</th>
                <th>Media</th>
                <th>Detection Type</th>
                <th>Vehicles</th>
                <th>Violations</th>
                <th>Confidence</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {history.map((item) => (
                <tr key={item.id}>

                  <td className="history-id">
                    {item.id}
                  </td>

                  <td>
                    <div className="history-media">

                      <div className="media-icon">
                        {item.media.endsWith(".mp4") ? "VID" : "IMG"}
                      </div>

                      <div>
                        <strong>{item.media}</strong>
                        <span>Traffic Media</span>
                      </div>

                    </div>
                  </td>

                  <td>
                    <span className="detection-type">
                      {item.type}
                    </span>
                  </td>

                  <td>
                    <strong>{item.vehicles}</strong>
                  </td>

                  <td>
                    <span className="violation-count">
                      {item.violations}
                    </span>
                  </td>

                  <td>
                    <span className="history-confidence">
                      {item.confidence}
                    </span>
                  </td>

                  <td>
                    <div className="history-date">
                      <span>{item.date}</span>
                      <small>{item.time}</small>
                    </div>
                  </td>

                  <td>
                    <span className="history-status">
                      <span></span>
                      {item.status}
                    </span>
                  </td>

                  <td>
                    <button className="history-view-btn">
                      View
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>

        </div>

        {/* FOOTER */}
        <div className="history-table-footer">

          <span>
            Showing 5 of 248 detection records
          </span>

          <div>
            <button>‹</button>
            <button className="history-page-active">1</button>
            <button>2</button>
            <button>3</button>
            <button>›</button>
          </div>

        </div>

      </section>

    </div>
  );
}

export default DetectionHistory;