import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDoctorProfiles, getDoctorSchedules, createDoctorSchedule } from "../../services/api";

const DAYS = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
];

export default function DoctorScheduleAll() {
  const [doctors, setDoctors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    doctor: "",
    day_of_week: "MON",
    start_time: "",
    end_time: "",
  });

  useEffect(() => {
    loadDoctors();
    loadSchedules();
  }, []);

  const loadDoctors = async () => {
    try {
      const data = await getDoctorProfiles();
      setDoctors(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await getDoctorSchedules({ page_size: 200 });
      setSchedules(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createDoctorSchedule(form);
      setForm({ doctor: "", day_of_week: "MON", start_time: "", end_time: "" });
      await loadSchedules();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getDayLabel = (value) => {
    const day = DAYS.find((d) => d.value === value);
    return day ? day.label : value;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical / Doctors</div>
          <h1 className="page-title">Doctor Schedules</h1>
          <p className="page-subtitle">Manage doctor availability and schedules</p>
        </div>
        <div className="page-header__actions">
          <Link to="/doctors" className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back to Doctors
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={loadSchedules} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">Add Schedule Slot</h5>
        </div>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="doctor">
                  Doctor <span className="required">*</span>
                </label>
                <select
                  id="doctor"
                  className="select"
                  value={form.doctor}
                  onChange={(e) => setForm((p) => ({ ...p, doctor: e.target.value }))}
                  required
                >
                  <option value="">Select doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.full_name} {d.specialty ? `(${d.specialty})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="day_of_week">
                  Day <span className="required">*</span>
                </label>
                <select
                  id="day_of_week"
                  className="select"
                  value={form.day_of_week}
                  onChange={(e) => setForm((p) => ({ ...p, day_of_week: e.target.value }))}
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="start_time">
                  Start Time <span className="required">*</span>
                </label>
                <input
                  id="start_time"
                  type="time"
                  className="input"
                  value={form.start_time}
                  onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                  required
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="end_time">
                  End Time <span className="required">*</span>
                </label>
                <input
                  id="end_time"
                  type="time"
                  className="input"
                  value={form.end_time}
                  onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span
                      className="spinner"
                      style={{
                        width: "16px",
                        height: "16px",
                        borderWidth: "2px",
                        marginRight: "var(--space-2)",
                      }}
                    ></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Slot
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">All Schedules</h5>
          <div>
            <span className="text-tertiary text-sm">
              {schedules.length} slot{schedules.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading schedules...</span>
            </div>
          ) : schedules.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-calendar"></i>
              </div>
              <div className="empty-state__title">No schedules found</div>
              <div className="empty-state__desc">Add a schedule slot using the form above.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.id} className="is-clickable">
                        <td>
                          <div className="table-row-avatar">
                            <span className="avatar avatar-sm">
                              <i className="bi bi-person"></i>
                            </span>
                            <div>
                              <div className="cell-primary">{s.doctor_name}</div>
                              {s.specialty && (
                                <div className="text-2xs text-muted">{s.specialty}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-info">{getDayLabel(s.day_of_week)}</span>
                        </td>
                        <td>
                          <span className="font-mono text-sm">
                            {s.start_time} - {s.end_time}
                          </span>
                        </td>
                        <td>{s.department_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {!loading && schedules.length > 0 && (
          <div className="table-footer">
            <span className="table-footer__meta">
              Showing {schedules.length} schedule slot{schedules.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}