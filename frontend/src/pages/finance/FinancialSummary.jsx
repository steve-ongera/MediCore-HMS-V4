import { useEffect, useState } from "react";
import { getFinancialSummary } from "../../services/api";

export default function FinancialSummary() {
  const [summary, setSummary] = useState(null);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFinancialSummary({ date_from: dateFrom, date_to: dateTo });
      setSummary(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>Financial Summary</h1>
      {error && <p>Error: {error}</p>}

      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

      {loading || !summary ? <p>Loading...</p> : (
        <>
          <div>
            <p>Total Revenue: KES {summary.total_revenue}</p>
            <p>Total Expenses: KES {summary.total_expenses}</p>
            <p>Net Income: KES {summary.net_income}</p>
            <p>Outstanding Receivables: KES {summary.outstanding_receivables}</p>
          </div>

          <h2>Chart of Accounts Balances</h2>
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Balance</th></tr></thead>
            <tbody>
              {summary.accounts.map((a) => (
                <tr key={a.code}>
                  <td>{a.code}</td><td>{a.name}</td><td>{a.type}</td><td>KES {a.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}