import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllActiveEmergencyMedicationOrders, recordEmergencyMedicationAdministration } from "../../services/api";

export default function EmergencyMedicineOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [administeringId, setAdministeringId] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllActiveEmergencyMedicationOrders();
      setOrders(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleGive = async (orderId) => {
    setAdministeringId(orderId);
    setError("");
    try {
      await recordEmergencyMedicationAdministration({ medication_order: orderId, status: "GIVEN" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdministeringId(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Emergency Medicine Orders</h1>
      <p>
        Active medication orders across all patients currently in the Emergency Department. The backend
        blocks re-administering the same dose within a short safety window, even after a refresh. Marking
        "Given" deducts stock immediately and bills the patient's account — no payment status check, since
        emergency care cannot wait on billing confirmation.
      </p>
      {error && <p>Error: {error}</p>}
      <button type="button" onClick={load}>Refresh</button>

      <table>
        <thead>
          <tr>
            <th>Visit #</th><th>Patient</th><th>Medicine</th><th>Dosage</th>
            <th>Route</th><th>Qty</th><th>Ordered By</th><th>Last Given</th><th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const canGive = o.is_currently_due;
            return (
              <tr key={o.id}>
                <td>{o.emergency_visit_number || "—"}</td>
                <td>{o.patient_name || "—"}</td>
                <td>{o.medicine_name}</td>
                <td>{o.dosage}</td>
                <td>{o.route}</td>
                <td>{o.quantity}</td>
                <td>{o.ordered_by_name || "—"} {o.ordered_by_role ? `(${o.ordered_by_role})` : ""}</td>
                <td>{o.last_administered_at ? new Date(o.last_administered_at).toLocaleString() : "Never"}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleGive(o.id)}
                    disabled={administeringId === o.id || !canGive}
                  >
                    {!canGive ? "Already Given" : administeringId === o.id ? "Recording..." : "Mark Given"}
                  </button>
                  {o.emergency_visit && (
                    <Link to={`/emergency/${o.emergency_visit}`}> View ED Visit</Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orders.length === 0 && <p>No active emergency medication orders.</p>}
    </div>
  );
}