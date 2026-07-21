import { useEffect, useState } from "react";
import { getBloodInventory, getExpiringSoonUnits } from "../../services/api";

export default function BloodInventory() {
  const [inventory, setInventory] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [inv, exp] = await Promise.all([getBloodInventory(), getExpiringSoonUnits()]);
      setInventory(inv);
      setExpiring(exp);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>Blood Bank Inventory</h1>
      {error && <p>Error: {error}</p>}
      <button type="button" onClick={load}>Refresh</button>

      <h2>Available Stock by Blood Group / Component</h2>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Blood Group</th><th>Component</th><th>Units Available</th></tr></thead>
          <tbody>
            {inventory.map((row, i) => (
              <tr key={i}>
                <td>{row.blood_group}</td><td>{row.component_type}</td><td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && inventory.length === 0 && <p>No available units in stock.</p>}

      <h2>Expiring Within 7 Days</h2>
      <table>
        <thead><tr><th>Unit #</th><th>Blood Group</th><th>Component</th><th>Expiry Date</th><th>Days Left</th></tr></thead>
        <tbody>
          {expiring.map((u) => (
            <tr key={u.id}>
              <td>{u.unit_number}</td><td>{u.blood_group}</td><td>{u.component_type}</td>
              <td>{u.expiry_date}</td><td>{u.days_until_expiry}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {expiring.length === 0 && <p>No units expiring soon.</p>}
    </div>
  );
}