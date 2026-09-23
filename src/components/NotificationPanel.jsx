import { useEffect, useRef } from "react";

function NotificationPanel({
  notifications,
  setNotifications,
  isOpen,
  setIsOpen,
}) {
  const panelRef = useRef(null);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="notification-wrapper" ref={panelRef}>
      <button
        type="button"
        className="notification-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔

        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <div>
              <h3>Notifications</h3>

              <span>
                {unreadCount} unread notification
                {unreadCount !== 1 ? "s" : ""}
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="mark-read-btn"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className={`notification-item ${
                    !notification.read ? "unread" : ""
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div
                    className={`notification-icon ${notification.type}`}
                  >
                    {notification.type === "success" && "✓"}
                    {notification.type === "warning" && "!"}
                    {notification.type === "info" && "i"}
                  </div>

                  <div className="notification-content">
                    <strong>{notification.title}</strong>

                    <p>{notification.message}</p>

                    <span>{notification.time}</span>
                  </div>

                  {!notification.read && (
                    <span className="unread-dot"></span>
                  )}
                </button>
              ))
            ) : (
              <div className="notification-empty">
                <div>✓</div>
                <strong>You're all caught up</strong>
                <span>No new notifications.</span>
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button type="button" onClick={clearAll}>
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;