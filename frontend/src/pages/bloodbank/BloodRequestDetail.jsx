import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBloodRequest, getCompatibleUnits, issueBloodUnit, cancelBloodRequest } from "../../services/api";

export default function BloodRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [compatibleUnits, setCompatibleUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getBloodRequest(id);
      setRequest(data);
      if (data.status === "PENDING" || data.status === "CROSS_MATCHED") {
        const units = await getCompatibleUnits(id);
        setCompatibleUnits(units);
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleIssue = async (unitId) => {
    try {
      await issueBloodUnit(id, { unit: unitId });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this blood request?")) return;
    try {
      await cancelBloodRequest(id);
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div>Loading...</div>;
  if (!request) return null;

  const canIssue = request.status === "PENDING" || request.status === "CROSS_MATCHED";

  return (
    <div>
      <button type="button" onClick={() => navigate("/bloodbank/requests")}>&larr; Back</button>
      <h1>{request.request_number}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Patient: {request.patient_name} ({request.hospital_number})</p>
        <p>Blood Group: {request.patient_blood_group} — Component: {request.component_type}</p>
        <p>Units Requested: {request.units_requested} — Priority: {request.priority}</p>
        <p>Clinical Indication: {request.clinical_indication || "—"}</p>
        <p>Status: {request.status}</p>
        <p>Requested By: {request.requested_by_name} on {new Date(request.requested_at).toLocaleString()}</p>
        {canIssue && <button type="button" onClick={handleCancel}>Cancel Request</button>}
      </section>

      {canIssue && (
        <section>
          <h2>Compatible Available Units</h2>
          {compatibleUnits.length === 0 ? (
            <p>No compatible units currently available in stock.</p>
          ) : (
            <table>
              <thead><tr><th>Unit #</th><th>Blood Group</th><th>Component</th><th>Expiry</th><th>Price</th><th></th></tr></thead>
              <tbody>
                {compatibleUnits.map((u) => (
                  <tr key={u.id}>
                    <td>{u.unit_number}</td><td>{u.blood_group}</td><td>{u.component_type}</td>
                    <td>{u.expiry_date}</td><td>KES {u.unit_price}</td>
                    <td><button type="button" onClick={() => handleIssue(u.id)}>Issue This Unit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section>
        <h2>Units Issued</h2>
        {request.issues.length === 0 ? <p>No units issued yet.</p> : (
          <table>
            <thead><tr><th>Unit #</th><th>Blood Group</th><th>Issued By</th><th>Issued At</th></tr></thead>
            <tbody>
              {request.issues.map((iss) => (
                <tr key={iss.id}>
                  <td>{iss.unit_number}</td><td>{iss.unit_blood_group}</td>
                  <td>{iss.issued_by_name}</td><td>{new Date(iss.issued_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}