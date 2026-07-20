import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSurgeryBooking, getAvailableTheatres, cancelSurgeryBooking, startSurgery } from "../../services/api";

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [theatres, setTheatres] = useState([]);
  const [selectedTheatre, setSelectedTheatre] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); loadTheatres(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSurgeryBooking(id);
      setBooking(data);
      if (data.surgery) navigate(`/theatre/${data.surgery.id}`, { replace: true });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadTheatres = async () => {
    try {
      const data = await getAvailableTheatres();
      setTheatres(data);
    } catch (err) { setError(err.message); }
  };

  const handleStart = async (e) => {
    e.preventDefault();
    try {
      await startSurgery(id, { theatre: selectedTheatre });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCancel = async () => {
    try {
      await cancelSurgeryBooking(id, { cancellation_reason: cancelReason });
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "REQUESTED": "badge-warning",
      "CONFIRMED": "badge-primary",
      "IN_PROGRESS": "badge-info",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      "EMERGENCY": "badge-danger",
      "URGENT": "badge-warning",
      "ELECTIVE": "badge-info",
    };
    return priorityMap[priority] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading booking details...</span>
      </div>
    );
  }

  if (!booking) return null;

  const canStart = booking.status === "REQUESTED" || booking.status === "CONFIRMED";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Theatre Management</div>
          <h1 className="page-title">{booking.booking_number}</h1>
          <p className="page-subtitle">{booking.patient_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/theatre")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Board
          </button>
          <button className="btn btn-secondary" onClick={load}>
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
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-calendar-check fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{booking.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {booking.hospital_number}
                </span>
                <span>•</span>
                <span>{booking.procedure_name}</span>
                <span>•</span>
                <span className={`badge ${getPriorityBadge(booking.priority)}`}>
                  <span className="badge-dot"></span>
                  {booking.priority}
                </span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(booking.status)}`}>
                  <span className="badge-dot"></span>
                  {booking.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm font-bold">{formatCurrency(booking.procedure_price)}</span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Patient</div>
              <div className="info-item__value">{booking.patient_name}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Procedure</div>
              <div className="info-item__value">{booking.procedure_name}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Procedure Price</div>
              <div className="info-item__value">{formatCurrency(booking.procedure_price)}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Priority</div>
              <div className="info-item__value">
                <span className={`badge ${getPriorityBadge(booking.priority)}`}>
                  <span className="badge-dot"></span>
                  {booking.priority}
                </span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Status</div>
              <div className="info-item__value">
                <span className={`badge ${getStatusBadge(booking.status)}`}>
                  <span className="badge-dot"></span>
                  {booking.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Requested Date</div>
              <div className="info-item__value">{new Date(booking.requested_date).toLocaleString()}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Theatre</div>
              <div className="info-item__value">{booking.theatre_number || "Unassigned"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Primary Surgeon</div>
              <div className="info-item__value">{booking.primary_surgeon_name || "Unassigned"}</div>
            </div>
            <div className="info-item" style={{ gridColumn: "span 2" }}>
              <div className="info-item__label">Diagnosis</div>
              <div className="info-item__value">{booking.diagnosis || "—"}</div>
            </div>
            <div className="info-item" style={{ gridColumn: "span 2" }}>
              <div className="info-item__label">Pre-op Notes</div>
              <div className="info-item__value">{booking.pre_op_notes || "—"}</div>
            </div>
            {booking.cancellation_reason && (
              <div className="info-item" style={{ gridColumn: "span 2" }}>
                <div className="info-item__label">Cancellation Reason</div>
                <div className="info-item__value" style={{ color: "var(--danger)" }}>{booking.cancellation_reason}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {canStart && (
        <>
          <div className="card" style={{ marginBottom: "var(--space-6)" }}>
            <div className="card-header">
              <h5 className="card-title">
                <i className="bi bi-play-circle me-2"></i> Start Surgery
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleStart}>
                <div className="field-row">
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="field-label">Select Theatre <span className="required">*</span></label>
                    <select className="select" value={selectedTheatre} onChange={(e) => setSelectedTheatre(e.target.value)} required>
                      <option value="">Select theatre</option>
                      {theatres.map((t) => <option key={t.id} value={t.id}>{t.theatre_number}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                    <button type="submit" className="btn btn-success">
                      <i className="bi bi-play-circle me-2"></i> Start Surgery
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="card-title">
                <i className="bi bi-x-circle me-2"></i> Cancel Booking
              </h5>
            </div>
            <div className="card-body">
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Reason</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Reason for cancellation"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                  <button className="btn btn-danger" onClick={handleCancel}>
                    <i className="bi bi-x-circle me-2"></i> Cancel Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}