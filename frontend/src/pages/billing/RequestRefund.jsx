import { useEffect, useState } from "react";
import { getPayments, requestRefund, getRefunds } from "../../services/api";
import { useAuth } from "../../context/AuthContext.jsx";

export default function RequestRefund() {
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    loadMyRequests();
  }, []);

  const loadMyRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await getRefunds({ page_size: 100 });
      const all = data.results ?? data;
      setMyRequests(all.filter((r) => r.requested_by === user?.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setError("");
    try {
      const data = await getPayments({ search, page_size: 20 });
      setPayments(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const selectPayment = (payment) => {
    setSelectedPayment(payment);
    setPayments([]);
    setSearch("");
    setAmount(payment.amount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedPayment) {
      setError("Select the payment you're requesting a refund for.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Enter a valid refund amount.");
      return;
    }
    if (parseFloat(amount) > parseFloat(selectedPayment.amount)) {
      setError(`Refund amount cannot exceed the original payment (KES ${selectedPayment.amount}).`);
      return;
    }
    if (!reason.trim()) {
      setError("Please explain why this refund is needed.");
      return;
    }
    setSubmitting(true);
    try {
      await requestRefund({
        payment: selectedPayment.id,
        amount: parseFloat(amount),
        reason,
      });
      setSuccess("Refund request submitted. An accountant or super admin must approve it before it's processed.");
      setSelectedPayment(null);
      setAmount("");
      setReason("");
      loadMyRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Request Refund</h1>
      <p>Search for the original payment, specify how much to refund and why. Your request goes to an accountant or super admin for approval — nothing is refunded automatically.</p>
      {error && <p>Error: {error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}

      <h2>1. Find the Payment</h2>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by receipt #, invoice #, or patient name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {payments.length > 0 && (
        <table>
          <thead><tr><th>Receipt #</th><th>Invoice #</th><th>Patient</th><th>Amount</th><th>Method</th><th>Paid At</th><th></th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.receipt_number}</td><td>{p.invoice_number}</td><td>{p.patient_name}</td>
                <td>KES {p.amount}</td><td>{p.method}</td>
                <td>{new Date(p.paid_at).toLocaleString()}</td>
                <td><button type="button" onClick={() => selectPayment(p)}>Select</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedPayment && (
        <>
          <h2>2. Refund Details</h2>
          <p>
            Payment: <strong>{selectedPayment.receipt_number}</strong> — {selectedPayment.patient_name} —
            KES {selectedPayment.amount} ({selectedPayment.method})
          </p>
          <form onSubmit={handleSubmit}>
            <div>
              <label>Refund Amount (max KES {selectedPayment.amount})</label>
              <input
                type="number"
                max={selectedPayment.amount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Reason for Refund</label>
              <textarea
                placeholder="e.g. Overcharged, service not rendered, duplicate payment, patient dispute"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Refund Request"}
            </button>
            <button type="button" onClick={() => setSelectedPayment(null)}>Cancel</button>
          </form>
        </>
      )}

      <h2>My Refund Requests</h2>
      {loadingRequests ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Refund #</th><th>Receipt #</th><th>Patient</th><th>Amount</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>
            {myRequests.map((r) => (
              <tr key={r.id}>
                <td>{r.refund_number}</td><td>{r.receipt_number}</td><td>{r.patient_name}</td>
                <td>KES {r.amount}</td><td>{r.reason}</td>
                <td>{r.status} {r.status === "REJECTED" && r.rejection_reason ? `— ${r.rejection_reason}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loadingRequests && myRequests.length === 0 && <p>You haven't requested any refunds yet.</p>}
    </div>
  );
}