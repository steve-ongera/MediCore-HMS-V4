import { useEffect, useMemo, useState } from "react";
import {
  getActiveInsights,
  generateInsightsNow,
  acknowledgeInsight,
} from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

const SEVERITY_ICON = {
  CRITICAL: "🔴",
  WARNING: "🟠",
  INFO: "🔵",
};

const SEVERITY_BADGE = {
  CRITICAL: "badge-danger",
  WARNING: "badge-warning",
  INFO: "badge-info",
};

export default function BusinessInsights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getActiveInsights();
      setInsights(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");

    try {
      await generateInsightsNow();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeInsight(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredInsights = useMemo(() => {
    if (!categoryFilter) return insights;

    return insights.filter(
      (i) =>
        i.category &&
        i.category.toUpperCase() === categoryFilter.toUpperCase()
    );
  }, [insights, categoryFilter]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading insights...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Analytics</div>
          <h1 className="page-title">AI Business Insights</h1>
          <p className="page-subtitle">Automatically detected patterns and recommendations</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                Analyzing...
              </>
            ) : (
              <>
                <i className="bi bi-magic me-2"></i> Generate New Insights
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-2"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-funnel me-1"></i>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Filter by Category</label>
              <select
                className="select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All Categories</option>
                <option value="THEFT">🚨 Theft / Loss</option>
                <option value="REVENUE">Revenue</option>
                <option value="PHARMACY">Pharmacy</option>
                <option value="STAFFING">Staffing</option>
                <option value="INVENTORY">Inventory</option>
                <option value="PATTERN">Recurring Pattern</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {filteredInsights.length} insight{filteredInsights.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body">
          {filteredInsights.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-lightbulb"></i>
              </div>
              <h3 className="empty-state__title">
                {categoryFilter ? `No ${categoryFilter.toLowerCase()} insights` : "No active insights"}
              </h3>
              <p className="empty-state__desc">
                {categoryFilter 
                  ? `No ${categoryFilter.toLowerCase()} insights available.` 
                  : "Everything looks normal. Generate new insights to detect patterns."}
              </p>
            </div>
          ) : (
            <div className="insights-list" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {filteredInsights.map((i) => (
                <div
                  key={i.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${
                      i.severity === "CRITICAL" ? "var(--danger-strong)" : 
                      i.severity === "WARNING" ? "var(--warning-strong)" : 
                      "var(--info-strong)"
                    }`,
                    background:
                      i.severity === "CRITICAL"
                        ? "var(--danger-soft)"
                        : i.severity === "WARNING"
                        ? "var(--warning-soft)"
                        : "var(--info-soft)",
                  }}
                >
                  <div className="card-body">
                    <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: "var(--space-2)" }}>
                      <span style={{ fontSize: "20px" }}>{SEVERITY_ICON[i.severity] || "ℹ️"}</span>
                      <h5 className="card-title" style={{ marginBottom: 0 }}>{i.headline}</h5>
                      <span className={`badge ${SEVERITY_BADGE[i.severity] || "badge-info"}`}>
                        <span className="badge-dot"></span>
                        {i.severity}
                      </span>
                      <span className="badge badge-neutral">
                        <span className="badge-dot"></span>
                        {i.category}
                      </span>
                    </div>

                    <p style={{ marginBottom: "var(--space-2)" }}>{i.detail}</p>

                    <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: "var(--space-2)" }}>
                      <span className="text-2xs text-tertiary">
                        <i className="bi bi-clock me-1"></i>
                        {formatDateTime(i.generated_at)}
                      </span>

                      <div style={{ marginLeft: "auto" }}>
                        {!i.acknowledged_by ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAcknowledge(i.id)}
                          >
                            <i className="bi bi-check-circle me-1"></i> Acknowledge
                          </button>
                        ) : (
                          <span className="text-sm text-success">
                            <i className="bi bi-check-circle me-1"></i>
                            Acknowledged by {i.acknowledged_by_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {filteredInsights.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {filteredInsights.length} insight{filteredInsights.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Critical
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Warning
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Info
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}