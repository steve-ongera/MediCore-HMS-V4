import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getSurgicalProcedureCatalog, getAvailableTheatres, getUsers, createSurgeryBooking } from "../../services/api";

export default function BookSurgery() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [procedures, setProcedures] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    procedure: "", priority: "ELECTIVE", requested_date: "", theatre: "",
    primary_surgeon: "", diagnosis: "", pre_op_notes: "",
  });

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([loadProcedures(), loadTheatres(), loadDoctors()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const loadProcedures = async () => {
    try {
      const data = await getSurgicalProcedureCatalog();
      setProcedures(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadTheatres = async () => {
    try {
      const data = await getAvailableTheatres();
      setTheatres(data);
    } catch (err) { setError(err.message); }
  };

  const loadDoctors = async () => {
    try {
      const data = await getUsers({ role: "DOCTOR" });
      setDoctors(data.results ?? data);
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

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Please select a patient first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const booking = await createSurgeryBooking({
        patient: selectedPatient.id,
        procedure: form.procedure,
        priority: form.priority,
        requested_date: form.requested_date,
        theatre: form.theatre || undefined,
        primary_surgeon: form.primary_surgeon || undefined,
        diagnosis: form.diagnosis,
        pre_op_notes: form.pre_op_notes,
      });
      navigate(`/theatre/booking/${booking.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading booking data...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Theatre Management</div>
          <h1 className="page-title">Book Surgery</h1>
          <p className="page-subtitle">Schedule a surgical procedure</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/theatre")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Board
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
            <i className="bi bi-search me-2"></i> Step 1: Find Patient
          </h5>
        </div>
        <div className="card-body">
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
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-clipboard-plus me-2"></i> Step 2: Booking Details
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Procedure <span className="required">*</span></label>
                <select className="select" value={form.procedure} onChange={handleChange("procedure")} required>
                  <option value="">Select procedure</option>
                  {procedures.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCurrency(p.base_price)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                <label className="field-label">Priority <span className="required">*</span></label>
                <select className="select" value={form.priority} onChange={handleChange("priority")}>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="URGENT">Urgent</option>
                  <option value="ELECTIVE">Elective</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Requested Date & Time <span className="required">*</span></label>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.requested_date}
                  onChange={handleChange("requested_date")}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Theatre</label>
                <select className="select" value={form.theatre} onChange={handleChange("theatre")}>
                  <option value="">Assign theatre later</option>
                  {theatres.map((t) => <option key={t.id} value={t.id}>{t.theatre_number}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Primary Surgeon</label>
                <select className="select" value={form.primary_surgeon} onChange={handleChange("primary_surgeon")}>
                  <option value="">Assign surgeon later</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Diagnosis</label>
              <textarea
                className="textarea"
                placeholder="Diagnosis"
                value={form.diagnosis}
                onChange={handleChange("diagnosis")}
              />
            </div>

            <div className="field">
              <label className="field-label">Pre-op Notes</label>
              <textarea
                className="textarea"
                placeholder="Pre-operative notes"
                value={form.pre_op_notes}
                onChange={handleChange("pre_op_notes")}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/theatre")}
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
                    Booking...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i> Book Surgery
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