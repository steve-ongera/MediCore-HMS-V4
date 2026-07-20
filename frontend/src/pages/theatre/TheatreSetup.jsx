import { useEffect, useState } from "react";
import { getOperatingTheatres, getSurgicalProcedureCatalog } from "../../services/api";
import client from "../../services/api";

export default function TheatreSetup() {
  const [theatres, setTheatres] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [error, setError] = useState("");

  const [theatreForm, setTheatreForm] = useState({ theatre_number: "", hourly_rate: "" });
  const [procForm, setProcForm] = useState({ code: "", name: "", base_price: "", estimated_duration_minutes: "60" });

  useEffect(() => { loadTheatres(); loadProcedures(); }, []);

  const loadTheatres = async () => {
    try {
      const data = await getOperatingTheatres();
      setTheatres(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadProcedures = async () => {
    try {
      const data = await getSurgicalProcedureCatalog();
      setProcedures(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const submitTheatre = async (e) => {
    e.preventDefault();
    try {
      await client.post("/operating-theatres/", {
        theatre_number: theatreForm.theatre_number,
        hourly_rate: Number(theatreForm.hourly_rate),
      });
      setTheatreForm({ theatre_number: "", hourly_rate: "" });
      loadTheatres();
    } catch (err) { setError(err.message); }
  };

  const submitProcedure = async (e) => {
    e.preventDefault();
    try {
      await client.post("/surgical-procedure-catalog/", {
        code: procForm.code, name: procForm.name,
        base_price: Number(procForm.base_price),
        estimated_duration_minutes: Number(procForm.estimated_duration_minutes),
      });
      setProcForm({ code: "", name: "", base_price: "", estimated_duration_minutes: "60" });
      loadProcedures();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Theatres & Procedures Setup</h1>
      {error && <p>Error: {error}</p>}

      <h2>Add Theatre</h2>
      <form onSubmit={submitTheatre}>
        <input type="text" placeholder="Theatre Number" value={theatreForm.theatre_number} onChange={(e) => setTheatreForm((p) => ({ ...p, theatre_number: e.target.value }))} required />
        <input type="number" placeholder="Hourly Rate (KES)" value={theatreForm.hourly_rate} onChange={(e) => setTheatreForm((p) => ({ ...p, hourly_rate: e.target.value }))} required />
        <button type="submit">Add Theatre</button>
      </form>
      <table>
        <thead><tr><th>Theatre</th><th>Hourly Rate</th><th>Status</th></tr></thead>
        <tbody>
          {theatres.map((t) => <tr key={t.id}><td>{t.theatre_number}</td><td>KES {t.hourly_rate}</td><td>{t.status}</td></tr>)}
        </tbody>
      </table>

      <h2>Add Procedure</h2>
      <form onSubmit={submitProcedure}>
        <input type="text" placeholder="Code" value={procForm.code} onChange={(e) => setProcForm((p) => ({ ...p, code: e.target.value }))} required />
        <input type="text" placeholder="Name" value={procForm.name} onChange={(e) => setProcForm((p) => ({ ...p, name: e.target.value }))} required />
        <input type="number" placeholder="Base Price (KES)" value={procForm.base_price} onChange={(e) => setProcForm((p) => ({ ...p, base_price: e.target.value }))} required />
        <input type="number" placeholder="Estimated duration (min)" value={procForm.estimated_duration_minutes} onChange={(e) => setProcForm((p) => ({ ...p, estimated_duration_minutes: e.target.value }))} />
        <button type="submit">Add Procedure</button>
      </form>
      <table>
        <thead><tr><th>Code</th><th>Name</th><th>Base Price</th><th>Est. Duration</th></tr></thead>
        <tbody>
          {procedures.map((p) => <tr key={p.id}><td>{p.code}</td><td>{p.name}</td><td>KES {p.base_price}</td><td>{p.estimated_duration_minutes} min</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}