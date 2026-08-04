import { useEffect, useState } from "react";
import { getServiceContracts, createServiceContract, getExpiringSoonContracts, getEquipment } from "../../services/api";

export default function ServiceContracts() {
  const [contracts, setContracts] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    contract_number: "", vendor_name: "", vendor_contact: "", equipment: [],
    start_date: "", end_date: "", coverage_details: "", annual_cost: "",
  });

  useEffect(() => { load(); loadExpiring(); loadEquipment(); }, []);

  const load = async () => {
    try { const data = await getServiceContracts({ page_size: 100 }); setContracts(data.results ?? data); } catch (err) { setError(err.message); }
  };
  const loadExpiring = async () => {
    try { const data = await getExpiringSoonContracts(); setExpiring(data); } catch (err) { setError(err.message); }
  };
  const loadEquipment = async () => {
    try { const data = await getEquipment({ page_size: 300 }); setEquipmentList(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const toggleEquipment = (id) => {
    setForm((p) => ({
      ...p,
      equipment: p.equipment.includes(id) ? p.equipment.filter((x) => x !== id) : [...p.equipment, id],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createServiceContract({ ...form, annual_cost: form.annual_cost || undefined });
      setForm({ contract_number: "", vendor_name: "", vendor_contact: "", equipment: [], start_date: "", end_date: "", coverage_details: "", annual_cost: "" });
      load(); loadExpiring();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Service Contracts</h1>
      {error && <p>Error: {error}</p>}

      <h2>Expiring Soon ({expiring.length})</h2>
      {expiring.length > 0 && (
        <table>
          <thead><tr><th>Contract #</th><th>Vendor</th><th>End Date</th></tr></thead>
          <tbody>{expiring.map((c) => (<tr key={c.id} style={{ background: "#fee" }}><td>{c.contract_number}</td><td>{c.vendor_name}</td><td>{c.end_date}</td></tr>))}</tbody>
        </table>
      )}

      <h2>Add Service Contract</h2>
      <form onSubmit={submit}>
        <input type="text" placeholder="Contract Number" value={form.contract_number} onChange={(e) => setForm((p) => ({ ...p, contract_number: e.target.value }))} required />
        <input type="text" placeholder="Vendor Name" value={form.vendor_name} onChange={(e) => setForm((p) => ({ ...p, vendor_name: e.target.value }))} required />
        <input type="text" placeholder="Vendor Contact" value={form.vendor_contact} onChange={(e) => setForm((p) => ({ ...p, vendor_contact: e.target.value }))} />
        <label>Start Date</label>
        <input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} required />
        <label>End Date</label>
        <input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} required />
        <input type="number" placeholder="Annual Cost" value={form.annual_cost} onChange={(e) => setForm((p) => ({ ...p, annual_cost: e.target.value }))} />
        <textarea placeholder="Coverage details" value={form.coverage_details} onChange={(e) => setForm((p) => ({ ...p, coverage_details: e.target.value }))} />

        <h3>Covered Equipment</h3>
        <div style={{ maxHeight: 150, overflowY: "auto" }}>
          {equipmentList.map((eq) => (
            <label key={eq.id} style={{ display: "block" }}>
              <input type="checkbox" checked={form.equipment.includes(eq.id)} onChange={() => toggleEquipment(eq.id)} /> {eq.asset_tag} - {eq.name}
            </label>
          ))}
        </div>
        <button type="submit">Add Contract</button>
      </form>

      <h2>All Contracts</h2>
      <table>
        <thead><tr><th>Contract #</th><th>Vendor</th><th>Equipment Covered</th><th>Start</th><th>End</th><th>Annual Cost</th></tr></thead>
        <tbody>
          {contracts.map((c) => (
            <tr key={c.id} style={{ background: c.is_expiring_soon ? "#ffe" : "inherit" }}>
              <td>{c.contract_number}</td><td>{c.vendor_name}</td>
              <td>{c.equipment_names.join(", ")}</td>
              <td>{c.start_date}</td><td>{c.end_date}</td>
              <td>{c.annual_cost ? `KES ${c.annual_cost}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}