
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

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const isVideo = selectedFile?.type?.startsWith("video/");

  const plateResults = Array.isArray(analysisResult?.plateResults)
    ? analysisResult.plateResults
    : [];

  const getEngineStatus = () => {
    if (analysisStatus === "processing") return "Processing";
    if (analysisStatus === "completed") return "Analysis Complete";
    return "Ready";
  };

  const formatStatus = (status) => {
    return String(status || "Unknown")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="page-content monitoring-page">

      {/* HEADER */}
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

      {/* MAIN WORKSPACE */}
      <div className="monitoring-workspace">

        {/* MEDIA PREVIEW */}
        <div className="media-preview-panel">
          <div className="panel-header">
            <div>
              <span className="page-label">MEDIA PREVIEW</span>
              <h3>Analyse Media</h3>
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
                <p>Upload an image to start traffic monitoring.</p>

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

          {/* ANNOTATED AI IMAGE */}
          {analysisStatus === "completed" &&
            analysisResult?.annotatedImageUrl && (
              <div className="monitoring-annotated">
                <span className="page-label">AI DETECTION OUTPUT</span>
                <h3>Processed Traffic Image</h3>

                <img
                  src={analysisResult.annotatedImageUrl}
                  alt="AI detected traffic"
                />
              </div>
            )}
        </div>

        {/* ANALYSIS INFORMATION */}
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

          {/* METRICS */}
          <div className="monitoring-metrics">
            <div className="monitoring-metric">
              <span>Vehicles</span>
              <strong>
                {analysisResult?.vehicles ?? "--"}
              </strong>
            </div>

            <div className="monitoring-metric">
              <span>Violations</span>
              <strong>
                {analysisResult?.violations ?? "--"}
              </strong>
            </div>

            <div className="monitoring-metric">
              <span>Confidence</span>
              <strong>
                {analysisResult?.confidence != null
                  ? `${analysisResult.confidence}%`
                  : "--"}
              </strong>
            </div>
          </div>

          {/* ACTIVE MODELS */}
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
                  <strong>Number Plate Recognition</strong>
                  <span>YOLO plate detection and OCR recognition</span>
                </div>
                <span className="model-status">Active</span>
              </div>
            </div>
          </div>

          {/* VIOLATION RESULTS */}
          {analysisStatus === "completed" && analysisResult && (
            <div className="monitoring-results">
              <div className="result-heading">
                <strong>Detected Violations</strong>
                <span>AI Result</span>
              </div>

              <div className="monitoring-violation">
                <span>No Helmet</span>
                <strong>{analysisResult.helmet ?? 0}</strong>
              </div>

              <div className="monitoring-violation">
                <span>Triple Riding</span>
                <strong>{analysisResult.tripleRiding ?? 0}</strong>
              </div>
            </div>
          )}

          {/* NUMBER PLATE RECOGNITION */}
          {analysisStatus === "completed" && analysisResult && (
            <div className="number-plate-section">

              <div className="number-plate-header">
                <div>
                  <span className="page-label">OCR DETECTION</span>
                  <h3>Number Plate Recognition</h3>
                </div>

                <span className="plate-count">
                  {plateResults.length} Detected
                </span>
              </div>

              {plateResults.length === 0 ? (
                <div className="no-plates">
                  <div className="no-plates-icon">▤</div>
                  <strong>No Number Plates Detected</strong>
                  <p>
                    The AI engine did not detect any readable number plates
                    in this image.
                  </p>
                </div>
              ) : (
                <div className="number-plate-list">

                  {plateResults.map((plate, index) => {
                    const confidence = Number(plate.ocr_confidence);

                    const hasConfidence =
                      plate.ocr_confidence !== null &&
                      plate.ocr_confidence !== undefined &&
                      Number.isFinite(confidence);

                    const isRecognized = Boolean(
                      plate.plate_number &&
                      plate.status !== "unreadable"
                    );

                    return (
                      <div
                        className="number-plate-card"
                        key={`${plate.box?.join("-") || "plate"}-${index}`}
                      >

                        <div className="plate-card-top">
                          <span className="plate-index">
                            PLATE {String(index + 1).padStart(2, "0")}
                          </span>

                          <span
                            className={`plate-status ${
                              isRecognized ? "recognized" : "unreadable"
                            }`}
                          >
                            {isRecognized ? "Recognized" : "Unreadable"}
                          </span>
                        </div>

                        <div className="plate-number-box">
                          <span className="plate-country">IND</span>
                          <strong>
                            {plate.plate_number || "NOT READABLE"}
                          </strong>
                        </div>

                        <div className="plate-details">

                          <div className="plate-detail">
                            <span>Vehicle Association</span>
                            <strong>
                              {plate.motorcycle_index != null
                                ? `Bike ${plate.motorcycle_index}`
                                : "Unmatched"}
                            </strong>
                          </div>

                          <div className="plate-detail">
                            <span>OCR Confidence</span>
                            <strong>
                              {hasConfidence
                                ? `${(confidence * 100).toFixed(1)}%`
                                : "N/A"}
                            </strong>
                          </div>

                          <div className="plate-detail">
                            <span>Detection Status</span>
                            <strong>{formatStatus(plate.status)}</strong>
                          </div>

                        </div>

                        {hasConfidence && (
                          <div className="plate-confidence-track">
                            <div
                              className="plate-confidence-fill"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(100, confidence * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        )}

                      </div>
                    );
                  })}

                </div>
              )}

              <p className="plate-disclaimer">
                OCR results are AI-generated estimates. Verify the plate
                text before using it for official identification.
              </p>

            </div>
          )}

          {/* PROCESSING */}
          {analysisStatus === "processing" && (
            <div className="monitoring-processing">
              <span className="analysis-spinner"></span>

              <div>
                <strong>AI Processing</strong>
                <p>
                  Detecting vehicles, traffic violations and number plates...
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* PIPELINE */}
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
              <p>Image input</p>
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
              <strong>Detection & OCR</strong>
              <p>Identify vehicles and plates</p>
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

      {/* ACTIONS */}
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
