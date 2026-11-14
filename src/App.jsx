
import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar";
import NotificationPanel from "./components/NotificationPanel";

import Dashboard from "./pages/Dashboard";
import UploadMedia from "./pages/UploadMedia";
import TrafficMonitoring from "./pages/TrafficMonitoring";
import Violations from "./pages/Violations";
import DetectionHistory from "./pages/DetectionHistory";
import { API_URL } from "./api";

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState("idle");

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const [analysisHistory, setAnalysisHistory] = useState(() => {
    try {
      const savedHistory = localStorage.getItem("trafficVisionAnalysisHistory");
      const parsedHistory = savedHistory ? JSON.parse(savedHistory) : [];
      return Array.isArray(parsedHistory) ? parsedHistory : [];
    } catch {
      return [];
    }
  });

  const [analysisHistoryLoaded, setAnalysisHistoryLoaded] = useState(false);
  const [analysisHistoryError, setAnalysisHistoryError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadSharedHistory = async () => {
      const legacyHistory = (() => {
        try {
          return JSON.parse(localStorage.getItem("trafficVisionAnalysisHistory") || "[]");
        } catch {
          return [];
        }
      })();

      try {
        if (
          !localStorage.getItem("trafficVisionHistoryMigratedV1") &&
          Array.isArray(legacyHistory) &&
          legacyHistory.length > 0
        ) {
          const importResponse = await fetch(`${API_URL}/api/analysis-history/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ records: legacyHistory }),
            signal: controller.signal,
          });
          if (!importResponse.ok) throw new Error("Could not migrate local analysis history.");
        }

        const response = await fetch(`${API_URL}/api/analysis-history`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not load shared analysis history.");
        const records = await response.json();
        if (!Array.isArray(records)) throw new Error("The history response was invalid.");

        setAnalysisHistory(records);
        setAnalysisHistoryError("");
        localStorage.setItem("trafficVisionHistoryMigratedV1", "1");
      } catch (error) {
        if (error.name !== "AbortError") {
          setAnalysisHistoryError("Could not sync with the shared history database. Showing this browser's saved copy.");
          console.error("Shared analysis history unavailable:", error);
        }
      } finally {
        if (!controller.signal.aborted) setAnalysisHistoryLoaded(true);
      }
    };

    loadSharedHistory();
    return () => controller.abort();
  }, []);

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
            previewUrl={previewUrl}
            setPreviewUrl={setPreviewUrl}
            analysisResult={analysisResult}
            setAnalysisResult={setAnalysisResult}
            analysisStatus={analysisStatus}
            setAnalysisStatus={setAnalysisStatus}
            setAnalysisHistory={setAnalysisHistory}
            setNotifications={setNotifications}
          />
        );

      case "monitoring":
        return (
          <TrafficMonitoring
            setActivePage={setActivePage}
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            analysisResult={analysisResult}
            analysisStatus={analysisStatus}
          />
        );

      case "violations":
        return <Violations />;

      case "history":
        return <DetectionHistory analysisHistory={analysisHistory} historyLoaded={analysisHistoryLoaded} historyError={analysisHistoryError} />;

      case "dashboard":
      default:
        return (
          <Dashboard
            setActivePage={setActivePage}
            analysisHistory={analysisHistory}
            historyLoaded={analysisHistoryLoaded}
            historyError={analysisHistoryError}
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
