import { useEffect, useState } from "react";
import { getCalibrations, createCalibration, completeCalibration, getEquipment } from "../../services/api";

export default function CalibrationSchedule() {
  const [calibrations, setCalibrations] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({ equipment: "", scheduled_date: "" });
  const [completingId, setCompletingId] = useState(null);
  const [completeForm, setCompleteForm] = useState({ status: "COMPLETED", reference_standard: "", result_notes: "", certificate_number: "" });

  useEffect(() => { loadEquipment(); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getCalibrations(params);
      setCalibrations(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadEquipment = async () => {
    try {
      const data = await getEquipment({ page_size: 300 });
      setEquipmentList((data.results ?? data).filter((e) => e.next_calibration_due !== undefined));
    } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createCalibration(form);
      setForm({ equipment: "", scheduled_date: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const openComplete = (id) => {
    setCompletingId(id);
    setCompleteForm({ status: "COMPLETED", reference_standard: "", result_notes: "", certificate_number: "" });
  };

  const submitComplete = async () => {
    try {
      await completeCalibration(completingId, completeForm);
      setCompletingId(null);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Calibration Schedule</h1>
      {error && <p>Error: {error}</p>}

      <h2>Schedule Calibration</h2>
      <form onSubmit={submit}>
        <select value={form.equipment} onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))} required>
          <option value="">Select equipment</option>
          {equipmentList.map((eq) => <option key={eq.id} value={eq.id}>{eq.asset_tag} - {eq.name}</option>)}
        </select>
        <input type="date" value={form.scheduled_date} onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))} required />
        <button type="submit">Schedule</button>
      </form>

      <h2>All Calibrations</h2>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="SCHEDULED">Scheduled</option>
        <option value="COMPLETED">Completed</option>
        <option value="FAILED">Failed — Out of Tolerance</option>
        <option value="OVERDUE">Overdue</option>
      </select>

      <table>
        <thead><tr><th>Equipment</th><th>Scheduled</th><th>Status</th><th>Certificate #</th><th></th></tr></thead>
        <tbody>
          {calibrations.map((c) => (
            <tr key={c.id} style={{ background: c.status === "OVERDUE" || c.status === "FAILED" ? "#fee" : "inherit" }}>
              <td>{c.equipment_name}</td><td>{c.scheduled_date}</td><td>{c.status}</td>
              <td>{c.certificate_number || "—"}</td>
              <td>
                {c.status === "SCHEDULED" && (
                  completingId === c.id ? (
                    <span>
                      <select value={completeForm.status} onChange={(e) => setCompleteForm((p) => ({ ...p, status: e.target.value }))}>
                        <option value="COMPLETED">Completed</option>
                        <option value="FAILED">Failed — Out of Tolerance</option>
                      </select>
                      <input type="text" placeholder="Reference standard used" value={completeForm.reference_standard} onChange={(e) => setCompleteForm((p) => ({ ...p, reference_standard: e.target.value }))} />
                      <input type="text" placeholder="Certificate #" value={completeForm.certificate_number} onChange={(e) => setCompleteForm((p) => ({ ...p, certificate_number: e.target.value }))} />
                      <textarea placeholder="Result notes" value={completeForm.result_notes} onChange={(e) => setCompleteForm((p) => ({ ...p, result_notes: e.target.value }))} />
                      <button type="button" onClick={submitComplete}>Save</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => openComplete(c.id)}>Record Result</button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {calibrations.length === 0 && <p>No calibration records found.</p>}
    </div>
  );
}