import { useEffect, useState } from "react";
import { getLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from "../../services/api";

export default function LeaveRequests() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getLeaveRequests(params);
      setRequests(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    try {
      await approveLeaveRequest(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const submitRejection = async (id) => {
    try {
      await rejectLeaveRequest(id, { rejection_reason: rejectionReason });
      setRejectingId(null);
      setRejectionReason("");
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Leave Requests</h1>
      {error && <p>Error: {error}</p>}

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead>
            <tr><th>Employee</th><th>Leave Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th><th>Reason</th><th></th></tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.employee_name}</td><td>{r.leave_type_name}</td>
                <td>{r.start_date}</td><td>{r.end_date}</td><td>{r.days_requested}</td>
                <td>{r.status}</td><td>{r.reason || "—"}</td>
                <td>
                  {r.status === "PENDING" && (
                    <>
                      <button type="button" onClick={() => handleApprove(r.id)}>Approve</button>{" "}
                      {rejectingId === r.id ? (
                        <>
                          <input type="text" placeholder="Reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                          <button type="button" onClick={() => submitRejection(r.id)}>Confirm</button>
                          <button type="button" onClick={() => setRejectingId(null)}>Cancel</button>
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
      )}
      {!loading && requests.length === 0 && <p>No leave requests found.</p>}
    </div>
  );
}