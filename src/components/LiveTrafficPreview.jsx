import { useEffect, useRef, useState } from "react";

function LiveTrafficPreview() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const startCamera = async () => {
    try {
      setCameraError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraActive(true);
    } catch (error) {
      console.error(error);
      setCameraError("Camera access was denied or is unavailable.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <section className="live-monitor-panel">
      <div className="live-monitor-header">
        <div>
          <span className="live-monitor-label">LIVE MONITORING</span>
          <h3>Traffic Camera Preview</h3>
          <p>AI-powered vehicle detection preview</p>
        </div>

        <div className={`camera-status ${cameraActive ? "online" : ""}`}>
          <span></span>
          {cameraActive ? "LIVE" : "OFFLINE"}
        </div>
      </div>

      <div className="camera-preview">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={cameraActive ? "camera-video active" : "camera-video"}
        />

        {!cameraActive && (
          <div className="camera-placeholder">
            <div className="camera-placeholder-icon">◉</div>

            <strong>Camera Preview</strong>

            <span>
              Start your webcam to preview live traffic monitoring.
            </span>

            <button
              type="button"
              className="start-camera-btn"
              onClick={startCamera}
            >
              Start Camera
            </button>

            {cameraError && (
              <small className="camera-error">{cameraError}</small>
            )}
          </div>
        )}

        {cameraActive && (
          <>
            <div className="camera-overlay-top">
              <span>CAM-01</span>
              <span>AI ENGINE ACTIVE</span>
            </div>

            <div className="detection-box detection-one">
              <span>Vehicle</span>
              <strong>96%</strong>
            </div>

            <div className="detection-box detection-two">
              <span>Vehicle</span>
              <strong>92%</strong>
            </div>

            <div className="scan-line"></div>

            <div className="camera-overlay-bottom">
              <span>● Detection Active</span>
              <span>Vehicles: 02</span>
            </div>
          </>
        )}
      </div>

      <div className="live-monitor-footer">
        <div>
          <span>Camera</span>
          <strong>{cameraActive ? "Webcam 01" : "Not Connected"}</strong>
        </div>

        <div>
          <span>Detection</span>
          <strong>{cameraActive ? "AI Scanning" : "Standby"}</strong>
        </div>

        <div>
          <span>Mode</span>
          <strong>Live Preview</strong>
        </div>

        {cameraActive && (
          <button
            type="button"
            className="stop-camera-btn"
            onClick={stopCamera}
          >
            Stop Camera
          </button>
        )}
      </div>
    </section>
  );
}

export default LiveTrafficPreview;