import { useRef, useState } from "react";

const API_URL = "http://127.0.0.1:5000";

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
  notifications,
  setNotifications,
}) {
  const fileInputRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  const MAX_FILE_SIZE = 100 * 1024 * 1024;

  // Current backend supports images only.
  const allowedTypes = ["image/jpeg", "image/png"];

  // ==========================================
  // HANDLE IMAGE SELECTION
  // ==========================================

  const handleChange = (event) => {
    const selected = event.target.files?.[0];

    if (!selected) return;

    setError("");

    if (!allowedTypes.includes(selected.type)) {
      setError("Only JPG and PNG images are supported.");
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

  // ==========================================
  // OPEN FILE PICKER
  // ==========================================

  const openFilePicker = () => {
    if (analysisStatus === "processing") return;

    fileInputRef.current?.click();
  };

  // ==========================================
  // REMOVE SELECTED FILE
  // ==========================================

  const removeFile = () => {
    if (analysisStatus === "processing") return;

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

  // ==========================================
  // REAL AI ANALYSIS
  // ==========================================

  const startAnalysis = async () => {
    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Only JPG and PNG images are supported.");
      return;
    }

    if (analysisStatus === "processing") return;

    setError("");
    setAnalysisStatus("processing");
    setAnalysisResult(null);

    try {
      // Prepare the selected image for Flask.
      const formData = new FormData();

      formData.append("file", selectedFile);

      // Send image to backend.
      const response = await fetch(
        `${API_URL}/api/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Image analysis failed."
        );
      }

      // ======================================
      // PROCESS ACTUAL YOLO RESULTS
      // ======================================

      const detections = Array.isArray(data.detections)
        ? data.detections
        : [];

      const helmetViolations = detections.filter(
        (item) =>
          item.violation_type === "Without Helmet" &&
          item.violation_confirmed !== false
      ).length;

      // Average confidence of helmet-model detections.
      const averageConfidence =
        detections.length > 0
          ? detections.reduce(
              (sum, item) =>
                sum + Number(item.confidence || 0),
              0
            ) / detections.length
          : null;

      const result = {
        // Motorcycle count from the general YOLO model.
        vehicles: data.motorcycles_detected ?? null,

        // Count only confirmed violations; possible triple riding needs review.
        violations:
          data.confirmed_violations ?? data.total_violations ?? 0,

        confidence:
          averageConfidence === null
            ? null
            : Number(averageConfidence.toFixed(2)),

        helmet:
          data.helmet_violations ?? helmetViolations,

        // Overspeed detection is not implemented yet.
        overspeed: null,

        processingTimeSeconds: Number.isFinite(
          data.processing_time_seconds
        )
          ? data.processing_time_seconds
          : null,

        tripleRiding: data.triple_riding ?? 0,

        personsDetected: data.persons_detected ?? 0,

        detections,

        totalDetections:
          data.total_detections ?? detections.length,

        // Flask serves the marked image from this URL.
        annotatedImageUrl: data.annotated_image_url
          ? `${API_URL}${data.annotated_image_url}`
          : null,

        bikeResults: Array.isArray(data.bike_results)
          ? data.bike_results
          : [],

        plateResults: Array.isArray(data.plate_results)
          ? data.plate_results
          : [],
      };

      // ======================================
      // UPDATE FRONTEND
      // ======================================

      setAnalysisResult(result);
      setAnalysisStatus("completed");

      // ======================================
      // SAVE ANALYSIS HISTORY
      // ======================================

      const violationLabel =
        result.helmet > 0 && result.tripleRiding > 0
              ? "No Helmet + Possible Triple Riding"
          : result.helmet > 0
            ? "No Helmet"
            : result.tripleRiding > 0
              ? "Possible Triple Riding"
          : "No Confirmed Violation";

      const newHistoryRecord = {
        id: `D-${Date.now()}`,

        fileName: selectedFile.name,

        type: "Image",

        violations: violationLabel,

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

      // ======================================
      // UPDATE NOTIFICATIONS
      // ======================================

      const newNotifications = [
        {
          id: Date.now(),

          title: "Analysis Completed",

          message: `${selectedFile.name} analyzed successfully.`,

          time: "Just now",

          type: "success",

          read: false,
        },
      ];

      if (result.violations > 0) {
        newNotifications.push({
          id: Date.now() + 1,

          title: "Traffic Violations Detected",

          message:
            `${result.violations} total violation(s) detected in ` +
            `${selectedFile.name}: ` +
            `${result.helmet} no-helmet detection(s) and ` +
            `${result.tripleRiding} triple-riding detection(s).`,

          time: "Just now",

          type: "warning",

          read: false,
        });
      }

      setNotifications((prev) => [
        ...newNotifications,
        ...prev,
      ]);

    } catch (err) {
      console.error("AI Analysis Error:", err);

      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to Flask. Make sure the backend is running on port 5000."
          : err.message || "Something went wrong during analysis."
      );

      setAnalysisResult(null);
      setAnalysisStatus("idle");
    }
  };

  // ==========================================
  // FORMAT FILE SIZE
  // ==========================================

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // ==========================================
  // FRONTEND
  // ==========================================

  return (
    <div className="page-content upload-page">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <span className="page-label">
            MEDIA ANALYSIS
          </span>

          <h1>Upload Media</h1>

          <p>
            Upload traffic images for AI-powered helmet
            and triple-riding violation detection.
          </p>
        </div>
      </div>

      <div className="upload-grid">

        {/* UPLOAD CARD */}
        <div className="upload-card">

          {/* FILE PICKER */}
          <div
            className="drop-zone"
            onClick={openFilePicker}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleChange}
              disabled={analysisStatus === "processing"}
              style={{ display: "none" }}
            />

            {!selectedFile ? (
              <>
                <div className="upload-icon">
                  ↑
                </div>

                <h3>Upload Traffic Image</h3>

                <p>
                  Click to browse from your computer
                </p>

                <div className="upload-formats">
                  <span>JPG</span>
                  <span>PNG</span>
                </div>

                <small>
                  Maximum file size: 100 MB
                </small>
              </>
            ) : (
              <>
                <div className="upload-icon">
                  ✓
                </div>

                <h3>File Selected</h3>

                <p>{selectedFile.name}</p>
              </>
            )}
          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="upload-error">
              {error}
            </div>
          )}

          {/* ORIGINAL IMAGE PREVIEW */}
          {selectedFile && preview && (
            <div className="media-preview-container">

              <h3>Original Image</h3>

              <img
                src={preview}
                alt="Selected traffic media"
                className="preview-image"
              />

            </div>
          )}

          {/* FILE INFORMATION */}
          {selectedFile && (
            <div className="selected-file">

              <div className="file-info">

                <div className="file-type-icon">
                  IMG
                </div>

                <div>
                  <strong>
                    {selectedFile.name}
                  </strong>

                  <span>
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>

              </div>

              <button
                type="button"
                className="remove-file"
                onClick={removeFile}
                disabled={analysisStatus === "processing"}
              >
                Remove
              </button>

            </div>
          )}

          {/* START ANALYSIS */}
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

          {/* PROCESSING */}
          {analysisStatus === "processing" && (
            <div className="analysis-status">

              <span className="analysis-spinner"></span>

              <div>
                <strong>
                  AI is analyzing your image...
                </strong>

                <p>
                  Running helmet and motorcycle
                  detection models.
                </p>
              </div>

            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {analysisStatus === "completed" && (
            <div className="analysis-success">

              <strong>
                ✓ Analysis Completed
              </strong>

              <p>
                AI analysis finished successfully.
                Detection results are ready.
              </p>

            </div>
          )}

          {/* ==================================
              ANALYSIS RESULTS
          ================================== */}

          {analysisStatus === "completed" &&
            analysisResult && (

            <div className="analysis-results">

              {/* RESULTS HEADER */}
              <div className="results-header">

                <div>
                  <span className="page-label">
                    AI RESULTS
                  </span>

                  <h3>
                    Detection Results
                  </h3>
                </div>

                <span className="result-complete">
                  ● Completed
                </span>

              </div>

              {analysisResult.processingTimeSeconds != null && (
                <small>
                  Analysis completed in {analysisResult.processingTimeSeconds}s
                </small>
              )}

              {/* RESULT STATISTICS */}
              <div className="result-stats">

                <div className="result-stat">
                  <span>Motorcycles</span>

                  <strong>
                    {analysisResult.vehicles ?? "N/A"}
                  </strong>
                </div>

                <div className="result-stat">
                  <span>Confirmed Violations</span>

                  <strong>
                    {analysisResult.violations}
                  </strong>
                </div>

                <div className="result-stat">
                  <span>Avg. Helmet Confidence</span>

                  <strong>
                    {analysisResult.confidence == null
                      ? "N/A"
                      : `${analysisResult.confidence}%`}
                  </strong>
                </div>

              </div>

              {/* VIOLATION COUNTS */}
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
                    {analysisResult.overspeed ?? "N/A"}
                  </strong>
                </div>

                <div className="violation-result">
                  <span>Potential Triple Riding · Review</span>

                  <strong>
                    {analysisResult.tripleRiding}
                  </strong>
                </div>

              </div>

              {/* ==================================
                  ANNOTATED AI IMAGE
              ================================== */}

              {analysisResult.annotatedImageUrl && (
                <div className="media-preview-container">

                  <h3>AI Detection Image</h3>

                  <p>
                    Red: Confirmed violation | Orange: Unmatched alert |
                    Green: Helmet / Motorcycle | Blue: Detected Person
                  </p>

                  <img
                    src={analysisResult.annotatedImageUrl}
                    alt="Traffic image with AI detection boxes"
                    className="preview-image"
                  />

                </div>
              )}

              {/* ==================================
                  MOTORCYCLE ANALYSIS
              ================================== */}

              <div className="violation-results">

                <h3>Motorcycle Analysis</h3>

                <p>
                  Motorcycles detected:{" "}
                  {analysisResult.vehicles ?? "N/A"}
                </p>

                <p>
                  Persons detected:{" "}
                  {analysisResult.personsDetected}
                </p>

                {analysisResult.bikeResults.length === 0 ? (
                  <p>
                    No motorcycles detected in this image.
                  </p>
                ) : (
                  analysisResult.bikeResults.map((bike) => (

                    <div
                      className="violation-result"
                      key={bike.bike_index}
                    >

                      <span>
                        Bike {bike.bike_index}:{" "}
                        {bike.person_count} associated
                        person(s)
                      </span>

                      <strong>
                        {bike.status}
                      </strong>

                    </div>
                  ))
                )}

                <small>
                  Rider counts are estimates based on
                  detected person positions.
                </small>

              </div>

              {/* ==================================
                  NUMBER-PLATE READS
              ================================== */}

              <div className="violation-results">

                <h3>Number Plate Reads</h3>

                {analysisResult.plateResults.length === 0 ? (
                  <p>No number plates detected.</p>
                ) : (
                  analysisResult.plateResults.map((plate, index) => (

                    <div
                      className="violation-result"
                      key={`${plate.box?.join("-") || "plate"}-${index}`}
                    >

                      <span>
                        {plate.plate_number ||
                          (plate.status === "OCR_SKIPPED_UNMATCHED"
                            ? "Plate detected; OCR skipped"
                            : "Unreadable plate")}
                      </span>

                      <strong>
                        {plate.motorcycle_index
                          ? `Bike ${plate.motorcycle_index} · `
                          : "Unmatched · "}
                        {plate.status.replaceAll("_", " ")}
                        {Number.isFinite(plate.ocr_confidence)
                          ? ` · ${(plate.ocr_confidence * 100).toFixed(1)}% OCR confidence`
                          : ""}
                      </strong>

                    </div>
                  ))
                )}

                <small>
                  OCR text is an estimate. Unmatched plates may skip OCR;
                  review any plate text before using it to identify a vehicle.
                </small>

              </div>

              {/* ==================================
                  HELMET DETECTION DETAILS
              ================================== */}

              <div className="violation-results">

                <h3>YOLO Helmet Detection Details</h3>

                {analysisResult.detections.length === 0 ? (
                  <p>
                    No helmet detections found above
                    the confidence threshold.
                  </p>
                ) : (
                  analysisResult.detections.map(
                    (detection, index) => (

                      <div
                        className="violation-result"
                        key={index}
                      >

                        <span>
                          {detection.violation_type === "Without Helmet" &&
                          detection.violation_confirmed === false
                            ? "Possible Without Helmet · Motorcycle not matched"
                            : detection.violation_type}
                          {detection.violation_confirmed === false
                            ? ""
                            : detection.number_plate
                            ? ` · Bike ${detection.motorcycle_index} · Plate ${detection.number_plate}`
                            : detection.violation_type === "Without Helmet"
                              ? " · Plate not confidently matched"
                              : ""}
                        </span>

                        <strong>
                          {detection.confidence}%
                        </strong>

                      </div>
                    )
                  )
                )}

              </div>

              {/* VIEW MONITORING */}
              <button
                type="button"
                className="primary-action"
                onClick={() =>
                  setActivePage("monitoring")
                }
                style={{ marginTop: "16px" }}
              >
                View Monitoring →
              </button>

            </div>
          )}

        </div>

        {/* ==================================
            AI DETECTION PANEL
        ================================== */}

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

          {/* HELMET DETECTION */}
          <div className="detection-model">

            <div>
              <strong>
                Helmet Violation
              </strong>

              <span>
                Real YOLO helmet detection connected
              </span>
            </div>

            <span className="model-status">
              ✓
            </span>

          </div>

          {/* TRIPLE RIDING */}
          <div className="detection-model">

            <div>
              <strong>
                Triple Riding
              </strong>

              <span>
                YOLO motorcycle/person association
                connected
              </span>
            </div>

            <span className="model-status">
              ✓
            </span>

          </div>

          {/* OVERSPEED */}
          <div className="detection-model">

            <div>
              <strong>
                Overspeed
              </strong>

              <span>
                Backend integration pending
              </span>
            </div>

            <span className="model-status">
              —
            </span>

          </div>

          {/* INFORMATION */}
          <div className="ai-info">

            <strong>
              AI-powered traffic analysis
            </strong>

            <p>
              Images are processed using the trained
              helmet model and YOLO motorcycle/person
              detection. Helmet violations and suspected
              triple-riding cases are recorded in SQLite.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default UploadMedia;
