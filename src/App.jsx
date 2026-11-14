
import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar";
import NotificationPanel from "./components/NotificationPanel";

import Dashboard from "./pages/Dashboard";
import UploadMedia from "./pages/UploadMedia";
import TrafficMonitoring from "./pages/TrafficMonitoring";
import Violations from "./pages/Violations";
import DetectionHistory from "./pages/DetectionHistory";

function App() {
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
    try {
      const savedNotifications = localStorage.getItem(
        "trafficVisionNotifications"
      );

      return savedNotifications
        ? JSON.parse(savedNotifications)
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

    if (!query) return;

    const violationKeywords = [
      "helmet",
      "overspeed",
      "triple",
      "violation",
      "violations",
    ];

    if (
      violationKeywords.some((keyword) => query.includes(keyword))
    ) {
      setActivePage("violations");
      return;
    }

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

    if (
      query.includes("upload") ||
      query.includes("media")
    ) {
      setActivePage("upload");
      return;
    }

    setActivePage("dashboard");
  };

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
              <div className="profile-avatar">A</div>

              <div>
                <strong>Admin</strong>
                <span>Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {renderPage()}
      </main>
    </div>
  );
}

export default App;
