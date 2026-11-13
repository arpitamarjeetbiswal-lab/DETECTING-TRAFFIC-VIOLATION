import { useEffect, useMemo, useState } from "react";
import { classifyViolationRecord } from "../utils/violationRecords";

const API_URL = "http://127.0.0.1:5000";

function fileNameFromPath(path) {
    return path?.split(/[\\/]/).pop() || "Image";
}

function Dashboard({ setActivePage, analysisHistory = [] }) {
    const [savedViolations, setSavedViolations] = useState([]);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        fetch(`${API_URL}/api/violations`, { signal: controller.signal })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Could not load saved violation records.");
                }
                return response.json();
            })
            .then((records) => {
                setSavedViolations(Array.isArray(records) ? records : []);
            })
            .catch((error) => {
                if (error.name !== "AbortError") {
                    setLoadError(error.message);
                }
            });

        return () => controller.abort();
    }, []);

    const summary = useMemo(() => {
        const noHelmetRecords = savedViolations.filter(
            (item) => classifyViolationRecord(item).hasNoHelmet
        ).length;
        const tripleReview = savedViolations.filter(
            (item) => classifyViolationRecord(item).requiresTripleReview
        ).length;
        const platesAvailable = savedViolations.filter(
            (item) => item.number_plate && item.number_plate !== "NOT_AVAILABLE"
        ).length;
        const imagesWithSavedViolations = new Set(
            savedViolations.map((item) => item.image_path).filter(Boolean)
        ).size;
        const bikesWithSavedViolations = new Set(
            savedViolations
                .filter((item) => item.image_path && item.bike_id != null)
                .map((item) => `${item.image_path}:${item.bike_id}`)
        ).size;

        return {
            noHelmetRecords,
            tripleReview,
            platesAvailable,
            imagesWithSavedViolations,
            bikesWithSavedViolations,
        };
    }, [savedViolations]);

    const recentAnalyses = analysisHistory.slice(0, 5);
    const recentViolations = savedViolations.slice(0, 5);

    return (
        <main className="dashboard">
            <div className="page-heading">
                <div>
                    <p className="breadcrumb">Overview / Dashboard</p>
                    <h1>Image Analysis Dashboard</h1>
                    <p className="subtitle">
                        Review uploaded image analyses and saved violation records.
                    </p>
                </div>

                <button
                    className="analyze-btn"
                    onClick={() => setActivePage("upload")}
                >
                    + Analyze Image
                </button>
            </div>

            <section className="stats-grid">
                <div className="stat-card">
                    <span className="stat-label">Images with Saved Violations</span>
                    <h2>{summary.imagesWithSavedViolations}</h2>
                    <span className="stat-change">Unique uploaded images in the database</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Bikes Linked to Saved Violations</span>
                    <h2>{summary.bikesWithSavedViolations}</h2>
                    <span className="stat-change">Unique image and bike pairs</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">No-Helmet Records</span>
                    <h2>{summary.noHelmetRecords}</h2>
                    <span className="stat-change">Saved to the database</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Possible Triple-Riding Reviews</span>
                    <h2>{summary.tripleReview}</h2>
                    <span className="stat-change">Needs human review</span>
                </div>
            </section>

            <section className="dashboard-grid">
                <div className="panel traffic-panel">
                    <div className="panel-header">
                        <div>
                            <h3>Recent Violation Records</h3>
                            <p>Latest records saved by image analysis</p>
                        </div>
                        <button
                            className="view-btn"
                            onClick={() => setActivePage("history")}
                        >
                            View History
                        </button>
                    </div>

                    {loadError ? (
                        <p className="dashboard-empty" role="alert">
                            {loadError} Check that the Flask API is running.
                        </p>
                    ) : recentViolations.length === 0 ? (
                        <p className="dashboard-empty">
                            No saved violations yet. Analyze an image to begin.
                        </p>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Violation</th>
                                        <th>Bike</th>
                                        <th>Number Plate</th>
                                        <th>Image</th>
                                        <th>Date &amp; Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentViolations.map((item) => (
                                        <tr key={item.id}>
                                            <td>{classifyViolationRecord(item).displayType}</td>
                                            <td>{item.bike_id == null ? "N/A" : `Bike ${item.bike_id}`}</td>
                                            <td>
                                                {item.number_plate === "NOT_AVAILABLE"
                                                    ? "Unreadable / unavailable"
                                                    : item.number_plate || "Unreadable / unavailable"}
                                            </td>
                                            <td>{fileNameFromPath(item.image_path)}</td>
                                            <td>{item.timestamp || "N/A"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="panel violations-panel">
                    <div className="panel-header">
                        <div>
                            <h3>Saved Record Summary</h3>
                            <p>Based on records returned by Flask</p>
                        </div>
                    </div>

                    <div className="violation-item">
                        <span className="violation-icon helmet">H</span>
                        <div>
                            <strong>No-helmet records</strong>
                            <small>Includes legacy combined entries</small>
                        </div>
                        <b>{summary.noHelmetRecords}</b>
                    </div>

                    <div className="violation-item">
                        <span className="violation-icon triple">R</span>
                        <div>
                            <strong>Possible triple riding</strong>
                            <small>Includes legacy combined entries</small>
                        </div>
                        <b>{summary.tripleReview}</b>
                    </div>

                    <div className="violation-item">
                        <span className="violation-icon other">P</span>
                        <div>
                            <strong>Records with a plate</strong>
                            <small>Plate text is still an OCR estimate</small>
                        </div>
                        <b>{summary.platesAvailable}</b>
                    </div>

                    <div className="violation-item">
                        <span className="violation-icon speed">S</span>
                        <div>
                            <strong>Overspeed detection</strong>
                            <small>Not implemented</small>
                        </div>
                        <b>N/A</b>
                    </div>
                </div>
            </section>

            {recentAnalyses.length > 0 && <section className="panel recent-panel">
                <div className="panel-header">
                    <div>
                        <h3>Recent Image Analyses</h3>
                        <p>Saved on this browser and device</p>
                    </div>
                    <button
                        className="view-btn"
                        onClick={() => setActivePage("history")}
                    >
                        View All
                    </button>
                </div>

                {recentAnalyses.length === 0 ? (
                    <p className="dashboard-empty">
                        No image analyses saved on this device yet.
                    </p>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Image</th>
                                    <th>Result</th>
                                    <th>Motorcycles</th>
                                    <th>Confirmed Violations</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentAnalyses.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.fileName}</td>
                                        <td>{item.violations}</td>
                                        <td>{item.vehicles ?? "N/A"}</td>
                                        <td>{item.violationCount}</td>
                                        <td>{item.date} {item.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>}
        </main>
    );
}

export default Dashboard;
