import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDoctorProfile, updateDoctorProfile, deleteDoctorProfile } from "../../services/api";

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const data = await getDoctorProfile(id);
      setDoctor(data);
      setForm(data);
    } catch (err) { setError(err.message); }
  };

  const handleSave = async () => {
    try {
      await updateDoctorProfile(id, {
        specialty: form.specialty, qualifications: form.qualifications, license_number: form.license_number,
        years_of_experience: form.years_of_experience || undefined,
        bio: form.bio, consultation_fee_override: form.consultation_fee_override || undefined,
        commission_rate_percent: form.commission_rate_percent, is_available_for_booking: form.is_available_for_booking,
      });
      setEditing(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this doctor's management profile? Their login account is unaffected.")) return;
    try {
      await deleteDoctorProfile(id);
      navigate("/doctors");
    } catch (err) { setError(err.message); }
  };

  if (!doctor) return <p>Loading...</p>;

  return (
    <div>
      <button type="button" onClick={() => navigate("/doctors")}>&larr; Back</button>
      <h1>Dr. {doctor.full_name}</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {editing ? (
        <div>
          <input type="text" placeholder="Specialty" value={form.specialty} onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))} />
          <textarea placeholder="Qualifications" value={form.qualifications} onChange={(e) => setForm((p) => ({ ...p, qualifications: e.target.value }))} />
          <input type="text" placeholder="License Number" value={form.license_number} onChange={(e) => setForm((p) => ({ ...p, license_number: e.target.value }))} />
          <input type="number" placeholder="Years of Experience" value={form.years_of_experience || ""} onChange={(e) => setForm((p) => ({ ...p, years_of_experience: e.target.value }))} />
          <textarea placeholder="Bio" value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
          <input type="number" placeholder="Consultation Fee Override" value={form.consultation_fee_override || ""} onChange={(e) => setForm((p) => ({ ...p, consultation_fee_override: e.target.value }))} />
          <input type="number" placeholder="Commission Rate %" value={form.commission_rate_percent} onChange={(e) => setForm((p) => ({ ...p, commission_rate_percent: e.target.value }))} />
          <label><input type="checkbox" checked={form.is_available_for_booking} onChange={(e) => setForm((p) => ({ ...p, is_available_for_booking: e.target.checked }))} /> Available for booking</label>
          <button type="button" onClick={handleSave}>Save</button>
          <button type="button" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div>
          <p>Specialty: {doctor.specialty || "—"}</p>
          <p>Qualifications: {doctor.qualifications || "—"}</p>
          <p>License #: {doctor.license_number || "—"}</p>
          <p>Experience: {doctor.years_of_experience ?? "—"} years</p>
          <p>Bio: {doctor.bio || "—"}</p>
          <p>Consultation Fee Override: {doctor.consultation_fee_override ? `KES ${doctor.consultation_fee_override}` : "Uses department default"}</p>
          <p>Commission Rate: {doctor.commission_rate_percent}%</p>
          <p>Available for Booking: {doctor.is_available_for_booking ? "Yes" : "No"}</p>
          <button type="button" onClick={() => setEditing(true)}>Edit</button>
          <button type="button" onClick={handleDelete}>Delete</button>
        </div>
      )}
    </div>
  );
}