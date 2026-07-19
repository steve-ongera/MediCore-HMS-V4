import { useEffect, useState } from "react";
import { getAttendance, getActiveEmployees, recordAttendance } from "../../services/api";

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ employee: "", date: new Date().toISOString().slice(0, 10), clock_in: "", clock_out: "", status: "PRESENT", notes: "" });

  useEffect(() => { loadEmployees(); }, []);
  useEffect(() => { load(); }, [dateFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAttendance({ date: dateFilter, page_size: 200 });
      setRecords(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadEmployees = async () => {
    try {
      const data = await getActiveEmployees();
      setEmployees(data);
    } catch (err) { setError(err.message); }
  };

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await recordAttendance({
        ...form,
        clock_in: form.clock_in || undefined,
        clock_out: form.clock_out || undefined,
      });
      setForm({ employee: "", date: dateFilter, clock_in: "", clock_out: "", status: "PRESENT", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Attendance</h1>
      {error && <p>Error: {error}</p>}

      <h2>Record Attendance</h2>
      <form onSubmit={handleSubmit}>
        <select value={form.employee} onChange={handleChange("employee")} required>
          <option value="">Select employee</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
        <input type="date" value={form.date} onChange={handleChange("date")} required />
        <input type="time" placeholder="Clock in" value={form.clock_in} onChange={handleChange("clock_in")} />
        <input type="time" placeholder="Clock out" value={form.clock_out} onChange={handleChange("clock_out")} />
        <select value={form.status} onChange={handleChange("status")}>
          <option value="PRESENT">Present</option>
          <option value="LATE">Late</option>
          <option value="ABSENT">Absent</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="HALF_DAY">Half Day</option>
        </select>
        <input type="text" placeholder="Notes" value={form.notes} onChange={handleChange("notes")} />
        <button type="submit">Record</button>
      </form>

      <h2>Attendance for:</h2>
      <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Employee</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.employee_name}</td><td>{r.date}</td>
                <td>{r.clock_in || "—"}</td><td>{r.clock_out || "—"}</td>
                <td>{r.status}</td><td>{r.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && records.length === 0 && <p>No attendance records for this date.</p>}
    </div>
  );
}