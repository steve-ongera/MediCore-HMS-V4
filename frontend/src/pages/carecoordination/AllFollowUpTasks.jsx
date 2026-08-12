import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFollowUpTasks } from "../../services/api";

export default function AllFollowUpTasks() {
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const load = async () => {
    try {
      const params = { page_size: 200 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.task_type = typeFilter;
      const data = await getFollowUpTasks(params);
      setTasks(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>All Follow-up Tasks</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All Statuses</option>
        <option value="PENDING">Pending</option>
        <option value="DUE_TODAY">Due Today</option>
        <option value="OVERDUE">Overdue</option>
        <option value="ESCALATED">Escalated</option>
        <option value="COMPLETED">Completed</option>
        <option value="MISSED">Missed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
        <option value="">All Types</option>
        <option value="CLINIC_REVIEW">Clinic Review</option>
        <option value="PENDING_INVESTIGATION">Pending Investigation</option>
        <option value="SPECIALIST_REVIEW">Specialist Review</option>
        <option value="REFERRAL_FOLLOWUP">Referral Follow-up</option>
        <option value="POST_DISCHARGE_CHECK">Post-Discharge Check</option>
        <option value="MEDICATION_REVIEW">Medication Review</option>
        <option value="OUTREACH_CALL">Outreach Call</option>
      </select>

      <table>
        <thead><tr><th>Patient</th><th>Care Plan</th><th>Task</th><th>Type</th><th>Due</th><th>Assigned</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} style={{ background: ["OVERDUE", "ESCALATED"].includes(t.status) ? "#fee" : "inherit" }}>
              <td>{t.patient_name}</td><td>{t.care_plan_title}</td><td>{t.description}</td>
              <td>{t.task_type}</td><td>{t.due_date}</td><td>{t.assigned_to_name || "—"}</td><td>{t.status}</td>
              <td><Link to={`/care-coordination/care-plans/${t.care_plan}`}>View Plan</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      {tasks.length === 0 && <p>No tasks match this filter.</p>}
    </div>
  );
}