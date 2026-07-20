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

  if (loading) return <div>Loading...</div>;
  if (!booking) return null;

  const canStart = booking.status === "REQUESTED" || booking.status === "CONFIRMED";

  return (
    <div>
      <button type="button" onClick={() => navigate("/theatre")}>&larr; Back</button>
      <h1>{booking.booking_number}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Patient: {booking.patient_name} ({booking.hospital_number})</p>
        <p>Procedure: {booking.procedure_name} (KES {booking.procedure_price})</p>
        <p>Priority: {booking.priority} — Status: {booking.status}</p>
        <p>Requested Date: {new Date(booking.requested_date).toLocaleString()}</p>
        <p>Theatre: {booking.theatre_number || "Unassigned"}</p>
        <p>Primary Surgeon: {booking.primary_surgeon_name || "Unassigned"}</p>
        <p>Diagnosis: {booking.diagnosis || "—"}</p>
        <p>Pre-op Notes: {booking.pre_op_notes || "—"}</p>
        {booking.cancellation_reason && <p>Cancellation Reason: {booking.cancellation_reason}</p>}
      </section>

      {canStart && (
        <>
          <section>
            <h2>Start Surgery</h2>
            <form onSubmit={handleStart}>
              <select value={selectedTheatre} onChange={(e) => setSelectedTheatre(e.target.value)} required>
                <option value="">Select theatre</option>
                {theatres.map((t) => <option key={t.id} value={t.id}>{t.theatre_number}</option>)}
              </select>
              <button type="submit">Start Surgery</button>
            </form>
          </section>

          <section>
            <h2>Cancel Booking</h2>
            <input type="text" placeholder="Reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            <button type="button" onClick={handleCancel}>Cancel Booking</button>
          </section>
        </>
      )}
    </div>
  );
}