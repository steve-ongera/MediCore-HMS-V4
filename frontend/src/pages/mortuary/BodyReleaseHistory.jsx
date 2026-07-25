import { useEffect, useState } from "react";
import { getMortuaryCases } from "../../services/api";

export default function BodyReleaseHistory() {
  const [cases, setCases] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try { const data = await getMortuaryCases({ status: "RELEASED", page_size: 100 }); setCases(data.results ?? data); }
      catch (err) { setError(err.message); }
    })();
  }, []);

  return (
    <div>
      <h1>Body Release History</h1>
      {error && <p>Error: {error}</p>}
      <table><thead><tr><th>Case #</th><th>Deceased</th><th>Admitted</th></tr></thead>
        <tbody>{cases.map((c) => (<tr key={c.id}><td>{c.case_number}</td><td>{c.deceased_display_name}</td><td>{new Date(c.admitted_at).toLocaleString()}</td></tr>))}</tbody>
      </table>
      {cases.length === 0 && <p>No released cases yet.</p>}
    </div>
  );
}