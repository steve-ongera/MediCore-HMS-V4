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

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Admission Medicine Orders</h1>
      <p>
        Active medication orders across all admitted inpatients. Marking a dose "Given" deducts stock
        immediately (FEFO batch) and adds the charge to the patient's bill — regardless of whether their
        account is currently fully paid. This matches how ward medication administration already works.
      </p>
      {error && <p>Error: {error}</p>}
      <button type="button" onClick={load}>Refresh</button>

      <table>
        <thead>
          <tr>
            <th>Admission #</th><th>Patient</th><th>Medicine</th><th>Dosage</th>
            <th>Route</th><th>Frequency</th><th>Qty/Dose</th><th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.admission_number || o.admission}</td>
              <td>{o.patient_name || "—"}</td>
              <td>{o.medicine_name}</td>
              <td>{o.dosage}</td>
              <td>{o.route}</td>
              <td>{o.frequency}</td>
              <td>{o.quantity}</td>
              <td>
                <button type="button" onClick={() => handleGive(o.id)} disabled={administeringId === o.id}>
                  {administeringId === o.id ? "Recording..." : "Mark Given"}
                </button>
                {o.admission && (
                  <Link to={`/inpatient/admissions/${o.admission}`}> View Admission</Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <p>No active admission medication orders.</p>}
    </div>
  );
}