function Sidebar({ activePage, setActivePage }) {
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "▦",
    },
    {
      id: "upload",
      label: "Upload Media",
      icon: "↑",
    },
    {
      id: "monitoring",
      label: "Traffic Monitoring",
      icon: "◉",
    },
    {
      id: "violations",
      label: "Violations",
      icon: "⚠",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "▥",
    },
    {
      id: "history",
      label: "Detection History",
      icon: "◷",
    },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-section">
        <div className="logo-icon">TV</div>

        <div>
          <h2>TrafficVision</h2>
          <span>AI Monitoring</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-title">MAIN MENU</p>

        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${
              activePage === item.id ? "active" : ""
            }`}
            onClick={() => setActivePage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="system-status">
        <div className="status-dot"></div>

        <div>
          <strong>System Online</strong>
          <span>AI Engine Ready</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;