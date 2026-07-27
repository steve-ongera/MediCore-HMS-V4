import { useEffect, useState } from "react";
import { getStoreLocations, createStoreLocation, getLocationStock, getUsers } from "../../services/api";

export default function StoreLocations() {
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [stock, setStock] = useState([]);
  const [form, setForm] = useState({ name: "", location_type: "WARD", custodian: "" });
  const [error, setError] = useState("");

  useEffect(() => { load(); loadUsers(); }, []);

  const load = async () => {
    try { const data = await getStoreLocations(); setLocations(data.results ?? data); } catch (err) { setError(err.message); }
  };
  const loadUsers = async () => {
    try { const data = await getUsers(); setUsers(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createStoreLocation(form);
      setForm({ name: "", location_type: "WARD", custodian: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const viewStock = async (loc) => {
    setSelectedLocation(loc);
    try { const data = await getLocationStock(loc.id); setStock(data); } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Store Locations</h1>
      {error && <p>Error: {error}</p>}

      <h2>Add Location</h2>
      <form onSubmit={submit}>
        <input placeholder="Name (e.g. Ambulance Bay 1, Maternity Ward)" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        <select value={form.location_type} onChange={(e) => setForm((p) => ({ ...p, location_type: e.target.value }))}>
          <option value="MAIN_PHARMACY">Main Pharmacy</option>
          <option value="WARD">Ward / Department</option>
          <option value="AMBULANCE">Ambulance</option>
          <option value="THEATRE">Theatre</option>
          <option value="EMERGENCY">Emergency Department</option>
          <option value="OTHER">Other</option>
        </select>
        <select value={form.custodian} onChange={(e) => setForm((p) => ({ ...p, custodian: e.target.value }))} required>
          <option value="">Select custodian</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <button type="submit">Add Location</button>
      </form>

      <h2>All Locations</h2>
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Custodian</th><th></th></tr></thead>
        <tbody>
          {locations.map((l) => (
            <tr key={l.id}>
              <td>{l.name}</td><td>{l.location_type}</td><td>{l.custodian_name}</td>
              <td><button type="button" onClick={() => viewStock(l)}>View Stock</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedLocation && (
        <div>
          <h2>Stock at {selectedLocation.name}</h2>
          <table>
            <thead><tr><th>Medicine</th><th>Qty on Hand</th></tr></thead>
            <tbody>{stock.map((s) => (<tr key={s.id}><td>{s.medicine_name}</td><td>{s.quantity_on_hand}</td></tr>))}</tbody>
          </table>
          {stock.length === 0 && <p>No stock recorded at this location.</p>}
        </div>
      )}
    </div>
  );
}