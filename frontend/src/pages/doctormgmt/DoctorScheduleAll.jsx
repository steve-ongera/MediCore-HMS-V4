import { useEffect, useState } from "react";
import { getDoctorProfiles, getDoctorSchedules, createDoctorSchedule } from "../../services/api";

const DAYS = [
  { value: "MON", label: "Monday" }, { value: "TUE", label: "Tuesday" }, { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" }, { value: "FRI", label: "Friday" }, { value: "SAT", label: "Saturday" }, { value: "SUN", label: "Sunday" },
];

export default function DoctorScheduleAll() {
  const [doctors, setDoctors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ doctor: "", day_of_week: "MON", start_time: "", end_time: "" });

  useEffect(() => { loadDoctors(); loadSchedules(); }, []);

  const loadDoctors = async () => {
    try { const data = await getDoctorProfiles(); setDoctors(data.results ?? data); } catch (err) { setError(err.message); }
  };
  const loadSchedules = async () => {
    try { const data = await getDoctorSchedules({ page_size: 200 }); setSchedules(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createDoctorSchedule(form);
      setForm({ doctor: "", day_of_week: "MON", start_time: "", end_time: "" });
      loadSchedules();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Doctor Schedules</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <h2>Add Schedule Slot</h2>
      <form onSubmit={submit}>
        <select value={form.doctor} onChange={(e) => setForm((p) => ({ ...p, doctor: e.target.value }))} required>
          <option value="">Select doctor</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
        </select>
        <select value={form.day_of_week} onChange={(e) => setForm((p) => ({ ...p, day_of_week: e.target.value }))}>
          {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <input type="time" value={form.start_time} onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))} required />
        <input type="time" value={form.end_time} onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))} required />
        <button type="submit">Add Slot</button>
      </form>

      <h2>All Schedules</h2>
      <table>
        <thead><tr><th>Doctor</th><th>Day</th><th>Time</th><th>Department</th></tr></thead>
        <tbody>
          {schedules.map((s) => (
            <tr key={s.id}>
              <td>{s.doctor_name}</td><td>{s.day_of_week}</td>
              <td>{s.start_time} - {s.end_time}</td><td>{s.department_name || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}