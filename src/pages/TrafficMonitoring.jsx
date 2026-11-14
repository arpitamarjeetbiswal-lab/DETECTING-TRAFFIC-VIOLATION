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
            Review analyzed traffic images and their AI detection results.
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
              <h3>Uploaded Image Preview</h3>
            </div>

            {selectedFile && (
              <span className="media-type">IMAGE</span>
            )}
          </div>

          <div className="monitoring-preview">
            {selectedFile && previewUrl ? (
              <img
                src={previewUrl}
                alt="Uploaded traffic image preview"
                className="monitoring-image"
              />
            ) : (
              <div className="media-placeholder">
                <div className="placeholder-icon">◉</div>
                <h3>No image selected</h3>
                <p>
                  Upload a still image to start traffic analysis.
                </p>

                <button
                  type="button"
                  className="upload-media-btn"
                  onClick={() => setActivePage("upload")}
                >
                  Upload Image →
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
                Change Image
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
              <span>Motorcycles</span>
              <strong>
                {analysisResult ? analysisResult.vehicles : "--"}
              </strong>
            </div>

            <div className="monitoring-metric">
              <span>Confirmed Violations</span>
              <strong>
                {analysisResult ? analysisResult.violations : "--"}
              </strong>
            </div>

            <div className="monitoring-metric">
              <span>Confidence</span>
              <strong>
                {analysisResult
                  ? analysisResult.confidence == null
                    ? "N/A"
                    : `${analysisResult.confidence}%`
                  : "--"}
              </strong>
            </div>
          </div>

          {/* Detection Models */}
          <div className="active-models">
            <h4>Image Analysis Components</h4>

            <div className="model-list">
              <div className="model">
                <div>
                  <strong>Motorcycle and Person Detection</strong>
                  <span>Finds motorcycles and people in the image</span>
                </div>
                <span className="model-status">Active</span>
              </div>

              <div className="model">
                <div>
                  <strong>Helmet Detection</strong>
                  <span>Detects visible helmet status</span>
                </div>
                <span className="model-status">Active</span>
              </div>

              <div className="model">
                <div>
                  <strong>Number Plate OCR</strong>
                  <span>Reads plates when the image is clear enough</span>
                </div>
                <span className="model-status">Active</span>
              </div>

              <div className="model">
                <div>
                  <strong>Triple Riding Estimate</strong>
                  <span>Geometric person-to-bike estimate; possible cases need review</span>
                </div>
                <span className="model-status">Review alert</span>
              </div>

              <div className="model">
                <div>
                  <strong>Overspeed Detection</strong>
                  <span>Not implemented in this image-only prototype</span>
                </div>
                <span className="model-status">N/A</span>
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
                <strong>{analysisResult.overspeed ?? "N/A"}</strong>
              </div>

              <div className="monitoring-violation">
                <span>Possible Triple Riding · Review</span>
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
                  Detecting motorcycles, people, helmet status, and plates...
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
              <strong>Upload Image</strong>
              <p>Still image input</p>
            </div>
          </div>

          <div className="pipeline-line"></div>

          <div className="pipeline-step">
            <span>02</span>
            <div>
              <strong>AI Processing</strong>
              <p>Analyze the uploaded image</p>
            </div>
          </div>

          <div className="pipeline-line"></div>

          <div className="pipeline-step">
            <span>03</span>
            <div>
              <strong>Detection and OCR</strong>
              <p>Identify violations and read clear plates</p>
            </div>
          </div>

          <div className="pipeline-line"></div>

          <div className="pipeline-step">
            <span>04</span>
            <div>
              <strong>Generate Results</strong>
              <p>Prepare image analysis results</p>
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
          Analyze New Image
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
