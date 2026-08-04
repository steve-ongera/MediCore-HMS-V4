import { useEffect, useState } from "react";
import { getMaintenanceRecords, createMaintenanceRecord, completeMaintenanceRecord, getEquipment } from "../../services/api";

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({ equipment: "", maintenance_type: "PREVENTIVE", scheduled_date: "" });
  const [completingId, setCompletingId] = useState(null);
  const [completeForm, setCompleteForm] = useState({ work_done: "", cost: "" });

  useEffect(() => { loadEquipment(); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getMaintenanceRecords(params);
      setRecords(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadEquipment = async () => {
    try { const data = await getEquipment({ page_size: 300 }); setEquipment(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createMaintenanceRecord(form);
      setForm({ equipment: "", maintenance_type: "PREVENTIVE", scheduled_date: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const openComplete = (id) => {
    setCompletingId(id);
    setCompleteForm({ work_done: "", cost: "" });
  };

  const submitComplete = async () => {
    try {
      await completeMaintenanceRecord(completingId, { ...completeForm, cost: Number(completeForm.cost || 0) });
      setCompletingId(null);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Maintenance</h1>
      {error && <p>Error: {error}</p>}

      <h2>Schedule Maintenance</h2>
      <form onSubmit={submit}>
        <select value={form.equipment} onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))} required>
          <option value="">Select equipment</option>
          {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.asset_tag} - {eq.name}</option>)}
        </select>
        <select value={form.maintenance_type} onChange={(e) => setForm((p) => ({ ...p, maintenance_type: e.target.value }))}>
          <option value="PREVENTIVE">Preventive</option>
          <option value="CORRECTIVE">Corrective</option>
        </select>
        <input type="date" value={form.scheduled_date} onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))} required />
        <button type="submit">Schedule</button>
      </form>

      <h2>All Maintenance Records</h2>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="SCHEDULED">Scheduled</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      <table>
        <thead><tr><th>Equipment</th><th>Type</th><th>Status</th><th>Scheduled</th><th>Cost</th><th></th></tr></thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{r.equipment_name}</td><td>{r.maintenance_type}</td><td>{r.status}</td>
              <td>{r.scheduled_date || "—"}</td><td>KES {r.cost}</td>
              <td>
                {r.status !== "COMPLETED" && (
                  completingId === r.id ? (
                    <span>
                      <textarea placeholder="Work done" value={completeForm.work_done} onChange={(e) => setCompleteForm((p) => ({ ...p, work_done: e.target.value }))} />
                      <input type="number" placeholder="Cost" value={completeForm.cost} onChange={(e) => setCompleteForm((p) => ({ ...p, cost: e.target.value }))} />
                      <button type="button" onClick={submitComplete}>Confirm</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => openComplete(r.id)}>Mark Complete</button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 && <p>No maintenance records found.</p>}
    </div>
  );
}