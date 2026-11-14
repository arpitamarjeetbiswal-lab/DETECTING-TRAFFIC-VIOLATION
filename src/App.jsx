import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import NotificationPanel from "./components/NotificationPanel";

import Dashboard from "./pages/Dashboard";
import UploadMedia from "./pages/UploadMedia";
import TrafficMonitoring from "./pages/TrafficMonitoring";
import Violations from "./pages/Violations";
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

  const [analysisHistory, setAnalysisHistory] = useState(() => {
    try {
      const savedHistory = localStorage.getItem("trafficVisionAnalysisHistory");
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "trafficVisionAnalysisHistory",
      JSON.stringify(analysisHistory)
    );
  }, [analysisHistory]);

  const defaultNotifications = [
    {
      id: "system-ready",
      title: "System Ready",
      message: "Image analysis is ready.",
      time: "Now",
      type: "info",
      read: true,
    },
  ];

  const [notifications, setNotifications] = useState(() => {
    const savedNotifications = localStorage.getItem(
      "trafficVisionNotifications"
    );

    if (!savedNotifications) {
      return defaultNotifications;
    }

    try {
      const parsedNotifications = JSON.parse(savedNotifications);
      return Array.isArray(parsedNotifications)
        ? parsedNotifications.filter(
            (item) => ![1, 2, 3, 4].includes(item.id)
          )
        : defaultNotifications;
    } catch {
      return defaultNotifications;
    }
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

      case "history":
        return <DetectionHistory analysisHistory={analysisHistory} />;

      case "dashboard":
      default:
        return (
          <Dashboard
            setActivePage={setActivePage}
            analysisHistory={analysisHistory}
          />
        );
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
