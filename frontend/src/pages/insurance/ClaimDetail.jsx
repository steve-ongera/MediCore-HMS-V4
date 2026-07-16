import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInsuranceClaim, submitInsuranceClaim, applyClaimResponse, settleInsuranceClaim, cancelInsuranceClaim } from "../../services/api";

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [responseForm, setResponseForm] = useState({ status: "APPROVED", approved_amount: "", rejection_reason: "" });
  const [itemApprovals, setItemApprovals] = useState({});

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInsuranceClaim(id);
      setClaim(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleSubmitClaim = async () => {
    try {
      await submitInsuranceClaim(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCancel = async () => {
    try {
      await cancelInsuranceClaim(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleItemApprovalChange = (itemId) => (e) => {
    setItemApprovals((p) => ({ ...p, [itemId]: e.target.value }));
  };

  const handleApplyResponse = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        status: responseForm.status,
        rejection_reason: responseForm.rejection_reason,
      };
      const filledItems = Object.fromEntries(
        Object.entries(itemApprovals).filter(([, v]) => v !== "" && v !== undefined)
      );
      if (Object.keys(filledItems).length > 0) {
        payload.item_approvals = filledItems;
      } else if (responseForm.approved_amount) {
        payload.approved_amount = parseFloat(responseForm.approved_amount);
      }
      await applyClaimResponse(id, payload);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleSettle = async () => {
    try {
      const result = await settleInsuranceClaim(id);
      alert(`Settled — ${result.payments_created} payment(s) created.`);
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div>Loading...</div>;
  if (!claim) return null;

  return (
    <div>
      <button type="button" onClick={() => navigate("/insurance/claims")}>&larr; Back</button>
      <h1>{claim.claim_number}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Patient: {claim.patient_name} ({claim.hospital_number})</p>
        <p>Insurer: {claim.insurer_name} — Member #: {claim.member_number}</p>
        <p>Status: {claim.status}</p>
        <p>Total Claimed: KES {claim.total_claimed} — Total Approved: KES {claim.total_approved}</p>
        {claim.gateway_reference && <p>Gateway Reference: {claim.gateway_reference}</p>}
        {claim.rejection_reason && <p>Rejection Reason: {claim.rejection_reason}</p>}
        <p>Notes: {claim.notes || "—"}</p>
      </section>

      <section>
        <h2>Claim Items</h2>
        <table>
          <thead><tr><th>Invoice #</th><th>Description</th><th>Type</th><th>Claimed</th><th>Approved</th></tr></thead>
          <tbody>
            {claim.items.map((item) => (
              <tr key={item.id}>
                <td>{item.invoice_number}</td>
                <td>{item.invoice_description}</td>
                <td>{item.invoice_source_type}</td>
                <td>KES {item.amount_claimed}</td>
                <td>KES {item.amount_approved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {claim.status === "DRAFT" && (
        <section>
          <button type="button" onClick={handleSubmitClaim}>Submit Claim</button>{" "}
          <button type="button" onClick={handleCancel}>Cancel Claim</button>
        </section>
      )}

      {(claim.status === "SUBMITTED" || claim.status === "UNDER_REVIEW") && (
        <section>
          <h2>Record Insurer Response</h2>
          <form onSubmit={handleApplyResponse}>
            <select value={responseForm.status} onChange={(e) => setResponseForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="APPROVED">Approved</option>
              <option value="PARTIALLY_APPROVED">Partially Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {responseForm.status !== "REJECTED" && (
              <>
                <p>Per-item approved amounts (optional, more accurate):</p>
                {claim.items.map((item) => (
                  <div key={item.id}>
                    <label>{item.invoice_number} (claimed KES {item.amount_claimed})</label>
                    <input type="number" placeholder="Approved amount" value={itemApprovals[item.id] || ""} onChange={handleItemApprovalChange(item.id)} />
                  </div>
                ))}
                <p>Or just enter total approved amount:</p>
                <input type="number" placeholder="Total approved amount" value={responseForm.approved_amount} onChange={(e) => setResponseForm((p) => ({ ...p, approved_amount: e.target.value }))} />
              </>
            )}

            {responseForm.status === "REJECTED" && (
              <textarea placeholder="Rejection reason" value={responseForm.rejection_reason} onChange={(e) => setResponseForm((p) => ({ ...p, rejection_reason: e.target.value }))} />
            )}

            <button type="submit">Record Response</button>
          </form>
          <button type="button" onClick={handleCancel}>Cancel Claim</button>
        </section>
      )}

      {(claim.status === "APPROVED" || claim.status === "PARTIALLY_APPROVED") && (
        <section>
          <h2>Settlement</h2>
          <button type="button" onClick={handleSettle}>Settle Claim (Create Payments)</button>
        </section>
      )}
    </div>
  );
}