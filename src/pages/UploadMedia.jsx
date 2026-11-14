import { useRef, useState } from "react";
import { API_URL } from "../api";

function UploadMedia({
  setActivePage,
  selectedFile,
  setSelectedFile,
  previewUrl,
  setPreviewUrl,
  analysisResult,
  setAnalysisResult,
  analysisStatus,
  setAnalysisStatus,
  setAnalysisHistory,
  setNotifications,
}) {
  const fileInputRef = useRef(null);

  const [error, setError] = useState("");

  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  // Current backend supports images only.
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  // ==========================================
  // HANDLE IMAGE SELECTION
  // ==========================================

  const handleChange = (event) => {
    const selected = event.target.files?.[0];

    if (!selected) return;

    setError("");

    if (!allowedTypes.includes(selected.type)) {
      setError("Only JPG, PNG, and WebP images are supported.");
      event.target.value = "";
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError("File size must be 20 MB or smaller.");
      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(selected);

    setSelectedFile(selected);
    setPreviewUrl(objectUrl);

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

    setSelectedFile(null);
    setPreviewUrl(null);

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
      setError("Only JPG, PNG, and WebP images are supported.");
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

        duplicateImage: Boolean(data.duplicate_image),
        recordsSaved: Number(data.records_saved || 0),
      };

      // ======================================
      // UPDATE FRONTEND
      // ======================================

      setAnalysisResult(result);
      setAnalysisStatus("completed");

      // ======================================
      // SAVE ANALYSIS HISTORY
      // ======================================

      const newHistoryRecord = data.analysis_record;
      if (newHistoryRecord) {
        setAnalysisHistory((previous) => [
          newHistoryRecord,
          ...previous.filter((record) => record.id !== newHistoryRecord.id),
        ]);
      }

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

      if (result.violations > 0 || result.tripleRiding > 0) {
        newNotifications.push({
          id: Date.now() + 1,

          title: result.violations > 0 ? "Confirmed Violation / Review Alert" : "Review Alert",

          message:
            `${selectedFile.name}: ${result.helmet} confirmed no-helmet violation(s); ` +
            `${result.tripleRiding} possible triple-riding case(s) require review.`,

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
      <div className="page-header upload-page-header">
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

        <div
          className={`drop-zone upload-header-picker${selectedFile ? " has-file" : ""}`}
          onClick={openFilePicker}
          role="button"
          tabIndex={analysisStatus === "processing" ? -1 : 0}
          aria-label={selectedFile ? "Choose another image" : "Select an image"}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && analysisStatus !== "processing") {
              event.preventDefault();
              openFilePicker();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleChange}
            disabled={analysisStatus === "processing"}
            style={{ display: "none" }}
          />

          {!selectedFile ? (
            <>
              <div className="upload-icon">↑</div>
              <h3>Select Image</h3>
              <p>JPG · PNG · WEBP</p>
            </>
          ) : (
            <div className="selected-file-summary">
              <div className="upload-icon">✓</div>
              <div className="selected-file-summary__text">
                <h3>File Selected</h3>
                <p>{selectedFile.name}</p>
                <span>Choose another</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="upload-grid">

        {/* UPLOAD CARD */}
        <div className="upload-card">

          <div className="upload-selection-layout">
            {/* ERROR MESSAGE */}
            {error && <div className="upload-error">{error}</div>}

            {/* ORIGINAL IMAGE PREVIEW */}
            {selectedFile && previewUrl ? (
              <div className="media-preview-container selected-image-preview">
                <h3>Original Image</h3>
                <div className="selected-image-preview__stage">
                  <img
                    src={previewUrl}
                    alt="Selected traffic media"
                    className="preview-image selected-image-preview__image"
                  />
                </div>
              </div>
            ) : (
              <div className="media-preview-container selected-image-preview selected-image-preview--empty">
                <div className="upload-empty-state">
                  <span className="upload-empty-state__icon" aria-hidden="true">▧</span>
                  <div>
                    <h3>Your image preview will appear here</h3>
                    <p>Choose a traffic image to see it at full size before analysis.</p>
                  </div>
                  <button type="button" className="upload-empty-state__button" onClick={openFilePicker}>
                    Choose image
                  </button>
                </div>
              </div>
            )}
          </div>

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

              {analysisResult.duplicateImage && (
                <p className="duplicate-analysis-note" role="status">
                  This exact image was analyzed before. Results are shown again,
                  but duplicate violation rows were not added to the database.
                </p>
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
              <div className="violation-results violation-counts">

                <div className={`violation-result ${Number(analysisResult.helmet) > 0 ? "violation-result--alert" : "violation-result--clear"}`}>
                  <span>No Helmet</span>

                  <strong>
                    {analysisResult.helmet}
                  </strong>
                </div>

                <div className={`violation-result ${Number(analysisResult.tripleRiding) > 0 ? "violation-result--alert" : "violation-result--clear"}`}>
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

              <div className="analysis-detail-grid">
                {/* MOTORCYCLE ANALYSIS */}
                <section className="analysis-detail-section">
                  <div className="analysis-detail-heading">
                    <h3>Motorcycle Analysis</h3>
                    <div className="analysis-detail-summary">
                      <span><strong>{analysisResult.vehicles ?? "N/A"}</strong> motorcycles</span>
                      <span><strong>{analysisResult.personsDetected ?? 0}</strong> people detected</span>
                    </div>
                  </div>

                  {analysisResult.bikeResults.length === 0 ? (
                    <p className="analysis-empty-state">No motorcycles detected in this image.</p>
                  ) : (
                    <div className="analysis-item-grid">
                      {analysisResult.bikeResults.map((bike) => (
                        (() => {
                          const isTripleRiding = Number(bike.person_count) >= 3;
                          const hasNoHelmet = Boolean(bike.has_no_helmet) ||
                            analysisResult.detections.some((detection) =>
                              detection.violation_type === "Without Helmet" &&
                              Number(detection.bike_index) === Number(bike.bike_index)
                            );
                          const labels = [
                            hasNoHelmet && "No Helmet",
                            isTripleRiding && "Triple Riding",
                          ].filter(Boolean);
                          const isViolation = labels.length > 0;

                          return (
                            <div
                              className={`violation-result ${isViolation ? "violation-result--alert" : "violation-result--clear"}`}
                              key={bike.bike_index}
                            >
                              <span className="analysis-item-label">Bike {bike.bike_index}</span>
                              <strong className="analysis-item-value">
                                <span>{bike.person_count} associated</span>
                                <span>{isViolation ? `${labels.join(" + ")} Detected` : "No Violation Detected"}</span>
                              </strong>
                            </div>
                          );
                        })()
                      ))}
                    </div>
                  )}

                  <small className="analysis-detail-note">
                    Rider counts are geometric estimates from detected person and motorcycle boxes. Occlusion can cause missed riders or bystanders to be associated.
                  </small>
                </section>

                {/* NUMBER-PLATE READS */}
                <section className="analysis-detail-section">
                  <div className="analysis-detail-heading">
                    <h3>Number Plate Reads</h3>
                    <span className="analysis-detail-count">{analysisResult.plateResults.length} detected</span>
                  </div>

                  {analysisResult.plateResults.length === 0 ? (
                    <p className="analysis-empty-state">No number plates detected.</p>
                  ) : (
                    <div className="analysis-item-grid">
                      {analysisResult.plateResults.map((plate, index) => (
                        <div className="violation-result" key={`${plate.box?.join("-") || "plate"}-${index}`}>
                          <span className="analysis-item-label">
                            {plate.plate_number || (plate.status === "OCR_SKIPPED_UNMATCHED" ? "Plate detected; OCR skipped" : "Unreadable plate")}
                          </span>
                          <strong className="analysis-item-value analysis-item-value--detail">
                            {plate.motorcycle_index ? `Bike ${plate.motorcycle_index} · ` : "Unmatched · "}
                            {plate.status.replaceAll("_", " ")}
                            {Number.isFinite(plate.ocr_confidence) ? ` · ${(plate.ocr_confidence * 100).toFixed(1)}% OCR confidence` : ""}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}

                  <small className="analysis-detail-note">
                    OCR text is an estimate. Unmatched plates may skip OCR; review any plate text before using it to identify a vehicle.
                  </small>
                </section>

                {/* HELMET DETECTION DETAILS */}
                <section className="analysis-detail-section analysis-detail-section--wide">
                  <div className="analysis-detail-heading">
                    <h3>YOLO Helmet Detection Details</h3>
                    <span className="analysis-detail-count">{analysisResult.detections.length} detections</span>
                  </div>

                  {analysisResult.detections.length === 0 ? (
                    <p className="analysis-empty-state">No helmet detections found above the confidence threshold.</p>
                  ) : (
                    <div className="analysis-item-grid analysis-item-grid--helmet">
                      {analysisResult.detections.map((detection, index) => (
                        <div
                          className={`violation-result ${detection.violation_type === "Without Helmet" ? "violation-result--alert" : "violation-result--clear"}`}
                          key={index}
                        >
                          <span className="analysis-item-label">
                            {detection.violation_type === "Without Helmet" && detection.violation_confirmed === false
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
                          <strong className="analysis-item-value">{detection.confidence}%</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
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
                Triple Riding Estimate
              </strong>

              <span>
                Geometric person-to-bike association; possible cases
                require review.
              </span>
            </div>

            <span className="model-status">
              Estimate
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
