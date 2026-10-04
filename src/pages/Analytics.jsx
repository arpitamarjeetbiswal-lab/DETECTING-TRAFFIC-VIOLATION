import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

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
  { hour: "8 AM", vehicles: 420 },
  { hour: "9 AM", vehicles: 680 },
  { hour: "10 AM", vehicles: 540 },
  { hour: "12 PM", vehicles: 390 },
  { hour: "2 PM", vehicles: 470 },
  { hour: "5 PM", vehicles: 720 },
  { hour: "6 PM", vehicles: 810 },
  { hour: "7 PM", vehicles: 650 },
];

const chartTooltip = {
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: "8px",
  color: "#fff",
};

function Analytics() {
  return (
    <div className="page-content analytics-page">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <span className="page-label">DATA VISUALIZATION</span>

          <h1>Analytics</h1>

          <p>
            Visual analysis of traffic and AI detection data.
          </p>
        </div>

        <select className="analytics-period" defaultValue="7">
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>

      {/* VIOLATION TREND */}
      <section className="panel analytics-large-chart">

        <div className="panel-header">
          <div>
            <h3>Violation Trend</h3>
            <p>Traffic violations detected each day</p>
          </div>
        </div>

        <div className="analytics-chart">
          <LineChart
            width={900}
            height={320}
            data={violationTrend}
            margin={{
              top: 15,
              right: 20,
              left: 0,
              bottom: 5,
            }}
          >
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
            />

            <YAxis
              stroke="#64748b"
              tickLine={false}
              axisLine={false}
            />

            <Tooltip contentStyle={chartTooltip} />

            <Line
              type="monotone"
              dataKey="violations"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </div>
      </section>

      {/* VEHICLES + DISTRIBUTION */}
      <section className="analytics-chart-grid">

        {/* DAILY VEHICLES */}
        <div className="panel analytics-chart-panel">

          <div className="panel-header">
            <div>
              <h3>Daily Vehicle Count</h3>
              <p>Vehicles processed by AI</p>
            </div>
          </div>

          <div className="analytics-chart">
            <BarChart
              width={500}
              height={280}
              data={vehicleData}
              margin={{
                top: 15,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
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
              />

              <YAxis
                stroke="#64748b"
                tickLine={false}
                axisLine={false}
              />

              <Tooltip contentStyle={chartTooltip} />

              <Bar
                dataKey="vehicles"
                fill="#3b82f6"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </div>
        </div>

        {/* VIOLATION DISTRIBUTION */}
        <div className="panel analytics-chart-panel">

          <div className="panel-header">
            <div>
              <h3>Violation Distribution</h3>
              <p>Breakdown by violation type</p>
            </div>
          </div>

          <div className="analytics-pie">
            <PieChart width={500} height={280}>
              <Pie
                data={violationDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
              >
                <Cell fill="#ef4444" />
                <Cell fill="#3b82f6" />
                <Cell fill="#f59e0b" />
                <Cell fill="#8b5cf6" />
              </Pie>

              <Tooltip contentStyle={chartTooltip} />

              <Legend />
            </PieChart>
          </div>
        </div>
      </section>

      {/* CONFIDENCE + PEAK HOURS */}
      <section className="analytics-chart-grid">

        {/* AI CONFIDENCE */}
        <div className="panel analytics-chart-panel">

          <div className="panel-header">
            <div>
              <h3>AI Detection Confidence</h3>
              <p>Average confidence percentage</p>
            </div>
          </div>

          <div className="analytics-chart">
            <LineChart
              width={500}
              height={280}
              data={confidenceData}
              margin={{
                top: 15,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
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
              />

              <YAxis
                domain={[80, 100]}
                stroke="#64748b"
                tickLine={false}
                axisLine={false}
              />

              <Tooltip contentStyle={chartTooltip} />

              <Line
                type="monotone"
                dataKey="confidence"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </div>
        </div>

        {/* PEAK TRAFFIC HOURS */}
        <div className="panel analytics-chart-panel">

          <div className="panel-header">
            <div>
              <h3>Peak Traffic Hours</h3>
              <p>Vehicle activity by time</p>
            </div>
          </div>

          <div className="analytics-chart">
            <BarChart
              width={500}
              height={280}
              data={trafficHours}
              margin={{
                top: 15,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid
                stroke="#1f2937"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="hour"
                stroke="#64748b"
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke="#64748b"
                tickLine={false}
                axisLine={false}
              />

              <Tooltip contentStyle={chartTooltip} />

              <Bar
                dataKey="vehicles"
                fill="#8b5cf6"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </div>
        </div>

      </section>
    </div>
  );
}

export default Analytics;