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
      load(); // reload from backend — is_currently_due now reflects the real dosing window
    } catch (err) {
      setError(err.message);
    } finally {
      setAdministeringId(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Admission Medicine Orders</h1>
      <p>
        Active medication orders across all admitted inpatients. Dosing windows are enforced by the
        backend — a dose already given cannot be given again until it is next due, even after a refresh.
        Marking a dose "Given" deducts stock immediately (FEFO batch) and adds the charge to the patient's
        bill, regardless of payment status.
      </p>
      {error && <p>Error: {error}</p>}
      <button type="button" onClick={load}>Refresh</button>

      <table>
        <thead>
          <tr>
            <th>Admission #</th><th>Patient</th><th>Medicine</th><th>Dosage</th>
            <th>Route</th><th>Frequency</th><th>Qty/Dose</th>
            <th>Ordered By</th><th>Last Given</th><th>Next Due</th><th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const canGive = o.is_currently_due;
            return (
              <tr key={o.id}>
                <td>{o.admission_number || "—"}</td>
                <td>{o.patient_name || "—"}</td>
                <td>{o.medicine_name}</td>
                <td>{o.dosage}</td>
                <td>{o.route}</td>
                <td>{o.frequency}</td>
                <td>{o.quantity}</td>
                <td>{o.ordered_by_name || "—"} {o.ordered_by_role ? `(${o.ordered_by_role})` : ""}</td>
                <td>{o.last_administered_at ? new Date(o.last_administered_at).toLocaleString() : "Never"}</td>
                <td>{o.next_due_at ? new Date(o.next_due_at).toLocaleString() : "Now"}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleGive(o.id)}
                    disabled={administeringId === o.id || !canGive}
                    title={!canGive ? `Not due until ${new Date(o.next_due_at).toLocaleString()}` : ""}
                  >
                    {!canGive ? "Already Given" : administeringId === o.id ? "Recording..." : "Mark Given"}
                  </button>
                  {o.admission && (
                    <Link to={`/inpatient/admissions/${o.admission}`}> View Admission</Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orders.length === 0 && <p>No active admission medication orders.</p>}
    </div>
  );
}