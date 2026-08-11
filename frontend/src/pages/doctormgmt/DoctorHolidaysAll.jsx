import { useEffect, useState } from "react";
import { getDoctorProfiles, getDoctorHolidays, createDoctorHoliday, approveDoctorHoliday, rejectDoctorHoliday } from "../../services/api";

export default function DoctorHolidaysAll() {
  const [doctors, setDoctors] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ doctor: "", start_date: "", end_date: "", reason: "" });

  useEffect(() => { loadDoctors(); loadHolidays(); }, []);

  const loadDoctors = async () => {
    try { const data = await getDoctorProfiles(); setDoctors(data.results ?? data); } catch (err) { setError(err.message); }
  };
  const loadHolidays = async () => {
    try { const data = await getDoctorHolidays({ page_size: 100 }); setHolidays(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createDoctorHoliday(form);
      setForm({ doctor: "", start_date: "", end_date: "", reason: "" });
      loadHolidays();
    } catch (err) { setError(err.message); }
  };

  const handleApprove = async (id) => { try { await approveDoctorHoliday(id); loadHolidays(); } catch (err) { setError(err.message); } };
  const handleReject = async (id) => { try { await rejectDoctorHoliday(id); loadHolidays(); } catch (err) { setError(err.message); } };

  return (
    <div>
      <h1>Doctor Holidays</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <h2>Request Holiday</h2>
      <form onSubmit={submit}>
        <select value={form.doctor} onChange={(e) => setForm((p) => ({ ...p, doctor: e.target.value }))} required>
          <option value="">Select doctor</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
        </select>
        <input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} required />
        <input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} required />
        <input type="text" placeholder="Reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
        <button type="submit">Submit</button>
      </form>

      <h2>All Holidays</h2>
      <table>
        <thead><tr><th>Doctor</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {holidays.map((h) => (
            <tr key={h.id}>
              <td>{h.doctor_name}</td><td>{h.start_date}</td><td>{h.end_date}</td>
              <td>{h.reason || "—"}</td><td>{h.status}</td>
              <td>
                {h.status === "REQUESTED" && (
                  <>
                    <button type="button" onClick={() => handleApprove(h.id)}>Approve</button>
                    <button type="button" onClick={() => handleReject(h.id)}>Reject</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}