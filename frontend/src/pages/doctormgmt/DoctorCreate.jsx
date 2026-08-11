import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, createDoctorProfile } from "../../services/api";

export default function DoctorCreate() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    user: "", specialty: "", qualifications: "", license_number: "",
    years_of_experience: "", bio: "", consultation_fee_override: "", commission_rate_percent: "0",
  });

  useEffect(() => {
    (async () => {
      try { const data = await getUsers({ role: "DOCTOR" }); setUsers(data.results ?? data); } catch (err) { setError(err.message); }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const profile = await createDoctorProfile({
        ...form,
        years_of_experience: form.years_of_experience || undefined,
        consultation_fee_override: form.consultation_fee_override || undefined,
        commission_rate_percent: Number(form.commission_rate_percent),
      });
      navigate(`/doctors/${profile.id}`);
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Add New Doctor Profile</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <form onSubmit={handleSubmit}>
        <select value={form.user} onChange={(e) => setForm((p) => ({ ...p, user: e.target.value }))} required>
          <option value="">Select doctor account</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <input type="text" placeholder="Specialty" value={form.specialty} onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))} />
        <textarea placeholder="Qualifications" value={form.qualifications} onChange={(e) => setForm((p) => ({ ...p, qualifications: e.target.value }))} />
        <input type="text" placeholder="License Number" value={form.license_number} onChange={(e) => setForm((p) => ({ ...p, license_number: e.target.value }))} />
        <input type="number" placeholder="Years of Experience" value={form.years_of_experience} onChange={(e) => setForm((p) => ({ ...p, years_of_experience: e.target.value }))} />
        <textarea placeholder="Bio" value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
        <input type="number" placeholder="Consultation fee override (optional)" value={form.consultation_fee_override} onChange={(e) => setForm((p) => ({ ...p, consultation_fee_override: e.target.value }))} />
        <input type="number" placeholder="Commission rate %" value={form.commission_rate_percent} onChange={(e) => setForm((p) => ({ ...p, commission_rate_percent: e.target.value }))} />
        <button type="submit">Create Profile</button>
      </form>
    </div>
  );
}