import { useRef, useState } from "react";

function UploadMedia({
  setActivePage,
  selectedFile,
  setSelectedFile,
  analysisResult,
  setAnalysisResult,
  analysisStatus,
  setAnalysisStatus,
  analysisHistory,
  setAnalysisHistory,
}) {
  const fileInputRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  const MAX_FILE_SIZE = 100 * 1024 * 1024;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "video/mp4",
    "video/x-msvideo",
  ];

  const handleChange = (event) => {
    const selected = event.target.files?.[0];

    if (!selected) return;

    setError("");

    if (!allowedTypes.includes(selected.type)) {
      setError("Only JPG, PNG, MP4 and AVI files are allowed.");
      event.target.value = "";
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError("File size must be less than 100 MB.");
      event.target.value = "";
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const objectUrl = URL.createObjectURL(selected);

    setSelectedFile(selected);
    setPreview(objectUrl);
    setAnalysisResult(null);
    setAnalysisStatus("idle");
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(null);
    setPreview(null);
    setAnalysisResult(null);
    setAnalysisStatus("idle");
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startAnalysis = () => {
    if (!selectedFile) {
      setError("Please select a media file first.");
      return;
    }

    setError("");
    setAnalysisStatus("processing");
    setAnalysisResult(null);

    setTimeout(() => {
      const result = {
        vehicles: 42,
        violations: 8,
        confidence: 95.8,
        helmet: 4,
        overspeed: 2,
        tripleRiding: 2,
      };

      setAnalysisResult(result);
      setAnalysisStatus("completed");

      const newHistoryRecord = {
        id: `D-${2050 + analysisHistory.length}`,
        fileName: selectedFile.name,
        type: selectedFile.type.startsWith("video/")
          ? "Video"
          : "Image",
        violations:
          result.helmet > 0 && result.overspeed > 0
            ? "Helmet + Overspeed"
            : result.helmet > 0
              ? "No Helmet"
              : result.overspeed > 0
                ? "Overspeed"
                : result.tripleRiding > 0
                  ? "Triple Riding"
                  : "No Violations",
        vehicles: result.vehicles,
        violationCount: result.violations,
        confidence: result.confidence,
        date: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Completed",
      };

      setAnalysisHistory((prev) => [
        newHistoryRecord,
        ...prev,
      ]);
    }, 3000);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="page-content upload-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <span className="page-label">MEDIA ANALYSIS</span>

          <h1>Upload Media</h1>

          <p>
            Upload traffic footage or images for AI-powered violation
            detection.
          </p>
        </div>
      </div>

      <div className="upload-grid">
        {/* Upload Card */}
        <div className="upload-card">
          <div
            className="drop-zone"
            onClick={openFilePicker}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.mp4,.avi"
              onChange={handleChange}
              style={{ display: "none" }}
            />

            {!selectedFile ? (
              <>
                <div className="upload-icon">↑</div>

                <h3>Drop your media here</h3>

                <p>or click to browse from your computer</p>

                <div className="upload-formats">
                  <span>JPG</span>
                  <span>PNG</span>
                  <span>MP4</span>
                  <span>AVI</span>
                </div>

                <small>Maximum file size: 100 MB</small>
              </>
            ) : (
              <>
                <div className="upload-icon">✓</div>

                <h3>File Selected</h3>

                <p>{selectedFile.name}</p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="upload-error">
              {error}
            </div>
          )}

          {/* Preview */}
          {selectedFile && preview && (
            <div className="media-preview-container">
              <h3>Preview</h3>

              {selectedFile.type.startsWith("image/") && (
                <img
                  src={preview}
                  alt="Selected traffic media"
                  className="preview-image"
                />
              )}

              {selectedFile.type.startsWith("video/") && (
                <video
                  src={preview}
                  controls
                  className="preview-video"
                />
              )}
            </div>
          )}

          {/* File Information */}
          {selectedFile && (
            <div className="selected-file">
              <div className="file-info">
                <div className="file-type-icon">
                  {selectedFile.type.startsWith("video/")
                    ? "VID"
                    : "IMG"}
                </div>

                <div>
                  <strong>{selectedFile.name}</strong>

                  <span>
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="remove-file"
                onClick={removeFile}
              >
                Remove
              </button>
            </div>
          )}

          {/* Start Analysis */}
          {selectedFile && (
            <button
              type="button"
              className="start-analysis-btn"
              onClick={startAnalysis}
              disabled={analysisStatus === "processing"}
            >
              {analysisStatus === "processing"
                ? "AI Analysis in Progress..."
                : "Start AI Analysis →"}
            </button>
          )}

          {/* Processing */}
          {analysisStatus === "processing" && (
            <div className="analysis-status">
              <span className="analysis-spinner"></span>

              <div>
                <strong>
                  AI is analyzing your media...
                </strong>

                <p>
                  Detecting vehicles and traffic violations.
                </p>
              </div>
            </div>
          )}

          {/* Success */}
          {analysisStatus === "completed" && (
            <div className="analysis-success">
              <strong>✓ Analysis Completed</strong>

              <p>
                AI analysis finished successfully. Detection
                results are ready.
              </p>
            </div>
          )}

          {/* Results */}
          {analysisStatus === "completed" && analysisResult && (
            <div className="analysis-results">
              <div className="results-header">
                <div>
                  <span className="page-label">
                    AI RESULTS
                  </span>

                  <h3>Detection Results</h3>
                </div>

                <span className="result-complete">
                  ● Completed
                </span>
              </div>

              <div className="result-stats">
                <div className="result-stat">
                  <span>Vehicles</span>
                  <strong>
                    {analysisResult.vehicles}
                  </strong>
                </div>

                <div className="result-stat">
                  <span>Violations</span>
                  <strong>
                    {analysisResult.violations}
                  </strong>
                </div>

                <div className="result-stat">
                  <span>Confidence</span>
                  <strong>
                    {analysisResult.confidence}%
                  </strong>
                </div>
              </div>

              <div className="violation-results">
                <div className="violation-result">
                  <span>No Helmet</span>
                  <strong>
                    {analysisResult.helmet}
                  </strong>
                </div>

                <div className="violation-result">
                  <span>Overspeed</span>
                  <strong>
                    {analysisResult.overspeed}
                  </strong>
                </div>

                <div className="violation-result">
                  <span>Triple Riding</span>
                  <strong>
                    {analysisResult.tripleRiding}
                  </strong>
                </div>
              </div>

              {/* View Monitoring */}
              <button
                type="button"
                className="primary-action"
                onClick={() => setActivePage("monitoring")}
                style={{ marginTop: "16px" }}
              >
                View Monitoring →
              </button>
            </div>
          )}
        </div>

        {/* AI Detection Panel */}
        <div className="detection-panel">
          <div className="panel-header">
            <div>
              <span className="page-label">
                AI ENGINE
              </span>

              <h3>Detection Models</h3>
            </div>

            <span className="ai-ready">
              ● Ready
            </span>
          </div>

          <div className="detection-model">
            <div>
              <strong>Helmet Violation</strong>

              <span>
                Detects riders without helmets
              </span>
            </div>

            <span className="model-status">
              ✓
            </span>
          </div>

          <div className="detection-model">
            <div>
              <strong>Triple Riding</strong>

              <span>
                Detects more than two riders
              </span>
            </div>

            <span className="model-status">
              ✓
            </span>
          </div>

          <div className="detection-model">
            <div>
              <strong>Overspeed</strong>

              <span>
                Identifies vehicles exceeding speed limits
              </span>
            </div>

            <span className="model-status">
              ✓
            </span>
          </div>

          <div className="ai-info">
            <strong>AI-powered analysis</strong>

            <p>
              Your uploaded media will be processed using
              computer vision models to identify traffic
              violations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadMedia;