import { useState } from "react";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import UploadMedia from "./pages/UploadMedia";
import TrafficMonitoring from "./pages/TrafficMonitoring";
import Violations from "./pages/Violations";
import Analytics from "./pages/Analytics";
import DetectionHistory from "./pages/DetectionHistory";

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState("idle");

  // Detection history
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
        return (
          <DetectionHistory
            analysisHistory={analysisHistory}
          />
        );

      case "dashboard":
      default:
        return <Dashboard setActivePage={setActivePage} />;
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
            />
          </div>

          <div className="topbar-right">
            <button className="notification-btn">
              🔔
            </button>

            <div className="profile">
              <div className="profile-avatar">
                A
              </div>

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