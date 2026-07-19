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

  const getStatusBadge = (status) => {
    const statusMap = {
      "PRESENT": "badge-success",
      "LATE": "badge-warning",
      "ABSENT": "badge-danger",
      "ON_LEAVE": "badge-info",
      "HALF_DAY": "badge-primary",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading && records.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading attendance records...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Human Resources</div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Manage employee attendance</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-2"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Record Attendance
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Employee <span className="required">*</span></label>
                <select className="select" value={form.employee} onChange={handleChange("employee")} required>
                  <option value="">Select employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={handleChange("date")}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Clock In</label>
                <input
                  type="time"
                  className="input"
                  placeholder="Clock in"
                  value={form.clock_in}
                  onChange={handleChange("clock_in")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Clock Out</label>
                <input
                  type="time"
                  className="input"
                  placeholder="Clock out"
                  value={form.clock_out}
                  onChange={handleChange("clock_out")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Status</label>
                <select className="select" value={form.status} onChange={handleChange("status")}>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="ABSENT">Absent</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="HALF_DAY">Half Day</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Notes</label>
              <input
                type="text"
                className="input"
                placeholder="Additional notes"
                value={form.notes}
                onChange={handleChange("notes")}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              <i className="bi bi-plus-circle me-2"></i> Record
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-calendar me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Attendance for</h5>
            <div className="field" style={{ marginBottom: 0 }}>
              <input
                type="date"
                className="input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ width: "180px" }}
              />
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {records.length} record{records.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {records.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-calendar"></i>
              </div>
              <h3 className="empty-state__title">No attendance records</h3>
              <p className="empty-state__desc">No attendance records found for this date.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-primary">{r.employee_name}</td>
                      <td>{r.date}</td>
                      <td className="cell-mono">{r.clock_in || "—"}</td>
                      <td className="cell-mono">{r.clock_out || "—"}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{r.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {records.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {records.length} record{records.length !== 1 ? "s" : ""} for {dateFilter}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Present
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Late
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Absent
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                On Leave
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}