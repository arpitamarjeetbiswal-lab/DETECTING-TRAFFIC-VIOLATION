import { useEffect, useState } from "react";

function TrafficMonitoring({
  setActivePage,
  selectedFile,
  analysisResult,
  analysisStatus,
}) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const isVideo = selectedFile?.type?.startsWith("video/");

  const getEngineStatus = () => {
    if (analysisStatus === "processing") return "Processing";
    if (analysisStatus === "completed") return "Analysis Complete";
    return "Ready";
  };

  return (
    <div className="page-content monitoring-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <span className="page-label">AI MONITORING</span>
          <h1>Traffic Monitoring</h1>
          <p>
            Monitor uploaded media and review AI-powered traffic detection
            results.
          </p>
        </div>

        <div
          className={`monitoring-status ${
            analysisStatus === "processing"
              ? "processing"
              : analysisStatus === "completed"
              ? "completed"
              : ""
          }`}
        >
          <span className="status-dot"></span>
          {getEngineStatus()}
        </div>
      </div>

      {/* Main Monitoring Area */}
      <div className="monitoring-workspace">
        {/* Media Preview */}
        <div className="media-preview-panel">
          <div className="panel-header">
            <div>
              <span className="page-label">MEDIA PREVIEW</span>
              <h3>Traffic Camera Feed</h3>
            </div>

            {selectedFile && (
              <span className="media-type">
                {isVideo ? "VIDEO" : "IMAGE"}
              </span>
            )}
          </div>

          <div className="monitoring-preview">
            {selectedFile && previewUrl ? (
              isVideo ? (
                <video
                  src={previewUrl}
                  controls
                  className="monitoring-video"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Traffic preview"
                  className="monitoring-image"
                />
              )
            ) : (
              <div className="media-placeholder">
                <div className="placeholder-icon">◉</div>
                <h3>No media selected</h3>
                <p>
                  Upload an image or video to start traffic monitoring.
                </p>

                <button
                  type="button"
                  className="upload-media-btn"
                  onClick={() => setActivePage("upload")}
                >
                  Upload Media →
                </button>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="monitoring-file">
              <div>
                <strong>{selectedFile.name}</strong>
                <span>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActivePage("upload")}
              >
                Change Media
              </button>
            </div>
          )}
        </div>

        {/* Analysis Information */}
        <div className="analysis-info-panel">
          <div className="panel-header">
            <div>
              <span className="page-label">ANALYSIS</span>
              <h3>Analysis Information</h3>
            </div>

            <span
              className={`engine-status ${
                analysisStatus === "completed"
                  ? "success"
                  : analysisStatus === "processing"
                  ? "processing"
                  : ""
              }`}
            >
              {getEngineStatus()}
            </span>
          </div>

          <div className="monitoring-metrics">
            <div className="monitoring-metric">
              <span>Vehicles</span>
              <strong>
                {analysisResult ? analysisResult.vehicles : "--"}
              </strong>
            </div>

            <div className="monitoring-metric">
              <span>Violations</span>
              <strong>
                {analysisResult ? analysisResult.violations : "--"}
              </strong>
            </div>

            <div className="monitoring-metric">
              <span>Confidence</span>
              <strong>
                {analysisResult
                  ? `${analysisResult.confidence}%`
                  : "--"}
              </strong>
            </div>
          </div>

          {/* Detection Models */}
          <div className="active-models">
            <h4>Active Detection Models</h4>

            <div className="model-list">
              <div className="model">
                <div>
                  <strong>Helmet Detection</strong>
                  <span>Detects riders without helmets</span>
                </div>
                <span className="model-status">Active</span>
              </div>

              <div className="model">
                <div>
                  <strong>Triple Riding</strong>
                  <span>Detects multiple riders on two-wheelers</span>
                </div>
                <span className="model-status">Active</span>
              </div>

              <div className="model">
                <div>
                  <strong>Overspeed Detection</strong>
                  <span>Identifies vehicles exceeding speed limits</span>
                </div>
                <span className="model-status">Active</span>
              </div>
            </div>
          </div>

          {/* Results */}
          {analysisStatus === "completed" && analysisResult && (
            <div className="monitoring-results">
              <div className="result-heading">
                <strong>Detected Violations</strong>
                <span>AI Result</span>
              </div>

              <div className="monitoring-violation">
                <span>No Helmet</span>
                <strong>{analysisResult.helmet}</strong>
              </div>

              <div className="monitoring-violation">
                <span>Overspeed</span>
                <strong>{analysisResult.overspeed}</strong>
              </div>

              <div className="monitoring-violation">
                <span>Triple Riding</span>
                <strong>{analysisResult.tripleRiding}</strong>
              </div>
            </div>
          )}

          {/* Processing */}
          {analysisStatus === "processing" && (
            <div className="monitoring-processing">
              <span className="analysis-spinner"></span>

              <div>
                <strong>AI Processing</strong>
                <p>
                  Detecting vehicles and traffic violations...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline */}
      <div className="analysis-pipeline">
        <div className="pipeline-header">
          <div>
            <span className="page-label">AI PIPELINE</span>
            <h3>Detection Pipeline</h3>
          </div>
        </div>

        <div className="pipeline-steps">
          <div className="pipeline-step">
            <span>01</span>
            <div>
              <strong>Upload Media</strong>
              <p>Image or video input</p>
            </div>
          </div>

          <div className="pipeline-line"></div>

          <div className="pipeline-step">
            <span>02</span>
            <div>
              <strong>AI Processing</strong>
              <p>Analyze traffic media</p>
            </div>
          </div>

          <div className="pipeline-line"></div>

          <div className="pipeline-step">
            <span>03</span>
            <div>
              <strong>Violation Detection</strong>
              <p>Identify violations</p>
            </div>
          </div>

          <div className="pipeline-line"></div>

          <div className="pipeline-step">
            <span>04</span>
            <div>
              <strong>Generate Results</strong>
              <p>Prepare analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="monitoring-actions">
        <button
          type="button"
          className="secondary-action"
          onClick={() => setActivePage("upload")}
        >
          Analyze New Media
        </button>

        {analysisStatus === "completed" && (
          <button
            type="button"
            className="primary-action"
            onClick={() => setActivePage("history")}
          >
            View Detection History →
          </button>
        )}
      </div>
    </div>
  );
}

export default TrafficMonitoring;