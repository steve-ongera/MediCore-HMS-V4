import { useEffect, useState } from "react";
import { getAmbulances, createAmbulance, updateAmbulance, getAmbulanceMaintenanceLogs, createAmbulanceMaintenanceLog } from "../../services/api";

export default function FleetManagement() {
  const [ambulances, setAmbulances] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    registration_number: "", ambulance_type: "BASIC", make_model: "",
    capacity: "1", base_fee: "", rate_per_km: "",
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    ambulance: "", maintenance_type: "SERVICE", service_date: "",
    odometer_reading: "", vendor: "", cost: "", description: "",
  });

  useEffect(() => { load(); loadLogs(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAmbulances();
      setAmbulances(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadLogs = async () => {
    try {
      const data = await getAmbulanceMaintenanceLogs({ page_size: 50 });
      setLogs(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleFormChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createAmbulance({
        ...form,
        capacity: Number(form.capacity),
        base_fee: Number(form.base_fee || 0),
        rate_per_km: Number(form.rate_per_km || 0),
      });
      setForm({ registration_number: "", ambulance_type: "BASIC", make_model: "", capacity: "1", base_fee: "", rate_per_km: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateAmbulance(id, { status });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleMaintenanceChange = (f) => (e) => setMaintenanceForm((p) => ({ ...p, [f]: e.target.value }));

  const submitMaintenance = async (e) => {
    e.preventDefault();
    try {
      await createAmbulanceMaintenanceLog({
        ...maintenanceForm,
        odometer_reading: maintenanceForm.odometer_reading || undefined,
        cost: maintenanceForm.cost || undefined,
      });
      setMaintenanceForm({ ambulance: "", maintenance_type: "SERVICE", service_date: "", odometer_reading: "", vendor: "", cost: "", description: "" });
      loadLogs();
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Fleet Management</h1>
      {error && <p>Error: {error}</p>}

      <h2>Register Ambulance</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Registration Number" value={form.registration_number} onChange={handleFormChange("registration_number")} required />
        <select value={form.ambulance_type} onChange={handleFormChange("ambulance_type")}>
          <option value="BASIC">Basic Life Support (BLS)</option>
          <option value="ADVANCED">Advanced Life Support (ALS)</option>
          <option value="NEONATAL">Neonatal / ICU Transport</option>
          <option value="PATIENT_TRANSPORT">Non-Emergency Patient Transport</option>
        </select>
        <input type="text" placeholder="Make / Model" value={form.make_model} onChange={handleFormChange("make_model")} />
        <input type="number" placeholder="Capacity" value={form.capacity} onChange={handleFormChange("capacity")} required />
        <input type="number" placeholder="Base callout fee (KES)" value={form.base_fee} onChange={handleFormChange("base_fee")} />
        <input type="number" placeholder="Rate per km (KES)" value={form.rate_per_km} onChange={handleFormChange("rate_per_km")} />
        <button type="submit">Register Ambulance</button>
      </form>

      <h2>Fleet</h2>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Registration</th><th>Type</th><th>Capacity</th><th>Base Fee</th><th>Rate/km</th><th>Status</th></tr></thead>
          <tbody>
            {ambulances.map((a) => (
              <tr key={a.id}>
                <td>{a.registration_number}</td><td>{a.ambulance_type}</td><td>{a.capacity}</td>
                <td>KES {a.base_fee}</td><td>KES {a.rate_per_km}</td>
                <td>
                  <select value={a.status} onChange={(e) => handleStatusChange(a.id, e.target.value)}>
                    <option value="AVAILABLE">Available</option>
                    <option value="ON_CALL">On Call</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                    <option value="OUT_OF_SERVICE">Out of Service</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Log Maintenance</h2>
      <form onSubmit={submitMaintenance}>
        <select value={maintenanceForm.ambulance} onChange={handleMaintenanceChange("ambulance")} required>
          <option value="">Select ambulance</option>
          {ambulances.map((a) => <option key={a.id} value={a.id}>{a.registration_number}</option>)}
        </select>
        <select value={maintenanceForm.maintenance_type} onChange={handleMaintenanceChange("maintenance_type")}>
          <option value="SERVICE">Routine Service</option>
          <option value="REPAIR">Repair</option>
          <option value="INSPECTION">Inspection</option>
        </select>
        <input type="date" value={maintenanceForm.service_date} onChange={handleMaintenanceChange("service_date")} required />
        <input type="number" placeholder="Odometer reading" value={maintenanceForm.odometer_reading} onChange={handleMaintenanceChange("odometer_reading")} />
        <input type="text" placeholder="Vendor" value={maintenanceForm.vendor} onChange={handleMaintenanceChange("vendor")} />
        <input type="number" placeholder="Cost" value={maintenanceForm.cost} onChange={handleMaintenanceChange("cost")} />
        <textarea placeholder="Description" value={maintenanceForm.description} onChange={handleMaintenanceChange("description")} />
        <button type="submit">Log Maintenance</button>
      </form>

      <h2>Maintenance History</h2>
      <table>
        <thead><tr><th>Ambulance</th><th>Type</th><th>Date</th><th>Vendor</th><th>Cost</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{l.ambulance_registration}</td><td>{l.maintenance_type}</td>
              <td>{l.service_date}</td><td>{l.vendor || "—"}</td><td>{l.cost ? `KES ${l.cost}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs.length === 0 && <p>No maintenance logs yet.</p>}
    </div>
  );
}