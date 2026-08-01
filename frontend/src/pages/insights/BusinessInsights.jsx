import { useEffect, useMemo, useState } from "react";
import {
  getActiveInsights,
  generateInsightsNow,
  acknowledgeInsight,
} from "../../services/api";

const SEVERITY_ICON = {
  CRITICAL: "🔴",
  WARNING: "🟠",
  INFO: "🔵",
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
    return <div>Loading insights...</div>;
  }

  return (
    <div>
      <h1>AI Business Insights</h1>

      <p>
        Automatically detected patterns and recommendations — not raw reports.
      </p>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          margin: "16px 0",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? "Analyzing..." : "Generate New Insights"}
        </button>

        <button type="button" onClick={load}>
          Refresh
        </button>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
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

      {filteredInsights.length === 0 ? (
        <p>
          {categoryFilter
            ? `No ${categoryFilter.toLowerCase()} insights available.`
            : "No active insights right now — everything looks normal."}
        </p>
      ) : (
        filteredInsights.map((i) => (
          <div
            key={i.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "12px",
              background:
                i.severity === "CRITICAL"
                  ? "#fff5f5"
                  : i.severity === "WARNING"
                  ? "#fffaf0"
                  : "#f8fbff",
            }}
          >
            <h3>
              {SEVERITY_ICON[i.severity] || "ℹ️"} {i.headline}
            </h3>

            <p>{i.detail}</p>

            <small>
              <strong>{i.category}</strong> •{" "}
              {new Date(i.generated_at).toLocaleString()}
            </small>

            <br />
            <br />

            {!i.acknowledged_by ? (
              <button
                type="button"
                onClick={() => handleAcknowledge(i.id)}
              >
                Acknowledge
              </button>
            ) : (
              <small>
                ✅ Acknowledged by {i.acknowledged_by_name}
              </small>
            )}
          </div>
        ))
      )}
    </div>
  );
}