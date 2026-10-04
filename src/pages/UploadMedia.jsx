import { useRef, useState } from "react";

function UploadMedia() {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
  };

  const handleFileChange = (event) => {
    handleFile(event.target.files[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    handleFile(event.dataTransfer.files[0]);
  };

  const removeFile = () => {
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="page-content upload-page">

      {/* Header */}
      <div className="page-header upload-header">
        <div>
          <span className="page-label">AI ANALYSIS</span>
          <h1>Upload Media</h1>
          <p>
            Upload traffic footage and let the AI engine detect violations.
          </p>
        </div>
      </div>

      {/* Main Upload Area */}
      <div className="upload-main-grid">

        {/* Upload Card */}
        <div className="upload-card">

          <div
            className={`drop-zone ${isDragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <div className="upload-cloud">
              ↑
            </div>

            <h2>
              {isDragging
                ? "Drop your file here"
                : "Upload traffic media"}
            </h2>

            <p>
              Drag and drop your image or video here
              <br />
              or <span>browse from your computer</span>
            </p>

            <div className="format-info">
              <span>JPG</span>
              <span>PNG</span>
              <span>MP4</span>
              <span>AVI</span>
            </div>

            <small>Maximum file size: 100 MB</small>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={handleFileChange}
            />
          </div>

          {/* Selected File */}
          {file && (
            <div className="selected-file-card">

              <div className="file-preview">
                {file.type.startsWith("image/") ? "IMG" : "VID"}
              </div>

              <div className="file-details">
                <strong>{file.name}</strong>

                <span>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>

              <button
                className="remove-file"
                onClick={removeFile}
              >
                ×
              </button>

            </div>
          )}

          {file && (
            <button className="start-analysis-btn">
              <span>✦</span>
              Start AI Analysis
            </button>
          )}
        </div>

        {/* Detection Panel */}
        <div className="detection-panel">

          <div className="panel-heading">
            <div>
              <span className="page-label">DETECTION ENGINE</span>
              <h3>What should we detect?</h3>
            </div>

            <div className="ai-status">
              <span></span>
              Ready
            </div>
          </div>

          <div className="detection-card active">
            <div className="detection-symbol">H</div>

            <div>
              <strong>Helmet Violation</strong>
              <p>Detect riders without helmets</p>
            </div>

            <div className="check-mark">✓</div>
          </div>

          <div className="detection-card active">
            <div className="detection-symbol">3</div>

            <div>
              <strong>Triple Riding</strong>
              <p>Detect more than two riders</p>
            </div>

            <div className="check-mark">✓</div>
          </div>

          <div className="detection-card active">
            <div className="detection-symbol">S</div>

            <div>
              <strong>Overspeed</strong>
              <p>Identify vehicles exceeding limits</p>
            </div>

            <div className="check-mark">✓</div>
          </div>

          <div className="engine-note">
            <span>✦</span>

            <p>
              AI detection will automatically analyze the
              uploaded media and generate violation results.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default UploadMedia;