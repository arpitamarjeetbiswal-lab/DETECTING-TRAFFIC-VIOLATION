function TrafficMonitoring({ setActivePage }) {
    return (
        <div className="page-content monitoring-page">

            {/* Header */}
            <div className="page-header">
                <div>
                    <span className="page-label">AI MONITORING</span>
                    <h1>Traffic Monitoring</h1>
                    <p>
                        Analyze traffic media and monitor AI detection activity.
                    </p>
                </div>

                <div className="analysis-status">
                    <span></span>
                    AI Engine Ready
                </div>
            </div>

            {/* Analysis Workspace */}
            <section className="monitor-workspace">

                {/* Media Preview */}
                <div className="media-preview panel">

                    <div className="panel-header">
                        <div>
                            <h3>Media Preview</h3>
                            <p>Selected traffic footage</p>
                        </div>

                        <span className="media-type">
                            VIDEO
                        </span>
                    </div>

                    <div className="media-screen">

                        <div className="media-placeholder">

                            <div className="play-button">
                                ▶
                            </div>

                            <strong>No media selected</strong>

                            <span>
                                Upload an image or video to start AI analysis
                            </span>

                            <button onClick={() => setActivePage("upload")}>
                                Select Media
                            </button>

                        </div>

                    </div>

                    <div className="media-footer">
                        <span>Supported: JPG, PNG, MP4, AVI</span>
                        <span>Max size: 100 MB</span>
                    </div>

                </div>

                {/* Analysis Information */}
                <div className="analysis-panel panel">

                    <div className="panel-header">
                        <div>
                            <h3>Analysis Status</h3>
                            <p>AI detection engine</p>
                        </div>
                    </div>

                    <div className="engine-status">
                        <div className="engine-icon">
                            AI
                        </div>

                        <div>
                            <strong>Detection Engine</strong>
                            <span>Ready for analysis</span>
                        </div>

                        <div className="engine-dot"></div>
                    </div>

                    <div className="analysis-metrics">

                        <div className="analysis-metric">
                            <span>Vehicles</span>
                            <strong>--</strong>
                        </div>

                        <div className="analysis-metric">
                            <span>Violations</span>
                            <strong>--</strong>
                        </div>

                        <div className="analysis-metric">
                            <span>Confidence</span>
                            <strong>--</strong>
                        </div>

                    </div>

                    <div className="detection-heading">
                        <span>Detection Models</span>
                        <small>3 Active</small>
                    </div>

                    <div className="model-row">
                        <div>
                            <span className="model-icon helmet-model">H</span>
                            <span>Helmet Detection</span>
                        </div>

                        <span className="model-active">
                            Active
                        </span>
                    </div>

                    <div className="model-row">
                        <div>
                            <span className="model-icon triple-model">3</span>
                            <span>Triple Riding</span>
                        </div>

                        <span className="model-active">
                            Active
                        </span>
                    </div>

                    <div className="model-row">
                        <div>
                            <span className="model-icon speed-model">S</span>
                            <span>Overspeed</span>
                        </div>

                        <span className="model-active">
                            Active
                        </span>
                    </div>

                </div>

            </section>

            {/* Analysis Information */}
            <section className="monitor-info-grid">

                <div className="panel info-panel">

                    <div className="panel-header">
                        <div>
                            <h3>How AI Analysis Works</h3>
                            <p>Traffic violation detection pipeline</p>
                        </div>
                    </div>

                    <div className="pipeline">

                        <div className="pipeline-step">
                            <div className="pipeline-number">01</div>
                            <div>
                                <strong>Upload Media</strong>
                                <span>Image or traffic video</span>
                            </div>
                        </div>

                        <div className="pipeline-line"></div>

                        <div className="pipeline-step">
                            <div className="pipeline-number">02</div>
                            <div>
                                <strong>AI Processing</strong>
                                <span>Vehicle and rider detection</span>
                            </div>
                        </div>

                        <div className="pipeline-line"></div>

                        <div className="pipeline-step">
                            <div className="pipeline-number">03</div>
                            <div>
                                <strong>Violation Detection</strong>
                                <span>Helmet, triple riding and speed</span>
                            </div>
                        </div>

                        <div className="pipeline-line"></div>

                        <div className="pipeline-step">
                            <div className="pipeline-number">04</div>
                            <div>
                                <strong>Generate Results</strong>
                                <span>Confidence and violation report</span>
                            </div>
                        </div>

                    </div>

                </div>

                <div className="panel summary-panel">

                    <div className="panel-header">
                        <div>
                            <h3>Last Analysis</h3>
                            <p>Previous processing session</p>
                        </div>
                    </div>

                    <div className="last-analysis">

                        <div className="last-analysis-icon">
                            IMG
                        </div>

                        <div>
                            <strong>No previous analysis</strong>
                            <span>
                                Results will appear here after processing.
                            </span>
                        </div>

                    </div>

                    <button
                        className="history-link"
                        onClick={() => setActivePage("history")}
                    >
                        View Detection History →
                    </button>

                </div>

            </section>

        </div>
    );
}

export default TrafficMonitoring;