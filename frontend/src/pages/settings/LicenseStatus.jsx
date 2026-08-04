import { useEffect, useState } from "react";
import { getFacilityLicense, updateFacilityLicense } from "../../services/api";

export default function LicenseStatus() {
  const [license, setLicense] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await getFacilityLicense();
      setLicense(data);
      if (data) setForm(data);
    } catch (err) { setError(err.message); }
  };

  const handleSave = async () => {
    try {
      await updateFacilityLicense(form);
      setEditing(false);
      load();
    } catch (err) { setError(err.message); }
  };

  if (!license) return <div>No license configured. Contact MediCore support.</div>;

  const bedPct = (license.current_bed_count / license.max_beds) * 100;
  const userPct = (license.current_user_count / license.max_users) * 100;

  return (
    <div>
      <h1>License Status</h1>
      {error && <p>Error: {error}</p>}
      {license.is_expired && <p style={{ color: "red", fontWeight: "bold" }}>⚠ This license has expired.</p>}

      <p>Package: <strong>{license.package}</strong> — Licensed to: {license.licensed_to || "—"}</p>
      <p>Valid: {license.valid_from || "—"} to {license.valid_until || "—"}</p>

      <h2>Bed Capacity</h2>
      <p>{license.current_bed_count} / {license.max_beds} beds used ({bedPct.toFixed(0)}%)</p>
      <div style={{ background: "#eee", height: 12, borderRadius: 6 }}>
        <div style={{ width: `${Math.min(bedPct, 100)}%`, background: bedPct >= 100 ? "red" : "#2962FF", height: "100%", borderRadius: 6 }}></div>
      </div>
      <p>{license.beds_remaining} beds remaining</p>

      <h2>User Capacity</h2>
      <p>{license.current_user_count} / {license.max_users} staff accounts used ({userPct.toFixed(0)}%)</p>
      <div style={{ background: "#eee", height: 12, borderRadius: 6 }}>
        <div style={{ width: `${Math.min(userPct, 100)}%`, background: userPct >= 100 ? "red" : "#2962FF", height: "100%", borderRadius: 6 }}></div>
      </div>
      <p>{license.users_remaining} accounts remaining</p>

      {editing ? (
        <div>
          <h2>Update License</h2>
          <select value={form.package} onChange={(e) => setForm((p) => ({ ...p, package: e.target.value }))}>
            <option value="STARTER">Starter</option>
            <option value="STANDARD">Standard</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="ENTERPRISE">Enterprise</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <input type="number" placeholder="Max Beds" value={form.max_beds} onChange={(e) => setForm((p) => ({ ...p, max_beds: Number(e.target.value) }))} />
          <input type="number" placeholder="Max Users" value={form.max_users} onChange={(e) => setForm((p) => ({ ...p, max_users: Number(e.target.value) }))} />
          <input type="text" placeholder="Licensed To" value={form.licensed_to} onChange={(e) => setForm((p) => ({ ...p, licensed_to: e.target.value }))} />
          <label>Valid Until</label>
          <input type="date" value={form.valid_until || ""} onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))} />
          <button type="button" onClick={handleSave}>Save</button>
          <button type="button" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)}>Edit License</button>
      )}
    </div>
  );
}