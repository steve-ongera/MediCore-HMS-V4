import { useEffect, useState } from "react";
import { getLeakageDashboard, scanForLeaksNow } from "../../services/api";

const SOURCE_LABELS = {
  LAB: "Laboratory", RADIOLOGY: "Radiology", PHARMACY_DISPENSE: "Pharmacy",
  CONSULTATION_PROCEDURE: "Consultation Procedures", THEATRE: "Theatre",
  DENTAL: "Dental", EYE_CLINIC: "Eye Clinic", MCH_DELIVERY: "MCH Delivery",
  MCH_IMMUNIZATION: "Immunization", DIALYSIS: "Dialysis", ICU_PROCEDURE: "ICU",
  BLOOD_BANK: "Blood Bank", AMBULANCE: "Ambulance", MORTUARY: "Mortuary",
};

export default function RevenueLeakageDashboard() {
  const [data, setData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setError("");
    try {
      const result = await getLeakageDashboard();
      setData(result);
    } catch (err) { setError(err.message); }
  };

  const handleScanNow = async () => {
    setScanning(true);
    setError("");
    try {
      await scanForLeaksNow();
      load();
    } catch (err) { setError(err.message); } finally { setScanning(false); }
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h1>Revenue Leakage Detection</h1>
      <p>Automatically catches services performed (lab tests, medicines dispensed, procedures done) that never made it onto a bill.</p>
      {error && <p>Error: {error}</p>}

      <button type="button" onClick={handleScanNow} disabled={scanning}>
        {scanning ? "Scanning..." : "Scan Now"}
      </button>{" "}
      <button type="button" onClick={load}>Refresh</button>

      {data.last_scan && (
        <p>Last scan: {new Date(data.last_scan.started_at).toLocaleString()} — found {data.last_scan.new_leaks_found} new leak(s)</p>
      )}

      <h2>Revenue Leakage Today</h2>
      <h3 style={{ color: "red" }}>Total Lost Today: KES {data.today_total_leaked}</h3>
      <p>{data.today_leak_count} unbilled event(s) today</p>

      <h3>Missing Bills by Source (Today)</h3>
      <table>
        <thead><tr><th>Source</th><th>Count</th><th>Amount Lost</th></tr></thead>
        <tbody>
          {data.by_source_today.map((s) => (
            <tr key={s.name}>
              <td>{SOURCE_LABELS[s.name] || s.name}</td>
              <td>{s.count}</td>
              <td style={{ color: "red", fontWeight: "bold" }}>KES {s.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.by_source_today.length === 0 && <p>No leakage detected today. 🎉</p>}

      <h2>All-Time Open Leakage</h2>
      <h3 style={{ color: "red" }}>KES {data.all_time_open_total}</h3>
      <p>{data.all_time_open_count} unresolved leak(s) system-wide</p>

      <h2>Last 7 Days Trend</h2>
      <table>
        <thead><tr><th>Date</th><th>Amount Leaked</th></tr></thead>
        <tbody>
          {data.trend_7_days.map((t) => (
            <tr key={t.name}><td>{t.name}</td><td>KES {t.value.toLocaleString()}</td></tr>
          ))}
        </tbody>
      </table>

      <p><a href="/leakage/records">View & Resolve Individual Leaks →</a></p>
    </div>
  );
}