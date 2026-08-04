import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEquipmentDetail, getServiceRequests, getMaintenanceRecords, getCalibrations,
  updateEquipment,
} from "../../services/api";

export default function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState(null);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [calibrations, setCalibrations] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setError("");
    try {
      const [eq, sr, mr, cal] = await Promise.all([
        getEquipmentDetail(id),
        getServiceRequests({ equipment: id, page_size: 50 }),
        getMaintenanceRecords({ equipment: id, page_size: 50 }),
        getCalibrations({ equipment: id, page_size: 50 }),
      ]);
      setEquipment(eq);
      setServiceRequests(sr.results ?? sr);
      setMaintenance(mr.results ?? mr);
      setCalibrations(cal.results ?? cal);
    } catch (err) { setError(err.message); }
  };

  const handleStatusChange = async (status) => {
    try {
      await updateEquipment(id, { status });
      load();
    } catch (err) { setError(err.message); }
  };

  if (!equipment) return <div>Loading...</div>;

  return (
    <div>
      <button type="button" onClick={() => navigate("/biomed/equipment")}>&larr; Back</button>
      <h1>{equipment.asset_tag} — {equipment.name}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Category: {equipment.category} — Risk Class: {equipment.risk_class}</p>
        <p>Manufacturer: {equipment.manufacturer || "—"} — Model: {equipment.model_number || "—"} — Serial: {equipment.serial_number || "—"}</p>
        <p>Department: {equipment.department || "—"}</p>
        <p>Supplier: {equipment.supplier_name || "—"}</p>
        <p>Purchase Date: {equipment.purchase_date || "—"} — Cost: {equipment.purchase_cost ? `KES ${equipment.purchase_cost}` : "—"}</p>
        <p>Warranty Expiry: {equipment.warranty_expiry || "—"}</p>
        <p>Status:
          <select value={equipment.status} onChange={(e) => handleStatusChange(e.target.value)}>
            <option value="OPERATIONAL">Operational</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="OUT_OF_SERVICE">Out of Service</option>
            <option value="AWAITING_PARTS">Awaiting Parts</option>
            <option value="DECOMMISSIONED">Decommissioned</option>
          </select>
        </p>
        <p>PM Interval: every {equipment.preventive_maintenance_interval_days} days — Last done: {equipment.last_preventive_maintenance ? new Date(equipment.last_preventive_maintenance).toLocaleDateString() : "Never"} — Next due: {equipment.next_preventive_maintenance_due || "—"}</p>
        {equipment.calibration_interval_days && (
          <p>Calibration Interval: every {equipment.calibration_interval_days} days — Last done: {equipment.last_calibration ? new Date(equipment.last_calibration).toLocaleDateString() : "Never"} — Next due: {equipment.next_calibration_due || "—"}</p>
        )}
      </section>

      <section>
        <h2>Service Request History</h2>
        <table>
          <thead><tr><th>Request #</th><th>Priority</th><th>Problem</th><th>Status</th><th>Reported</th></tr></thead>
          <tbody>
            {serviceRequests.map((sr) => (
              <tr key={sr.id}>
                <td>{sr.request_number}</td><td>{sr.priority}</td><td>{sr.problem_description}</td>
                <td>{sr.status}</td><td>{new Date(sr.reported_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {serviceRequests.length === 0 && <p>No service requests for this equipment.</p>}
      </section>

      <section>
        <h2>Maintenance History</h2>
        <table>
          <thead><tr><th>Type</th><th>Status</th><th>Scheduled</th><th>Completed</th><th>Cost</th></tr></thead>
          <tbody>
            {maintenance.map((m) => (
              <tr key={m.id}>
                <td>{m.maintenance_type}</td><td>{m.status}</td>
                <td>{m.scheduled_date || "—"}</td>
                <td>{m.completed_at ? new Date(m.completed_at).toLocaleString() : "—"}</td>
                <td>KES {m.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {maintenance.length === 0 && <p>No maintenance records for this equipment.</p>}
      </section>

      <section>
        <h2>Calibration History</h2>
        <table>
          <thead><tr><th>Scheduled</th><th>Status</th><th>Calibrated</th><th>Certificate #</th></tr></thead>
          <tbody>
            {calibrations.map((c) => (
              <tr key={c.id}>
                <td>{c.scheduled_date}</td><td>{c.status}</td>
                <td>{c.calibrated_at ? new Date(c.calibrated_at).toLocaleString() : "—"}</td>
                <td>{c.certificate_number || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {calibrations.length === 0 && <p>No calibration records for this equipment.</p>}
      </section>
    </div>
  );
}