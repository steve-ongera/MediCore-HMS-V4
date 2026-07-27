import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStockTransfer, approveStockTransfer, dispatchStockTransfer, receiveStockTransfer } from "../../services/api";

export default function StockTransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const data = await getStockTransfer(id);
      setTransfer(data);
      const initial = {};
      data.items.forEach((it) => { initial[it.id] = it.quantity_requested; });
      setQuantities(initial);
    } catch (err) { setError(err.message); }
  };

  const handleApprove = async () => {
    try { await approveStockTransfer(id); load(); } catch (err) { setError(err.message); }
  };

  const handleDispatch = async () => {
    try { await dispatchStockTransfer(id, { quantities }); load(); } catch (err) { setError(err.message); }
  };

  const handleReceive = async () => {
    try { await receiveStockTransfer(id, { quantities }); load(); } catch (err) { setError(err.message); }
  };

  if (!transfer) return <div>Loading...</div>;

  return (
    <div>
      <button type="button" onClick={() => navigate("/stockcontrol/transfers")}>&larr; Back</button>
      <h1>{transfer.transfer_number}</h1>
      {error && <p>Error: {error}</p>}
      {transfer.status === "DISCREPANCY" && <p style={{ color: "red", fontWeight: "bold" }}>⚠ DISCREPANCY — dispatched and received quantities do not match. Investigate immediately.</p>}

      <p>From: {transfer.from_location_name} → To: {transfer.to_location_name}</p>
      <p>Status: {transfer.status}</p>
      <p>Requested by: {transfer.requested_by_name}</p>
      {transfer.approved_by_name && <p>Approved by: {transfer.approved_by_name}</p>}
      {transfer.dispatched_by_name && <p>Dispatched by: {transfer.dispatched_by_name}</p>}
      {transfer.received_by_name && <p>Received by: {transfer.received_by_name}</p>}

      <table>
        <thead><tr><th>Medicine</th><th>Requested</th><th>Dispatched</th><th>Received</th><th>Discrepancy?</th></tr></thead>
        <tbody>
          {transfer.items.map((it) => (
            <tr key={it.id} style={{ background: it.has_discrepancy ? "#fee" : "inherit" }}>
              <td>{it.medicine_name}</td>
              <td>{it.quantity_requested}</td>
              <td>
                {transfer.status === "APPROVED" ? (
                  <input type="number" value={quantities[it.id] ?? ""} onChange={(e) => setQuantities((p) => ({ ...p, [it.id]: Number(e.target.value) }))} />
                ) : (it.quantity_dispatched ?? "—")}
              </td>
              <td>
                {transfer.status === "DISPATCHED" ? (
                  <input type="number" value={quantities[it.id] ?? ""} onChange={(e) => setQuantities((p) => ({ ...p, [it.id]: Number(e.target.value) }))} />
                ) : (it.quantity_received ?? "—")}
              </td>
              <td>{it.has_discrepancy ? "YES" : it.quantity_received != null ? "No" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {transfer.status === "REQUESTED" && <button type="button" onClick={handleApprove}>Approve Transfer</button>}
      {transfer.status === "APPROVED" && <button type="button" onClick={handleDispatch}>Confirm Dispatch (what actually left)</button>}
      {transfer.status === "DISPATCHED" && <button type="button" onClick={handleReceive}>Confirm Receipt (what actually arrived)</button>}
    </div>
  );
}