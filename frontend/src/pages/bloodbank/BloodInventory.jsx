import { useEffect, useState } from "react";
import { getBloodInventory, getExpiringSoonUnits } from "../../services/api";

export default function BloodInventory() {
  const [inventory, setInventory] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [inv, exp] = await Promise.all([getBloodInventory(), getExpiringSoonUnits()]);
      setInventory(inv);
      setExpiring(exp);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const getBloodGroupBadge = (group) => {
    const groupMap = {
      "A+": "badge-danger",
      "A-": "badge-danger",
      "B+": "badge-primary",
      "B-": "badge-primary",
      "AB+": "badge-info",
      "AB-": "badge-info",
      "O+": "badge-success",
      "O-": "badge-success",
    };
    return groupMap[group] || "badge-neutral";
  };

  if (loading && inventory.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading blood inventory...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Blood Bank</div>
          <h1 className="page-title">Blood Bank Inventory</h1>
          <p className="page-subtitle">Available blood stock and expiring units</p>
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-droplet me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Available Stock by Blood Group / Component</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {inventory.length} row{inventory.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {inventory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-droplet"></i>
              </div>
              <h3 className="empty-state__title">No available stock</h3>
              <p className="empty-state__desc">There are no available blood units in inventory.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Blood Group</th>
                    <th>Component</th>
                    <th className="cell-numeric">Units Available</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`badge ${getBloodGroupBadge(row.blood_group)}`}>
                          <span className="badge-dot"></span>
                          {row.blood_group}
                        </span>
                      </td>
                      <td>{row.component_type}</td>
                      <td className="cell-numeric">
                        <span className="badge badge-primary">
                          <span className="badge-dot"></span>
                          {row.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {inventory.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {inventory.length} blood group/component combination{inventory.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Expiring Within 7 Days</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {expiring.length} unit{expiring.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {expiring.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">No units expiring soon</h3>
              <p className="empty-state__desc">All units have more than 7 days until expiry.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Unit #</th>
                    <th>Blood Group</th>
                    <th>Component</th>
                    <th>Expiry Date</th>
                    <th className="cell-numeric">Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {expiring.map((u) => (
                    <tr key={u.id}>
                      <td className="cell-mono">{u.unit_number}</td>
                      <td>
                        <span className={`badge ${getBloodGroupBadge(u.blood_group)}`}>
                          <span className="badge-dot"></span>
                          {u.blood_group}
                        </span>
                      </td>
                      <td>{u.component_type}</td>
                      <td>{u.expiry_date}</td>
                      <td className="cell-numeric">
                        <span className={`badge ${u.days_until_expiry <= 3 ? "badge-danger" : "badge-warning"}`}>
                          <span className="badge-dot"></span>
                          {u.days_until_expiry} days
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {expiring.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {expiring.length} unit{expiring.length !== 1 ? "s" : ""} expiring within 7 days
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                4-7 days
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                0-3 days
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}