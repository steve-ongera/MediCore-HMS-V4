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

  const getStatusBadge = (status) => {
    const statusMap = {
      "ACTIVE": "badge-success",
      "DEFERRED": "badge-warning",
      "INACTIVE": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getBloodGroupBadge = (group) => {
    const groupMap = {
      "A+": "badge-danger",
      "A-": "badge-danger",
      "B+": "badge-primary",
      "B-": "badge-primary",
      "AB+": "badge-info",
      "AB-": "badge-info",
      "O+": "badge-success",
      "O-": "badge-success",
    };
    return groupMap[group] || "badge-neutral";
  };

  if (loading && donors.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading blood donors...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Blood Bank</div>
          <h1 className="page-title">Blood Donors</h1>
          <p className="page-subtitle">Manage blood donors and donations</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { load(); loadUnits(); }}>
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
            <i className="bi bi-person-plus me-2"></i> Register Donor
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitDonor}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Full Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Full name"
                  value={donorForm.full_name}
                  onChange={handleDonorChange("full_name")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">National ID</label>
                <input
                  type="text"
                  className="input"
                  placeholder="National ID"
                  value={donorForm.national_id}
                  onChange={handleDonorChange("national_id")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Phone</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Phone number"
                  value={donorForm.phone}
                  onChange={handleDonorChange("phone")}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Date of Birth</label>
                <input
                  type="date"
                  className="input"
                  value={donorForm.date_of_birth}
                  onChange={handleDonorChange("date_of_birth")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Blood Group <span className="required">*</span></label>
                <select className="select" value={donorForm.blood_group} onChange={handleDonorChange("blood_group")}>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-person-plus me-2"></i> Register Donor
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-droplet me-2"></i> Record Donation
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitDonation}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Donor <span className="required">*</span></label>
                <select className="select" value={donationForm.donor} onChange={handleDonationChange("donor")} required>
                  <option value="">Select donor</option>
                  {donors.filter((d) => d.is_currently_eligible).map((d) => (
                    <option key={d.id} value={d.id}>{d.donor_number} - {d.full_name} ({d.blood_group})</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Volume (ml) <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="450"
                  value={donationForm.volume_ml}
                  onChange={handleDonationChange("volume_ml")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Hemoglobin Level</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Hb level"
                  value={donationForm.hemoglobin_level}
                  onChange={handleDonationChange("hemoglobin_level")}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Notes</label>
              <textarea
                className="textarea"
                placeholder="Notes"
                value={donationForm.notes}
                onChange={handleDonationChange("notes")}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-droplet me-2"></i> Record Donation
              </button>
            </div>
          </form>
          <div className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>
            <i className="bi bi-info-circle me-1"></i>
            Recording a donation automatically creates a quarantined blood unit awaiting screening below.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Units Pending Screening</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {units.length} unit{units.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {units.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-droplet"></i>
              </div>
              <h3 className="empty-state__title">No units pending screening</h3>
              <p className="empty-state__desc">All collected units have been screened.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Unit #</th>
                    <th>Blood Group</th>
                    <th>Collected</th>
                    <th>Expiry</th>
                    <th>Passed?</th>
                    <th>Notes</th>
                    <th>Price</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id}>
                      <td className="cell-mono">{u.unit_number}</td>
                      <td>
                        <span className={`badge ${getBloodGroupBadge(u.blood_group)}`}>
                          <span className="badge-dot"></span>
                          {u.blood_group}
                        </span>
                      </td>
                      <td>{u.collection_date}</td>
                      <td>{u.expiry_date}</td>
                      <td>
                        <input
                          type="checkbox"
                          className="input"
                          style={{ width: "auto", margin: 0 }}
                          checked={screeningForm[u.id]?.screening_passed || false}
                          onChange={handleScreeningChange(u.id, "screening_passed")}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input"
                          placeholder="Notes"
                          value={screeningForm[u.id]?.screening_notes || ""}
                          onChange={handleScreeningChange(u.id, "screening_notes")}
                          style={{ width: "140px" }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input"
                          placeholder="Price"
                          value={screeningForm[u.id]?.unit_price || ""}
                          onChange={handleScreeningChange(u.id, "unit_price")}
                          style={{ width: "100px" }}
                        />
                      </td>
                      <td className="cell-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => submitScreening(u.id)}>
                          <i className="bi bi-check me-1"></i> Submit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-people me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>All Donors</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {donors.length} donor{donors.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {donors.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-people"></i>
              </div>
              <h3 className="empty-state__title">No donors registered</h3>
              <p className="empty-state__desc">Register your first blood donor above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Donor #</th>
                    <th>Name</th>
                    <th>Blood Group</th>
                    <th>Status</th>
                    <th>Eligible Now?</th>
                  </tr>
                </thead>
                <tbody>
                  {donors.map((d) => (
                    <tr key={d.id}>
                      <td className="cell-mono">{d.donor_number}</td>
                      <td className="cell-primary">{d.full_name}</td>
                      <td>
                        <span className={`badge ${getBloodGroupBadge(d.blood_group)}`}>
                          <span className="badge-dot"></span>
                          {d.blood_group}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(d.status)}`}>
                          <span className="badge-dot"></span>
                          {d.status}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${d.is_currently_eligible ? "badge-success" : "badge-danger"}`}>
                          <span className="badge-dot"></span>
                          {d.is_currently_eligible ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {donors.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {donors.length} donor{donors.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}