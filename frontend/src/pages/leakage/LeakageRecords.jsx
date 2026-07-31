import { useEffect, useState } from "react";
import { getLeakageRecords, resolveLeak, writeOffLeak } from "../../services/api";

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

  const totalOpenAmount = records
    .filter((r) => r.status === "OPEN")
    .reduce((sum, r) => sum + Number(r.expected_amount), 0);

  return (
    <div>
      <h1>Revenue Leakage Records</h1>
      {error && <p>Error: {error}</p>}

      <input type="text" placeholder="Search by patient" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All Statuses</option>
        <option value="OPEN">Open</option>
        <option value="RESOLVED">Resolved</option>
        <option value="WRITTEN_OFF">Written Off</option>
      </select>
      <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
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
      <button type="button" onClick={load}>Refresh</button>

      {statusFilter === "OPEN" && <h3 style={{ color: "red" }}>Total Open in View: KES {totalOpenAmount.toLocaleString()}</h3>}

      {loading ? <p>Loading...</p> : (
        <table>
          <thead>
            <tr><th>Source</th><th>Patient</th><th>Description</th><th>Amount</th><th>Event Date</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} style={{ background: r.status === "OPEN" ? "#fee" : "inherit" }}>
                <td>{r.source_type}</td>
                <td>{r.patient_name} ({r.hospital_number})</td>
                <td>{r.description}</td>
                <td>KES {r.expected_amount}</td>
                <td>{new Date(r.event_date).toLocaleString()}</td>
                <td>{r.status}</td>
                <td>
                  {r.status === "OPEN" && (
                    <>
                      <button type="button" onClick={() => handleResolve(r.id)}>Bill Now</button>{" "}
                      {writeOffId === r.id ? (
                        <>
                          <input type="text" placeholder="Reason" value={writeOffReason} onChange={(e) => setWriteOffReason(e.target.value)} />
                          <button type="button" onClick={() => submitWriteOff(r.id)}>Confirm Write-Off</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setWriteOffId(r.id)}>Write Off</button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && records.length === 0 && <p>No records match this filter.</p>}
    </div>
  );
}