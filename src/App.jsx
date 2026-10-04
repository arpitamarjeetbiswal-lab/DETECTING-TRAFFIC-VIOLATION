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

  const renderPage = () => {
    switch (activePage) {
      case "upload":
        return <UploadMedia />;

      case "monitoring":
        return <TrafficMonitoring setActivePage={setActivePage} />;

      case "violations":
        return <Violations />;

      case "analytics":
        return <Analytics />;

      case "history":
        return <DetectionHistory />;

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