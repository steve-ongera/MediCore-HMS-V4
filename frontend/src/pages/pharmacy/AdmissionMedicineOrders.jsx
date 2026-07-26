import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllActiveMedicationOrders, recordMedicationAdministration } from "../../services/api";

export default function AdmissionMedicineOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [administeringId, setAdministeringId] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllActiveMedicationOrders();
      setOrders(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleGive = async (orderId) => {
    setAdministeringId(orderId);
    setError("");
    try {
      await recordMedicationAdministration({ medication_order: orderId, status: "GIVEN" });
      load();
    } catch (err) { setError(err.message); } finally { setAdministeringId(null); }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading medication orders...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Inpatient</div>
          <h1 className="page-title">Admission Medicine Orders</h1>
          <p className="page-subtitle">Active medication orders for admitted patients</p>
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
            <h5 className="card-title" style={{ marginBottom: 0 }}>Active Medication Orders</h5>
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
            Active medication orders across all admitted inpatients. Marking a dose "Given" deducts stock
            immediately (FEFO batch) and adds the charge to the patient's bill.
          </div>
          {orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-capsule"></i>
              </div>
              <h3 className="empty-state__title">No active medication orders</h3>
              <p className="empty-state__desc">There are currently no active medication orders for admitted patients.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Admission #</th>
                    <th>Patient</th>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Route</th>
                    <th>Frequency</th>
                    <th className="cell-numeric">Qty/Dose</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="cell-mono">{o.admission_number || o.admission}</td>
                      <td className="cell-primary">{o.patient_name || "—"}</td>
                      <td>{o.medicine_name}</td>
                      <td>{o.dosage}</td>
                      <td>
                        <span className="tag">{o.route}</span>
                      </td>
                      <td>{o.frequency}</td>
                      <td className="cell-numeric">{o.quantity}</td>
                      <td className="cell-actions">
                        <div className="flex gap-1 justify-end">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleGive(o.id)}
                            disabled={administeringId === o.id}
                          >
                            {administeringId === o.id ? (
                              <>
                                <span className="spinner spinner-sm" style={{ display: "inline-block", width: "12px", height: "12px", marginRight: "var(--space-1)" }}></span>
                                Giving...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-check-circle me-1"></i> Give
                              </>
                            )}
                          </button>
                          {o.admission && (
                            <Link to={`/inpatient/admissions/${o.admission}`} className="btn btn-secondary btn-sm">
                              <i className="bi bi-eye me-1"></i> View
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {orders.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {orders.length} active medication order{orders.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}