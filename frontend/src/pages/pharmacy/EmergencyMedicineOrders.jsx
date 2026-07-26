import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllActiveEmergencyMedicationOrders, recordEmergencyMedicationAdministration } from "../../services/api";

export default function EmergencyMedicineOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [administeringId, setAdministeringId] = useState(null);
  const [givenIds, setGivenIds] = useState(new Set());

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllActiveEmergencyMedicationOrders();
      setOrders(data.results ?? data);
      setGivenIds(new Set());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleGive = async (orderId) => {
    setAdministeringId(orderId);
    setError("");
    try {
      await recordEmergencyMedicationAdministration({ medication_order: orderId, status: "GIVEN" });
      setGivenIds((prev) => new Set(prev).add(orderId));
    } catch (err) { setError(err.message); } finally { setAdministeringId(null); }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading emergency medication orders...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Emergency</div>
          <h1 className="page-title">Emergency Medicine Orders</h1>
          <p className="page-subtitle">Active medication orders for emergency patients</p>
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

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-capsule me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Active Emergency Medication Orders</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {orders.length} order{orders.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body">
          <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            <i className="bi bi-info-circle me-1"></i>
            Active medication orders across all patients currently in the Emergency Department. Marking a dose
            "Given" deducts stock immediately and bills the patient's account — no payment status check, since
            emergency care cannot wait on billing confirmation.
          </div>
          {orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-capsule"></i>
              </div>
              <h3 className="empty-state__title">No active emergency medication orders</h3>
              <p className="empty-state__desc">There are currently no active medication orders for emergency patients.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Visit #</th>
                    <th>Patient</th>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Route</th>
                    <th className="cell-numeric">Qty</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const isGiven = givenIds.has(o.id);
                    return (
                      <tr key={o.id}>
                        <td className="cell-mono">{o.emergency_visit_number || "—"}</td>
                        <td className="cell-primary">{o.patient_name || "—"}</td>
                        <td>{o.medicine_name}</td>
                        <td>{o.dosage}</td>
                        <td>
                          <span className="tag">{o.route}</span>
                        </td>
                        <td className="cell-numeric">{o.quantity}</td>
                        <td className="cell-actions">
                          <div className="flex gap-1 justify-end">
                            <button
                              className={`btn btn-sm ${isGiven ? "btn-success" : "btn-primary"}`}
                              onClick={() => handleGive(o.id)}
                              disabled={administeringId === o.id || isGiven}
                            >
                              {isGiven ? (
                                <><i className="bi bi-check-circle me-1"></i> Given</>
                              ) : administeringId === o.id ? (
                                <>
                                  <span className="spinner spinner-sm" style={{ display: "inline-block", width: "12px", height: "12px", marginRight: "var(--space-1)" }}></span>
                                  Giving...
                                </>
                              ) : (
                                <><i className="bi bi-check-circle me-1"></i> Give</>
                              )}
                            </button>
                            {o.emergency_visit && (
                              <Link to={`/emergency/${o.emergency_visit}`} className="btn btn-secondary btn-sm">
                                <i className="bi bi-eye me-1"></i> View
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {orders.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {orders.length} active emergency medication order{orders.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}