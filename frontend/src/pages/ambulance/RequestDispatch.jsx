import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getAvailableAmbulances, requestDispatch } from "../../services/api";

export default function RequestDispatch() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [unregisteredMode, setUnregisteredMode] = useState(false);

  const [ambulances, setAmbulances] = useState([]);

  const [form, setForm] = useState({
    ambulance: "", patient_name_freetext: "", contact_phone: "",
    dispatch_type: "EMERGENCY_PICKUP", pickup_location: "", destination: "Facility", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAmbulances();
  }, []);

  const loadAmbulances = async () => {
    try {
      const data = await getAvailableAmbulances();
      setAmbulances(data);
    } catch (err) { setError(err.message); }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleFormChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient && !form.patient_name_freetext.trim()) {
      setError("Select a registered patient or enter a name for an unregistered pickup.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const dispatch = await requestDispatch({
        ambulance: form.ambulance || undefined,
        patient: selectedPatient ? selectedPatient.id : undefined,
        patient_name_freetext: selectedPatient ? "" : form.patient_name_freetext,
        contact_phone: form.contact_phone,
        dispatch_type: form.dispatch_type,
        pickup_location: form.pickup_location,
        destination: form.destination,
        notes: form.notes,
      });
      navigate(`/ambulance/${dispatch.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  if (!ambulances && !loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading ambulance data...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Ambulance Services</div>
          <h1 className="page-title">Request Ambulance Dispatch</h1>
          <p className="page-subtitle">Request an ambulance for patient transport</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/ambulance")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Dashboard
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
            <i className="bi bi-person me-2"></i> Patient Information
          </h5>
        </div>
        <div className="card-body">
          <div className="field" style={{ marginBottom: "var(--space-3)" }}>
            <label className="field-label" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
              <input
                type="checkbox"
                className="input"
                style={{ width: "auto", margin: 0 }}
                checked={unregisteredMode}
                onChange={(e) => { setUnregisteredMode(e.target.checked); setSelectedPatient(null); }}
              />
              <span>Unregistered / unknown patient (emergency pickup)</span>
            </label>
          </div>

          {!unregisteredMode ? (
            <>
              <form onSubmit={handlePatientSearch}>
                <div className="field-row">
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="field-label">Search Patient</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Search by name / phone / hospital number"
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                    <button type="submit" className="btn btn-primary">
                      <i className="bi bi-search me-2"></i> Search
                    </button>
                  </div>
                </div>
              </form>

              {patientResults.length > 0 && (
                <div style={{ marginTop: "var(--space-4)" }}>
                  <div className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
                    Search Results ({patientResults.length})
                  </div>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Hospital #</th>
                          <th>Phone</th>
                          <th className="cell-actions"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientResults.map((p) => (
                          <tr key={p.id}>
                            <td className="cell-primary">{p.full_name}</td>
                            <td className="cell-mono">{p.hospital_number}</td>
                            <td>{p.phone}</td>
                            <td className="cell-actions">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setSelectedPatient(p)}
                              >
                                <i className="bi bi-check me-1"></i> Select
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedPatient && (
                <div className="card" style={{ borderColor: "var(--success)", background: "var(--success-soft)", marginTop: "var(--space-4)" }}>
                  <div className="card-body">
                    <div className="flex items-center gap-3">
                      <div className="avatar avatar-sm">
                        <i className="bi bi-person-check fs-xl"></i>
                      </div>
                      <div>
                        <div className="text-sm text-success font-semibold">
                          <i className="bi bi-check-circle me-1"></i> Selected Patient
                        </div>
                        <div className="font-bold">{selectedPatient.full_name}</div>
                        <div className="text-sm text-muted">
                          {selectedPatient.hospital_number} • {selectedPatient.phone}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm ml-auto"
                        onClick={() => setSelectedPatient(null)}
                      >
                        <i className="bi bi-x me-1"></i> Change
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="field">
              <label className="field-label">Patient Name (if known)</label>
              <input
                type="text"
                className="input"
                placeholder="Enter patient name"
                value={form.patient_name_freetext}
                onChange={handleFormChange("patient_name_freetext")}
              />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-truck me-2"></i> Dispatch Details
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label">Contact Phone <span className="required">*</span></label>
              <input
                type="text"
                className="input"
                placeholder="Contact phone number"
                value={form.contact_phone}
                onChange={handleFormChange("contact_phone")}
                required
              />
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Dispatch Type <span className="required">*</span></label>
                <select className="select" value={form.dispatch_type} onChange={handleFormChange("dispatch_type")}>
                  <option value="EMERGENCY_PICKUP">Emergency Pickup</option>
                  <option value="INTER_FACILITY_TRANSFER">Inter-Facility Transfer</option>
                  <option value="DISCHARGE_TRANSPORT">Discharge Transport</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Pickup Location <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Pickup location"
                  value={form.pickup_location}
                  onChange={handleFormChange("pickup_location")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Destination <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Destination"
                  value={form.destination}
                  onChange={handleFormChange("destination")}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Assign Ambulance</label>
              <select className="select" value={form.ambulance} onChange={handleFormChange("ambulance")}>
                <option value="">Assign ambulance later</option>
                {ambulances.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.registration_number} - {a.ambulance_type} (base KES {a.base_fee} + KES {a.rate_per_km}/km)
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field-label">Notes</label>
              <textarea
                className="textarea"
                placeholder="Additional notes"
                value={form.notes}
                onChange={handleFormChange("notes")}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/ambulance")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Requesting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-truck me-2"></i> Request Dispatch
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}