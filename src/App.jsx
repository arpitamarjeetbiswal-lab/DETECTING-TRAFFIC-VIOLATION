import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import NotificationPanel from "./components/NotificationPanel";

import Dashboard from "./pages/Dashboard";
import UploadMedia from "./pages/UploadMedia";
import TrafficMonitoring from "./pages/TrafficMonitoring";
import Violations from "./pages/Violations";
import Analytics from "./pages/Analytics";
import DetectionHistory from "./pages/DetectionHistory";

function App() {
  // =========================
  // AUTHENTICATION
  // =========================

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("trafficVisionAuth") === "true";
  });

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("trafficVisionUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);

    localStorage.setItem("trafficVisionAuth", "true");
    localStorage.setItem(
      "trafficVisionUser",
      JSON.stringify(userData)
    );
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);

    localStorage.removeItem("trafficVisionAuth");
    localStorage.removeItem("trafficVisionUser");
  };

  // =========================
  // APPLICATION STATE
  // =========================

  const [activePage, setActivePage] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState("idle");

  const [analysisHistory, setAnalysisHistory] = useState([
    {
      id: "D-2048",
      fileName: "traffic_road_01.mp4",
      type: "Video",
      violations: "Helmet + Overspeed",
      vehicles: 42,
      violationCount: 8,
      confidence: 95.8,
      date: "15 Sep 2026",
      time: "09:24 AM",
      status: "Completed",
    },
    {
      id: "D-2047",
      fileName: "junction_camera_02.mp4",
      type: "Video",
      violations: "Triple Riding",
      vehicles: 36,
      violationCount: 5,
      confidence: 93.6,
      date: "15 Sep 2026",
      time: "09:10 AM",
      status: "Completed",
    },
    {
      id: "D-2046",
      fileName: "highway_sample.mp4",
      type: "Video",
      violations: "Overspeed",
      vehicles: 58,
      violationCount: 12,
      confidence: 91.4,
      date: "15 Sep 2026",
      time: "08:52 AM",
      status: "Completed",
    },
    {
      id: "D-2045",
      fileName: "traffic_image_04.jpg",
      type: "Image",
      violations: "No Helmet",
      vehicles: 18,
      violationCount: 4,
      confidence: 96.2,
      date: "14 Sep 2026",
      time: "05:42 PM",
      status: "Completed",
    },
    {
      id: "D-2044",
      fileName: "city_road_03.mp4",
      type: "Video",
      violations: "Multiple Violations",
      vehicles: 71,
      violationCount: 16,
      confidence: 94.7,
      date: "14 Sep 2026",
      time: "04:18 PM",
      status: "Completed",
    },
  ]);

  const defaultNotifications = [
    {
      id: 1,
      title: "Analysis Completed",
      message: "traffic_road_01.mp4 analysis completed successfully.",
      time: "2 min ago",
      type: "success",
      read: false,
    },
    {
      id: 2,
      title: "Violation Detected",
      message: "New helmet violation detected by AI engine.",
      time: "8 min ago",
      type: "warning",
      read: false,
    },
    {
      id: 3,
      title: "Camera Connected",
      message: "Traffic Camera CAM-01 is now online.",
      time: "15 min ago",
      type: "info",
      read: true,
    },
    {
      id: 4,
      title: "System Ready",
      message: "AI detection engine is ready for analysis.",
      time: "32 min ago",
      type: "info",
      read: true,
    },
  ];

  const [notifications, setNotifications] = useState(() => {
    const savedNotifications = localStorage.getItem(
      "trafficVisionNotifications"
    );

    return savedNotifications
      ? JSON.parse(savedNotifications)
      : defaultNotifications;
  });
  useEffect(() => {
    localStorage.setItem(
      "trafficVisionNotifications",
      JSON.stringify(notifications)
    );
  }, [notifications]);

  const [notificationOpen, setNotificationOpen] = useState(false);

  const handleGlobalSearch = () => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return;
    }

    // Violation related search
    const violationKeywords = [
      "helmet",
      "overspeed",
      "triple",
      "violation",
      "violations",
    ];

    const violationMatch = violationKeywords.some((keyword) =>
      query.includes(keyword)
    );

    if (violationMatch) {
      setActivePage("violations");
      return;
    }

    // Detection history related search
    const historyMatch = analysisHistory.some((item) =>
      `${item.id} ${item.fileName} ${item.type} ${item.violations} ${item.status}`
        .toLowerCase()
        .includes(query)
    );

    if (historyMatch) {
      setActivePage("history");
      return;
    }

    // Analytics
    if (
      query.includes("analytics") ||
      query.includes("chart") ||
      query.includes("graph")
    ) {
      setActivePage("analytics");
      return;
    }

    // Monitoring
    if (
      query.includes("monitor") ||
      query.includes("monitoring") ||
      query.includes("camera")
    ) {
      setActivePage("monitoring");
      return;
    }

    // Upload
    if (
      query.includes("upload") ||
      query.includes("media")
    ) {
      setActivePage("upload");
      return;
    }

    // Default
    setActivePage("dashboard");
  };

  // =========================
  // PAGE RENDERING
  // =========================

  const renderPage = () => {
    switch (activePage) {
      case "upload":
        return (
          <UploadMedia
            setActivePage={setActivePage}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            analysisResult={analysisResult}
            setAnalysisResult={setAnalysisResult}
            analysisStatus={analysisStatus}
            setAnalysisStatus={setAnalysisStatus}
            analysisHistory={analysisHistory}
            setAnalysisHistory={setAnalysisHistory}
            notifications={notifications}
            setNotifications={setNotifications}
          />
        );

      case "monitoring":
        return (
          <TrafficMonitoring
            setActivePage={setActivePage}
            selectedFile={selectedFile}
            analysisResult={analysisResult}
            analysisStatus={analysisStatus}
          />
        );

      case "violations":
        return <Violations />;

      case "analytics":
        return <Analytics />;

      case "history":
        return <DetectionHistory analysisHistory={analysisHistory} />;

      case "dashboard":
      default:
        return <Dashboard setActivePage={setActivePage} />;
    }
  };

  // =========================
  // LOGIN SCREEN
  // =========================

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // =========================
  // MAIN APPLICATION
  // =========================

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="main-content">

        <header className="topbar">

          <div className="search-box">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleGlobalSearch();
                }
              }}
            />

            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="topbar-right">

            <NotificationPanel
              notifications={notifications}
              setNotifications={setNotifications}
              isOpen={notificationOpen}
              setIsOpen={setNotificationOpen}
            />

            <div className="profile">

              <div className="profile-avatar">
                {user?.name?.charAt(0).toUpperCase() || "A"}
              </div>

              <div>
                <strong>
                  {user?.name || "Admin"}
                </strong>

                <span>
                  Administrator
                </span>
              </div>

            </div>

            <button
              type="button"
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>

        </header>

        {renderPage()}

      </main>
    </div>
  );
}

export default App;