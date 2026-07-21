import { useEffect, useState } from "react";
import {
  getBloodDonors, createBloodDonor, createBloodDonation, getBloodUnits, screenBloodUnit,
} from "../../services/api";

export default function BloodDonors() {
  const [donors, setDonors] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [donorForm, setDonorForm] = useState({
    full_name: "", national_id: "", phone: "", date_of_birth: "", blood_group: "O+",
  });

  const [donationForm, setDonationForm] = useState({ donor: "", volume_ml: "450", hemoglobin_level: "", notes: "" });

  const [screeningForm, setScreeningForm] = useState({});

  useEffect(() => { load(); loadUnits(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getBloodDonors({ page_size: 100 });
      setDonors(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadUnits = async () => {
    try {
      const data = await getBloodUnits({ status: "QUARANTINED", page_size: 100 });
      setUnits(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleDonorChange = (f) => (e) => setDonorForm((p) => ({ ...p, [f]: e.target.value }));

  const submitDonor = async (e) => {
    e.preventDefault();
    try {
      await createBloodDonor(donorForm);
      setDonorForm({ full_name: "", national_id: "", phone: "", date_of_birth: "", blood_group: "O+" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleDonationChange = (f) => (e) => setDonationForm((p) => ({ ...p, [f]: e.target.value }));

  const submitDonation = async (e) => {
    e.preventDefault();
    try {
      await createBloodDonation({
        ...donationForm,
        volume_ml: Number(donationForm.volume_ml),
        hemoglobin_level: donationForm.hemoglobin_level || undefined,
      });
      setDonationForm({ donor: "", volume_ml: "450", hemoglobin_level: "", notes: "" });
      loadUnits();
    } catch (err) { setError(err.message); }
  };

  const handleScreeningChange = (unitId, field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setScreeningForm((prev) => ({ ...prev, [unitId]: { ...prev[unitId], [field]: value } }));
  };

  const submitScreening = async (unitId) => {
    const data = screeningForm[unitId] || {};
    try {
      await screenBloodUnit(unitId, {
        screening_passed: !!data.screening_passed,
        screening_notes: data.screening_notes || "",
        unit_price: data.unit_price || undefined,
      });
      loadUnits();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Blood Donors</h1>
      {error && <p>Error: {error}</p>}

      <h2>Register Donor</h2>
      <form onSubmit={submitDonor}>
        <input type="text" placeholder="Full Name" value={donorForm.full_name} onChange={handleDonorChange("full_name")} required />
        <input type="text" placeholder="National ID" value={donorForm.national_id} onChange={handleDonorChange("national_id")} />
        <input type="text" placeholder="Phone" value={donorForm.phone} onChange={handleDonorChange("phone")} />
        <input type="date" value={donorForm.date_of_birth} onChange={handleDonorChange("date_of_birth")} />
        <select value={donorForm.blood_group} onChange={handleDonorChange("blood_group")}>
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button type="submit">Register Donor</button>
      </form>

      <h2>Record Donation</h2>
      <form onSubmit={submitDonation}>
        <select value={donationForm.donor} onChange={handleDonationChange("donor")} required>
          <option value="">Select donor</option>
          {donors.filter((d) => d.is_currently_eligible).map((d) => (
            <option key={d.id} value={d.id}>{d.donor_number} - {d.full_name} ({d.blood_group})</option>
          ))}
        </select>
        <input type="number" placeholder="Volume (ml)" value={donationForm.volume_ml} onChange={handleDonationChange("volume_ml")} required />
        <input type="number" placeholder="Hemoglobin level" value={donationForm.hemoglobin_level} onChange={handleDonationChange("hemoglobin_level")} />
        <textarea placeholder="Notes" value={donationForm.notes} onChange={handleDonationChange("notes")} />
        <button type="submit">Record Donation</button>
      </form>
      <p>Recording a donation automatically creates a quarantined blood unit awaiting screening below.</p>

      <h2>Units Pending Screening</h2>
      <table>
        <thead><tr><th>Unit #</th><th>Blood Group</th><th>Collected</th><th>Expiry</th><th>Passed?</th><th>Notes</th><th>Price</th><th></th></tr></thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.id}>
              <td>{u.unit_number}</td><td>{u.blood_group}</td>
              <td>{u.collection_date}</td><td>{u.expiry_date}</td>
              <td>
                <input type="checkbox" checked={screeningForm[u.id]?.screening_passed || false} onChange={handleScreeningChange(u.id, "screening_passed")} />
              </td>
              <td>
                <input type="text" value={screeningForm[u.id]?.screening_notes || ""} onChange={handleScreeningChange(u.id, "screening_notes")} />
              </td>
              <td>
                <input type="number" placeholder="Unit price" value={screeningForm[u.id]?.unit_price || ""} onChange={handleScreeningChange(u.id, "unit_price")} />
              </td>
              <td><button type="button" onClick={() => submitScreening(u.id)}>Submit Screening</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {units.length === 0 && <p>No units pending screening.</p>}

      <h2>All Donors</h2>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Donor #</th><th>Name</th><th>Blood Group</th><th>Status</th><th>Eligible Now?</th></tr></thead>
          <tbody>
            {donors.map((d) => (
              <tr key={d.id}>
                <td>{d.donor_number}</td><td>{d.full_name}</td><td>{d.blood_group}</td>
                <td>{d.status}</td><td>{d.is_currently_eligible ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}