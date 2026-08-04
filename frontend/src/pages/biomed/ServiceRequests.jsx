import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getServiceRequests, createServiceRequest, assignServiceRequest, resolveServiceRequest, getEquipment } from "../../services/api";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ServiceRequests() {
  const { hasRole } = useAuth();
  const isBiomed = hasRole("BIOMEDICAL_ENGINEER");

  const [requests, setRequests] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({ equipment: "", priority: "ROUTINE", problem_description: "" });

  const [resolvingId, setResolvingId] = useState(null);
  const [resolveForm, setResolveForm] = useState({ work_done: "", parts_used: "", cost: "" });

  useEffect(() => { loadEquipment(); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getServiceRequests(params);
      setRequests(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadEquipment = async () => {
    try { const data = await getEquipment({ page_size: 300 }); setEquipment(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createServiceRequest(form);
      setForm({ equipment: "", priority: "ROUTINE", problem_description: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleAssign = async (id) => {
    try { await assignServiceRequest(id); load(); } catch (err) { setError(err.message); }
  };

  const openResolve = (id) => {
    setResolvingId(id);
    setResolveForm({ work_done: "", parts_used: "", cost: "" });
  };

  const submitResolve = async () => {
    try {
      await resolveServiceRequest(resolvingId, { ...resolveForm, cost: Number(resolveForm.cost || 0) });
      setResolvingId(null);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Service Requests</h1>
      <p>Any staff member can report a breakdown. Biomedical engineers assign and resolve requests.</p>
      {error && <p>Error: {error}</p>}

      <h2>Report a Problem</h2>
      <form onSubmit={submit}>
        <select value={form.equipment} onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))} required>
          <option value="">Select equipment</option>
          {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.asset_tag} - {eq.name}</option>)}
        </select>
        <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
          <option value="ROUTINE">Routine</option>
          <option value="URGENT">Urgent</option>
          <option value="EMERGENCY">Emergency (Life-Critical Down)</option>
        </select>
        <textarea placeholder="Describe the problem" value={form.problem_description} onChange={(e) => setForm((p) => ({ ...p, problem_description: e.target.value }))} required />
        <button type="submit">Submit Report</button>
      </form>

      <h2>All Service Requests</h2>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="OPEN">Open</option>
        <option value="ASSIGNED">Assigned</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="RESOLVED">Resolved</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      <table>
        <thead>
          <tr><th>Request #</th><th>Equipment</th><th>Priority</th><th>Problem</th><th>Status</th><th>Assigned To</th><th>Downtime (hrs)</th><th></th></tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} style={{ background: r.priority === "EMERGENCY" ? "#fee" : "inherit" }}>
              <td>{r.request_number}</td><td>{r.equipment_tag} - {r.equipment_name}</td>
              <td>{r.priority}</td><td>{r.problem_description}</td><td>{r.status}</td>
              <td>{r.assigned_to_name || "—"}</td><td>{r.downtime_hours}</td>
              <td>
                {isBiomed && r.status === "OPEN" && <button type="button" onClick={() => handleAssign(r.id)}>Assign to Me</button>}
                {isBiomed && (r.status === "ASSIGNED" || r.status === "IN_PROGRESS") && (
                  resolvingId === r.id ? (
                    <div>
                      <textarea placeholder="Work done" value={resolveForm.work_done} onChange={(e) => setResolveForm((p) => ({ ...p, work_done: e.target.value }))} />
                      <input type="text" placeholder="Parts used" value={resolveForm.parts_used} onChange={(e) => setResolveForm((p) => ({ ...p, parts_used: e.target.value }))} />
                      <input type="number" placeholder="Cost" value={resolveForm.cost} onChange={(e) => setResolveForm((p) => ({ ...p, cost: e.target.value }))} />
                      <button type="button" onClick={submitResolve}>Confirm Resolved</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => openResolve(r.id)}>Resolve</button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 && <p>No service requests found.</p>}
    </div>
  );
}