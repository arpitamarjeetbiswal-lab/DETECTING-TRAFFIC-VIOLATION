

function Dashboard({ setActivePage }) {
    return (
        <main className="dashboard">

            {/* Page Heading */}
            <div className="page-heading">
                <div>
                    <p className="breadcrumb">Overview / Dashboard</p>

                    <h1>Traffic Dashboard</h1>

                    <p className="subtitle">
                        Monitor traffic activity and AI-powered violations.
                    </p>
                </div>

                <button
                    className="analyze-btn"
                    onClick={() => setActivePage("upload")}
                >
                    + Analyze Media
                </button>
            </div>

            {/* Statistics */}
            <section className="stats-grid">

                <div className="stat-card">
                    <span className="stat-label">Vehicles Detected</span>
                    <h2>1,284</h2>
                    <span className="stat-change">↑ 12.5% today</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Total Violations</span>
                    <h2>186</h2>
                    <span className="stat-change">↑ 8.2% today</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Helmet Violations</span>
                    <h2>74</h2>
                    <span className="stat-change">5.8% of vehicles</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Overspeed Cases</span>
                    <h2>42</h2>
                    <span className="stat-change">3.2% of vehicles</span>
                </div>

            </section>

            {/* Charts */}
            <section className="dashboard-grid">

                {/* Violations */}
                <div className="panel violations-panel">

                    <div className="panel-header">
                        <div>
                            <h3>Violations</h3>
                            <p>Today's breakdown</p>
                        </div>
                    </div>

                    <div className="violation-item">
                        <span className="violation-icon helmet">H</span>

                        <div>
                            <strong>No Helmet</strong>
                            <small>74 cases</small>
                        </div>

                        <b>40%</b>
                    </div>

                    <div className="violation-item">
                        <span className="violation-icon triple">T</span>

                        <div>
                            <strong>Triple Riding</strong>
                            <small>38 cases</small>
                        </div>

                        <b>20%</b>
                    </div>

                    

                    <div className="violation-item">
                        <span className="violation-icon other">O</span>

                        <div>
                            <strong>Other Violations</strong>
                            <small>32 cases</small>
                        </div>

                        <b>17%</b>
                    </div>

                </div>

            </section>

            {/* Recent Detections */}
            <section className="panel recent-panel">

                <div className="panel-header">
                    <div>
                        <h3>Recent Detections</h3>
                        <p>Latest AI analysis results</p>
                    </div>

                    <button
                        className="view-btn"
                        onClick={() => setActivePage("history")}
                    >
                        View All
                    </button>
                </div>

                <div className="table-wrapper">

                    <table>

                        <thead>
                            <tr>
                                <th>Detection</th>
                                <th>Violation</th>
                                <th>Confidence</th>
                                <th>Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>

                            <tr>
                                <td>Vehicle #1024</td>
                                <td>No Helmet</td>
                                <td>96.4%</td>
                                <td>09:24 AM</td>

                                <td>
                                    <span className="badge danger">
                                        Detected
                                    </span>
                                </td>
                            </tr>

                            <tr>
                                <td>Vehicle #1021</td>
                                <td>No Helmet</td>
                                <td>93.8%</td>
                                <td>09:18 AM</td>

                                <td>
                                    <span className="badge danger">
                                        Detected
                                    </span>
                                </td>
                            </tr>

                            <tr>
                                <td>Vehicle #1017</td>
                                <td>Triple Riding</td>
                                <td>91.2%</td>
                                <td>09:11 AM</td>

                                <td>
                                    <span className="badge warning">
                                        Review
                                    </span>
                                </td>
                            </tr>

                            <tr>
                                <td>Vehicle #1013</td>
                                <td>No Violation</td>
                                <td>98.1%</td>
                                <td>08:56 AM</td>

                                <td>
                                    <span className="badge success">
                                        Clear
                                    </span>
                                </td>
                            </tr>

                        </tbody>

                    </table>

                </div>

            </section>

        </main>
    );
}

export default Dashboard;