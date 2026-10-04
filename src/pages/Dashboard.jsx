import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

const trafficData = [
    { day: "Mon", vehicles: 820 },
    { day: "Tue", vehicles: 1040 },
    { day: "Wed", vehicles: 920 },
    { day: "Thu", vehicles: 1280 },
    { day: "Fri", vehicles: 1160 },
    { day: "Sat", vehicles: 1420 },
    { day: "Sun", vehicles: 1284 },
];

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

                {/* Traffic Activity */}
                <div className="panel traffic-panel">

                    <div className="panel-header">
                        <div>
                            <h3>Traffic Activity</h3>
                            <p>Vehicle detections over the last 7 days</p>
                        </div>

                        <select defaultValue="7">
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                        </select>
                    </div>

                    <div className="real-chart">
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={trafficData}>

                                <defs>
                                    <linearGradient
                                        id="trafficGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="#3b82f6"
                                            stopOpacity={0.3}
                                        />

                                        <stop
                                            offset="95%"
                                            stopColor="#3b82f6"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid
                                    stroke="#1f2937"
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="day"
                                    stroke="#64748b"
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={10}
                                />

                                <YAxis
                                    stroke="#64748b"
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={10}
                                />

                                <Tooltip
                                    contentStyle={{
                                        background: "#111827",
                                        border: "1px solid #334155",
                                        borderRadius: "8px",
                                        color: "#fff",
                                    }}
                                />

                                <Area
                                    type="monotone"
                                    dataKey="vehicles"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#trafficGradient)"
                                />

                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                </div>

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
                        <span className="violation-icon speed">S</span>

                        <div>
                            <strong>Overspeed</strong>
                            <small>42 cases</small>
                        </div>

                        <b>23%</b>
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
                                <td>Overspeed</td>
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