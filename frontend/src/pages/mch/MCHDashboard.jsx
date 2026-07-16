import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAntenatalProfiles, getDueImmunizations, getDeliveryRecords } from "../../services/api";

export default function MCHDashboard() {
  const [activePregnancies, setActivePregnancies] = useState(0);
  const [highRisk, setHighRisk] = useState(0);
  const [dueImmunizations, setDueImmunizations] = useState([]);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [profiles, due, deliveries] = await Promise.all([
        getAntenatalProfiles({ status: "ACTIVE", page_size: 200 }),
        getDueImmunizations(),
        getDeliveryRecords({ page_size: 10 }),
      ]);
      const profileList = profiles.results ?? profiles;
      setActivePregnancies(profiles.count ?? profileList.length);
      setHighRisk(profileList.filter((p) => p.high_risk).length);
      setDueImmunizations(due);
      setRecentDeliveries(deliveries.results ?? deliveries);
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
        <span className="loading-screen__label">Loading MCH dashboard...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Maternal & Child Health</div>
          <h1 className="page-title">MCH Dashboard</h1>
          <p className="page-subtitle">Overview of maternal and child health services</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
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

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Active Pregnancies</span>
            <div className="stat-card__icon tone-primary">
              <i className="bi bi-person-pregnant"></i>
            </div>
          </div>
          <div className="stat-card__value">{activePregnancies}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">High Risk Pregnancies</span>
            <div className="stat-card__icon tone-danger">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
          </div>
          <div className="stat-card__value">{highRisk}</div>
          <div className="stat-card__delta is-up">
            <i className="bi bi-arrow-up me-1"></i> Requires special attention
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Immunizations Due</span>
            <div className="stat-card__icon tone-warning">
              <i className="bi bi-syringe"></i>
            </div>
          </div>
          <div className="stat-card__value">{dueImmunizations.length}</div>
          <div className="stat-card__footnote">Vaccinations pending</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Recent Deliveries</span>
            <div className="stat-card__icon tone-success">
              <i className="bi bi-baby"></i>
            </div>
          </div>
          <div className="stat-card__value">{recentDeliveries.length}</div>
          <div className="stat-card__footnote">Last 10 deliveries</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-arrow-right-circle me-2"></i> Quick Actions
          </h5>
        </div>
        <div className="card-body">
          <div className="flex gap-3 flex-wrap">
            <Link to="/mch/antenatal" className="btn btn-primary">
              <i className="bi bi-person-pregnant me-2"></i> Antenatal Care
            </Link>
            <Link to="/mch/children" className="btn btn-secondary">
              <i className="bi bi-person-child me-2"></i> Child Records
            </Link>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-syringe me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Immunizations Due</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {dueImmunizations.length} immunization{dueImmunizations.length !== 1 ? "s" : ""} due
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {dueImmunizations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">No immunizations due</h3>
              <p className="empty-state__desc">All immunizations are up to date.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Child</th>
                    <th>Vaccine</th>
                    <th>Due Date</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {dueImmunizations.map((imm) => (
                    <tr key={imm.id}>
                      <td className="cell-primary">{imm.child}</td>
                      <td>{imm.vaccine_name}</td>
                      <td>{new Date(imm.due_date).toLocaleDateString()}</td>
                      <td className="cell-actions">
                        <Link to={`/mch/children/${imm.child}`} className="btn btn-secondary btn-sm">
                          <i className="bi bi-eye me-1"></i> View Child
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-baby me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Recent Deliveries</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {recentDeliveries.length} recent delivery{recentDeliveries.length !== 1 ? "ies" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {recentDeliveries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-hospital"></i>
              </div>
              <h3 className="empty-state__title">No deliveries recorded</h3>
              <p className="empty-state__desc">Start recording deliveries in the system.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Delivery #</th>
                    <th>Mother</th>
                    <th>Mode</th>
                    <th>Outcome</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeliveries.map((d) => (
                    <tr key={d.id}>
                      <td className="cell-primary">{d.delivery_number}</td>
                      <td>{d.mother_name}</td>
                      <td>{d.mode_of_delivery}</td>
                      <td>
                        <span className={`badge ${d.outcome === "ALIVE" ? "badge-success" : "badge-danger"}`}>
                          <span className="badge-dot"></span>
                          {d.outcome}
                        </span>
                      </td>
                      <td>{new Date(d.delivery_date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {recentDeliveries.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {recentDeliveries.length} recent delivery{recentDeliveries.length !== 1 ? "ies" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Alive
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Deceased
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}