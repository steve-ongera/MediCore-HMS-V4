import { useEffect, useState } from "react";
import { getMortuaryCases } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

export default function BodyReleaseHistory() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMortuaryCases({ status: "RELEASED", page_size: 100 });
      setCases(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading release history...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Mortuary Services</div>
          <h1 className="page-title">Body Release History</h1>
          <p className="page-subtitle">Track all released bodies</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle  me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Released Cases</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {cases.length} case{cases.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {cases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No released cases</h3>
              <p className="empty-state__desc">No bodies have been released yet.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case #</th>
                    <th>Deceased</th>
                    <th>Admitted</th>
                    <th>Released</th>
                    <th>Collected By</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id}>
                      <td className="cell-mono">{c.case_number}</td>
                      <td className="cell-primary">{c.deceased_display_name}</td>
                      <td>{formatDateTime(c.admitted_at)}</td>
                      <td>{c.release?.released_at ? formatDateTime(c.release.released_at) : "—"}</td>
                      <td>{c.release?.collector_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {cases.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {cases.length} release{cases.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}