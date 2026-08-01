import { useEffect, useState } from "react";
import { getRefunds, approveRefund, rejectRefund, getPayments } from "../../services/api";

export default function RefundsManagement() {
  const [refunds, setRefunds] = useState([]);
  const [statusFilter, setStatusFilter] = useState("REQUESTED");
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getRefunds(params);
      setRefunds(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Approve and process this refund immediately?")) return;
    try { await approveRefund(id); load(); } catch (err) { setError(err.message); }
  };

  const submitReject = async (id) => {
    try {
      await rejectRefund(id, { rejection_reason: rejectionReason });
      setRejectingId(null);
      setRejectionReason("");
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Refunds</h1>
      {error && <p>Error: {error}</p>}

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="REQUESTED">Requested</option>
        <option value="APPROVED">Approved</option>
        <option value="PROCESSED">Processed</option>
        <option value="REJECTED">Rejected</option>
      </select>

      <table>
        <thead><tr><th>Refund #</th><th>Patient</th><th>Receipt #</th><th>Amount</th><th>Reason</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {refunds.map((r) => (
            <tr key={r.id}>
              <td>{r.refund_number}</td><td>{r.patient_name}</td><td>{r.receipt_number}</td>
              <td>KES {r.amount}</td><td>{r.reason}</td><td>{r.status}</td>
              <td>
                {r.status === "REQUESTED" && (
                  <>
                    <button type="button" onClick={() => handleApprove(r.id)}>Approve & Process</button>{" "}
                    {rejectingId === r.id ? (
                      <>
                        <input type="text" placeholder="Reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                        <button type="button" onClick={() => submitReject(r.id)}>Confirm Reject</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setRejectingId(r.id)}>Reject</button>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {refunds.length === 0 && <p>No refunds found.</p>}
    </div>
  );
}