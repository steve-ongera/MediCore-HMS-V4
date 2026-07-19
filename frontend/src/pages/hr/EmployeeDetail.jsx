import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEmployee, terminateEmployee, getLeaveTypes, createLeaveRequest,
  createPerformanceReview, createDisciplinaryRecord,
} from "../../services/api";

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [leaveForm, setLeaveForm] = useState({ leave_type: "", start_date: "", end_date: "", reason: "" });
  const [reviewForm, setReviewForm] = useState({
    review_period_start: "", review_period_end: "", score: "",
    strengths: "", areas_for_improvement: "", goals_next_period: "",
  });
  const [disciplinaryForm, setDisciplinaryForm] = useState({
    severity: "VERBAL_WARNING", incident_date: "", description: "", action_taken: "",
  });

  useEffect(() => { load(); loadLeaveTypes(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getEmployee(id);
      setEmployee(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadLeaveTypes = async () => {
    try {
      const data = await getLeaveTypes();
      setLeaveTypes(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleTerminate = async () => {
    if (!window.confirm("Terminate this employee's employment?")) return;
    try {
      await terminateEmployee(id, {});
      load();
    } catch (err) { setError(err.message); }
  };

  const submitLeave = async (e) => {
    e.preventDefault();
    try {
      await createLeaveRequest({ employee: id, ...leaveForm });
      setLeaveForm({ leave_type: "", start_date: "", end_date: "", reason: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await createPerformanceReview({ employee: id, ...reviewForm, score: Number(reviewForm.score) });
      setReviewForm({ review_period_start: "", review_period_end: "", score: "", strengths: "", areas_for_improvement: "", goals_next_period: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitDisciplinary = async (e) => {
    e.preventDefault();
    try {
      await createDisciplinaryRecord({ employee: id, ...disciplinaryForm });
      setDisciplinaryForm({ severity: "VERBAL_WARNING", incident_date: "", description: "", action_taken: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div>Loading...</div>;
  if (!employee) return null;

  const isActive = employee.employment_status !== "TERMINATED" && employee.employment_status !== "RESIGNED";

  return (
    <div>
      <button type="button" onClick={() => navigate("/hr/employees")}>&larr; Back</button>
      <h1>{employee.employee_number} — {employee.full_name}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Job Title: {employee.job_title} — Department: {employee.department_name || "—"}</p>
        <p>Employment Type: {employee.employment_type} — Status: {employee.employment_status}</p>
        <p>Date Hired: {employee.date_hired} — Years of Service: {employee.years_of_service}</p>
        {employee.date_terminated && <p>Date Terminated: {employee.date_terminated}</p>}
        <p>Phone: {employee.phone || "—"} — Email: {employee.email || "—"}</p>
        <p>National ID: {employee.national_id || "—"} — Gender: {employee.gender || "—"} — DOB: {employee.date_of_birth || "—"}</p>
        <p>Basic Salary: KES {employee.basic_salary}</p>
        <p>Bank: {employee.bank_name || "—"} — Account: {employee.bank_account_number || "—"}</p>
        <p>Next of Kin: {employee.next_of_kin_name || "—"} ({employee.next_of_kin_relationship || "—"}) — {employee.next_of_kin_phone || "—"}</p>
        <p>System Login: {employee.user_username || "None"}</p>
        {isActive && <button type="button" onClick={handleTerminate}>Terminate Employment</button>}
      </section>

      {isActive && (
        <section>
          <h2>Request Leave</h2>
          <form onSubmit={submitLeave}>
            <select value={leaveForm.leave_type} onChange={(e) => setLeaveForm((p) => ({ ...p, leave_type: e.target.value }))} required>
              <option value="">Select leave type</option>
              {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
            </select>
            <input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm((p) => ({ ...p, start_date: e.target.value }))} required />
            <input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm((p) => ({ ...p, end_date: e.target.value }))} required />
            <textarea placeholder="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))} />
            <button type="submit">Submit Leave Request</button>
          </form>
        </section>
      )}

      <section>
        <h2>Leave History</h2>
        <table>
          <thead><tr><th>Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th></tr></thead>
          <tbody>
            {(employee.leave_requests || []).map((l) => (
              <tr key={l.id}>
                <td>{l.leave_type_name}</td><td>{l.start_date}</td><td>{l.end_date}</td>
                <td>{l.days_requested}</td><td>{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Record Performance Review</h2>
        <form onSubmit={submitReview}>
          <input type="date" placeholder="Period start" value={reviewForm.review_period_start} onChange={(e) => setReviewForm((p) => ({ ...p, review_period_start: e.target.value }))} required />
          <input type="date" placeholder="Period end" value={reviewForm.review_period_end} onChange={(e) => setReviewForm((p) => ({ ...p, review_period_end: e.target.value }))} required />
          <input type="number" min="0" max="100" placeholder="Score /100" value={reviewForm.score} onChange={(e) => setReviewForm((p) => ({ ...p, score: e.target.value }))} required />
          <textarea placeholder="Strengths" value={reviewForm.strengths} onChange={(e) => setReviewForm((p) => ({ ...p, strengths: e.target.value }))} />
          <textarea placeholder="Areas for improvement" value={reviewForm.areas_for_improvement} onChange={(e) => setReviewForm((p) => ({ ...p, areas_for_improvement: e.target.value }))} />
          <textarea placeholder="Goals for next period" value={reviewForm.goals_next_period} onChange={(e) => setReviewForm((p) => ({ ...p, goals_next_period: e.target.value }))} />
          <button type="submit">Save Review</button>
        </form>
      </section>

      <section>
        <h2>Performance History</h2>
        <table>
          <thead><tr><th>Period</th><th>Score</th><th>Reviewer</th></tr></thead>
          <tbody>
            {(employee.performance_reviews || []).map((r) => (
              <tr key={r.id}>
                <td>{r.review_period_start} to {r.review_period_end}</td>
                <td>{r.score}/100</td><td>{r.reviewer_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Log Disciplinary Record</h2>
        <form onSubmit={submitDisciplinary}>
          <select value={disciplinaryForm.severity} onChange={(e) => setDisciplinaryForm((p) => ({ ...p, severity: e.target.value }))}>
            <option value="VERBAL_WARNING">Verbal Warning</option>
            <option value="WRITTEN_WARNING">Written Warning</option>
            <option value="FINAL_WARNING">Final Warning</option>
            <option value="SUSPENSION">Suspension</option>
            <option value="TERMINATION">Termination</option>
          </select>
          <input type="date" value={disciplinaryForm.incident_date} onChange={(e) => setDisciplinaryForm((p) => ({ ...p, incident_date: e.target.value }))} required />
          <textarea placeholder="Description" value={disciplinaryForm.description} onChange={(e) => setDisciplinaryForm((p) => ({ ...p, description: e.target.value }))} required />
          <textarea placeholder="Action taken" value={disciplinaryForm.action_taken} onChange={(e) => setDisciplinaryForm((p) => ({ ...p, action_taken: e.target.value }))} />
          <button type="submit">Log Record</button>
        </form>
      </section>

      <section>
        <h2>Disciplinary History</h2>
        <table>
          <thead><tr><th>Date</th><th>Severity</th><th>Description</th><th>Issued By</th></tr></thead>
          <tbody>
            {(employee.disciplinary_records || []).map((d) => (
              <tr key={d.id}>
                <td>{d.incident_date}</td><td>{d.severity}</td><td>{d.description}</td><td>{d.issued_by_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}