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

function Analytics() {
  const violationTrend = [
    { day: "Mon", violations: 22 },
    { day: "Tue", violations: 31 },
    { day: "Wed", violations: 26 },
    { day: "Thu", violations: 38 },
    { day: "Fri", violations: 34 },
    { day: "Sat", violations: 42 },
    { day: "Sun", violations: 35 },
  ];

  const vehicleData = [
    { day: "Mon", vehicles: 1120 },
    { day: "Tue", vehicles: 1280 },
    { day: "Wed", vehicles: 1190 },
    { day: "Thu", vehicles: 1430 },
    { day: "Fri", vehicles: 1370 },
    { day: "Sat", vehicles: 1580 },
    { day: "Sun", vehicles: 1420 },
  ];

  const violationDistribution = [
    { name: "No Helmet", value: 74 },
    { name: "Overspeed", value: 42 },
    { name: "Triple Riding", value: 38 },
    { name: "Other", value: 32 },
  ];

  const confidenceData = [
    { day: "Mon", confidence: 91 },
    { day: "Tue", confidence: 93 },
    { day: "Wed", confidence: 92 },
    { day: "Thu", confidence: 95 },
    { day: "Fri", confidence: 94 },
    { day: "Sat", confidence: 96 },
    { day: "Sun", confidence: 95 },
  ];

  const trafficHours = [
    { time: "8 AM", vehicles: 420 },
    { time: "9 AM", vehicles: 680 },
    { time: "10 AM", vehicles: 540 },
    { time: "12 PM", vehicles: 390 },
    { time: "2 PM", vehicles: 470 },
    { time: "5 PM", vehicles: 720 },
    { time: "6 PM", vehicles: 810 },
    { time: "7 PM", vehicles: 650 },
  ];

  return (
    <div className="page-content analytics-page">

      {/* HEADER */}
      <div className="page-header analytics-header">
        <div>
          <span className="page-label">TRAFFIC INSIGHTS</span>

          <h1>Analytics</h1>

          <p>
            Analyze traffic activity, violations and AI detection
            performance.
          </p>
        </div>

        <select className="analytics-period">
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Last 90 Days</option>
        </select>
      </div>

      {/* SUMMARY */}
      <div className="analytics-summary">

        <div className="analytics-summary-card">
          <span>Total Vehicles</span>
          <strong>9,390</strong>
          <small>Processed this week</small>
        </div>

        <div className="analytics-summary-card">
          <span>Total Violations</span>
          <strong>132</strong>
          <small>Detected by AI</small>
        </div>

        <div className="analytics-summary-card">
          <span>Detection Confidence</span>
          <strong>94%</strong>
          <small>Average AI confidence</small>
        </div>

        <div className="analytics-summary-card">
          <span>Peak Traffic</span>
          <strong>6 PM</strong>
          <small>810 vehicles detected</small>
        </div>

      </div>

      {/* FIRST FOUR CHARTS */}
      <div className="analytics-chart-grid">

        {/* DAILY VIOLATIONS */}
        <div className="analytics-panel">

          <div className="analytics-panel-header">
            <div>
              <span className="page-label">VIOLATION TREND</span>
              <h3>Daily Violations</h3>
            </div>

            <span className="analytics-badge">
              7 DAYS
            </span>
          </div>

          <div className="analytics-chart">

            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={violationTrend}
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  stroke="#263449"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                />

                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                />

                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #263449",
                    borderRadius: "8px",
                    color: "#ffffff",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="violations"
                  stroke="#60a5fa"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#60a5fa",
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>

          </div>
        </div>

        {/* VEHICLES PROCESSED */}
        <div className="analytics-panel">

          <div className="analytics-panel-header">
            <div>
              <span className="page-label">TRAFFIC VOLUME</span>
              <h3>Vehicles Processed</h3>
            </div>

            <span className="analytics-badge">
              7 DAYS
            </span>
          </div>

          <div className="analytics-chart">

            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={vehicleData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  stroke="#263449"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                />

                <YAxis
                  stroke="#94a3b8"
                />

                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #263449",
                    borderRadius: "8px",
                    color: "#ffffff",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="vehicles"
                  stroke="#60a5fa"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>

          </div>
        </div>

        {/* VIOLATION DISTRIBUTION */}
        <div className="analytics-panel">

          <div className="analytics-panel-header">
            <div>
              <span className="page-label">
                VIOLATION BREAKDOWN
              </span>

              <h3>Violation Distribution</h3>
            </div>

            <span className="analytics-badge">
              TOTAL
            </span>
          </div>

          <div
            className="analytics-chart"
            style={{ height: "320px" }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>

                <Pie
                  data={violationDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {[
                    "#60a5fa",
                    "#818cf8",
                    "#a78bfa",
                    "#64748b",
                  ].map((color, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={color}
                    />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #263449",
                    borderRadius: "8px",
                    color: "#ffffff",
                  }}
                />

                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                />

              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DETECTION CONFIDENCE */}
        <div className="analytics-panel">

          <div className="analytics-panel-header">
            <div>
              <span className="page-label">
                AI PERFORMANCE
              </span>

              <h3>Detection Confidence</h3>
            </div>

            <span className="analytics-badge">
              AI MODEL
            </span>
          </div>

          <div className="analytics-chart">

            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={confidenceData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  stroke="#263449"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                />

                <YAxis
                  domain={[85, 100]}
                  stroke="#94a3b8"
                />

                <Tooltip
                  formatter={(value) => [
                    `${value}%`,
                    "Confidence",
                  ]}
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #263449",
                    borderRadius: "8px",
                    color: "#ffffff",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="#60a5fa"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>

          </div>
        </div>

      </div>

      {/* HOURLY TRAFFIC — FULL WIDTH */}
      <div className="analytics-panel analytics-wide-panel traffic-hours-panel">

        <div className="analytics-panel-header">
          <div>
            <span className="page-label">
              TRAFFIC ACTIVITY
            </span>

            <h3>Hourly Traffic Volume</h3>
          </div>

          <span className="analytics-badge">
            TODAY
          </span>
        </div>

        <div className="analytics-chart">

          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trafficHours}
              margin={{
                top: 10,
                right: 20,
                left: 0,
                bottom: 10,
              }}
            >
              <CartesianGrid
                stroke="#263449"
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="time"
                stroke="#94a3b8"
              />

              <YAxis
                stroke="#94a3b8"
              />

              <Tooltip
                formatter={(value) => [
                  `${value} vehicles`,
                  "Traffic",
                ]}
                contentStyle={{
                  background: "#111827",
                  border: "1px solid #263449",
                  borderRadius: "8px",
                  color: "#ffffff",
                }}
              />

              <Line
                type="monotone"
                dataKey="vehicles"
                stroke="#60a5fa"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />

            </LineChart>
          </ResponsiveContainer>

        </div>
      </div>

    </div>
  );
}

export default Analytics;