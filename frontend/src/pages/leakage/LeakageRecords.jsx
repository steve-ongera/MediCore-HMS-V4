import { useEffect, useState } from "react";
import { getLeakageRecords, resolveLeak, writeOffLeak } from "../../services/api";
import { formatCurrency, formatDateTime } from "../../utils/formatters";

export default function LeakageRecords() {
  const [records, setRecords] = useState([]);
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [writeOffId, setWriteOffId] = useState(null);
  const [writeOffReason, setWriteOffReason] = useState("");

  useEffect(() => { load(); }, [statusFilter, sourceFilter, search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 200 };
      if (statusFilter) params.status = statusFilter;
      if (sourceFilter) params.source_type = sourceFilter;
      if (search) params.search = search;
      const data = await getLeakageRecords(params);
      setRecords(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleResolve = async (id) => {
    if (!window.confirm("Create a bill for this now? This raises an invoice immediately.")) return;
    try {
      await resolveLeak(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const submitWriteOff = async (id) => {
    try {
      await writeOffLeak(id, { reason: writeOffReason });
      setWriteOffId(null);
      setWriteOffReason("");
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "OPEN": "badge-danger",
      "RESOLVED": "badge-success",
      "WRITTEN_OFF": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const totalOpenAmount = records
    .filter((r) => r.status === "OPEN")
    .reduce((sum, r) => sum + Number(r.expected_amount), 0);

  if (loading && records.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading leakage records...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Revenue Protection</div>
          <h1 className="page-title">Revenue Leakage Records</h1>
          <p className="page-subtitle">View and resolve revenue leaks</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle  me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-bar" style={{ width: "200px" }}>
              <i className="bi bi-search search-bar__icon"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by patient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="search-bar__clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "150px" }}
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="RESOLVED">Resolved</option>
                <option value="WRITTEN_OFF">Written Off</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <select
                className="select"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                style={{ width: "160px" }}
              >
                <option value="">All Sources</option>
                <option value="LAB">Laboratory</option>
                <option value="RADIOLOGY">Radiology</option>
                <option value="PHARMACY_DISPENSE">Pharmacy</option>
                <option value="CONSULTATION_PROCEDURE">Consultation Procedures</option>
                <option value="THEATRE">Theatre</option>
                <option value="DENTAL">Dental</option>
                <option value="EYE_CLINIC">Eye Clinic</option>
                <option value="MCH_DELIVERY">MCH Delivery</option>
                <option value="MCH_IMMUNIZATION">Immunization</option>
                <option value="DIALYSIS">Dialysis</option>
                <option value="ICU_PROCEDURE">ICU</option>
                <option value="BLOOD_BANK">Blood Bank</option>
                <option value="AMBULANCE">Ambulance</option>
                <option value="MORTUARY">Mortuary</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {records.length} record{records.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body">
          {statusFilter === "OPEN" && (
            <div className="card" style={{ marginBottom: "var(--space-3)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
              <div className="card-body" style={{ padding: "var(--space-2) var(--space-3)" }}>
                <div className="text-danger" style={{ fontWeight: 600 }}>
                  <i className="bi bi-exclamation-triangle  me-1"></i>
                  Total Open in View: {formatCurrency(totalOpenAmount)}
                </div>
              </div>
            </div>
          )}
          {records.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">No records found</h3>
              <p className="empty-state__desc">
                {statusFilter || sourceFilter || search 
                  ? "No records match your search criteria." 
                  : "No leakage records found."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Patient</th>
                    <th>Description</th>
                    <th className="cell-numeric">Amount</th>
                    <th>Event Date</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} style={r.status === "OPEN" ? { background: "var(--danger-soft)" } : {}}>
                      <td>
                        <span className="tag">{r.source_type}</span>
                      </td>
                      <td className="cell-primary">
                        {r.patient_name}
                        <div className="text-2xs text-tertiary">{r.hospital_number}</div>
                      </td>
                      <td>{r.description}</td>
                      <td className="cell-numeric" style={r.status === "OPEN" ? { color: "var(--danger-strong)", fontWeight: 600 } : {}}>
                        {formatCurrency(r.expected_amount)}
                      </td>
                      <td>{formatDateTime(r.event_date)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="cell-actions">
                        {r.status === "OPEN" && (
                          <div className="flex gap-1 justify-end" style={{ flexWrap: "wrap" }}>
                            <button className="btn btn-success btn-sm" onClick={() => handleResolve(r.id)}>
                              <i className="bi bi-cash-stack  me-1"></i> Bill Now
                            </button>
                            {writeOffId === r.id ? (
                              <>
                                <input
                                  type="text"
                                  className="input"
                                  placeholder="Reason"
                                  value={writeOffReason}
                                  onChange={(e) => setWriteOffReason(e.target.value)}
                                  style={{ width: "120px" }}
                                />
                                <button className="btn btn-danger btn-sm" onClick={() => submitWriteOff(r.id)}>
                                  <i className="bi bi-check  me-1"></i> Confirm
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setWriteOffId(null)}>
                                  <i className="bi bi-x"></i>
                                </button>
                              </>
                            ) : (
                              <button className="btn btn-neutral btn-sm" onClick={() => setWriteOffId(r.id)}>
                                <i className="bi bi-pencil  me-1"></i> Write Off
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {records.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {records.length} record{records.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Open
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Resolved
              </span>
              <span className="badge badge-neutral">
                <span className="badge-dot"></span>
                Written Off
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}