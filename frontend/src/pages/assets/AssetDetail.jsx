import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAsset, getDepartments, getUsers, transferAsset, disposeAsset,
  createAssetMaintenance, completeAssetMaintenance,
} from "../../services/api";

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [asset, setAsset] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [transferForm, setTransferForm] = useState({ to_department: "", to_custodian: "", reason: "" });
  const [disposeForm, setDisposeForm] = useState({ disposal_date: "", disposal_method: "SOLD", disposal_value: "0", reason: "" });
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_type: "PREVENTIVE", scheduled_date: "", vendor: "", cost: "", description: "",
  });

  useEffect(() => {
    load();
    loadDepartments();
    loadUsers();
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAsset(id);
      setAsset(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleTransferChange = (f) => (e) => setTransferForm((p) => ({ ...p, [f]: e.target.value }));
  const submitTransfer = async (e) => {
    e.preventDefault();
    try {
      await transferAsset(id, {
        to_department: transferForm.to_department || undefined,
        to_custodian: transferForm.to_custodian || undefined,
        reason: transferForm.reason,
      });
      setTransferForm({ to_department: "", to_custodian: "", reason: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleDisposeChange = (f) => (e) => setDisposeForm((p) => ({ ...p, [f]: e.target.value }));
  const submitDispose = async (e) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to dispose this asset? This cannot be undone.")) return;
    try {
      await disposeAsset(id, { ...disposeForm, disposal_value: Number(disposeForm.disposal_value) });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleMaintenanceChange = (f) => (e) => setMaintenanceForm((p) => ({ ...p, [f]: e.target.value }));
  const submitMaintenance = async (e) => {
    e.preventDefault();
    try {
      await createAssetMaintenance({
        asset: id, ...maintenanceForm,
        cost: maintenanceForm.cost || undefined,
      });
      setMaintenanceForm({ maintenance_type: "PREVENTIVE", scheduled_date: "", vendor: "", cost: "", description: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCompleteMaintenance = async (maintenanceId) => {
    try {
      await completeAssetMaintenance(maintenanceId);
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div>Loading...</div>;
  if (!asset) return null;

  const isDisposed = asset.status === "DISPOSED";

  return (
    <div>
      <button type="button" onClick={() => navigate("/assets")}>&larr; Back</button>
      <h1>{asset.asset_tag} — {asset.name}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Category: {asset.category_name}</p>
        <p>Serial #: {asset.serial_number || "—"} — Manufacturer: {asset.manufacturer || "—"} — Model: {asset.model_number || "—"}</p>
        <p>Supplier: {asset.supplier_name || "—"}</p>
        <p>Purchase Date: {asset.purchase_date || "—"} — Purchase Cost: KES {asset.purchase_cost}</p>
        <p>Useful Life: {asset.effective_useful_life_years} years — Salvage Value: KES {asset.salvage_value}</p>
        <p>Current Value (depreciated): KES {asset.current_value}</p>
        <p>Warranty Expiry: {asset.warranty_expiry || "—"} ({asset.is_under_warranty ? "Under warranty" : "Expired/none"})</p>
        <p>Department: {asset.department_name || "—"} — Location: {asset.location_notes || "—"}</p>
        <p>Assigned To: {asset.assigned_to_name || "Unassigned"}</p>
        <p>Status: {asset.status} — Condition: {asset.condition}</p>
      </section>

      {!isDisposed && (
        <section>
          <h2>Transfer Asset</h2>
          <form onSubmit={submitTransfer}>
            <select value={transferForm.to_department} onChange={handleTransferChange("to_department")}>
              <option value="">Keep current department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={transferForm.to_custodian} onChange={handleTransferChange("to_custodian")}>
              <option value="">Unassign custodian</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
            <input type="text" placeholder="Reason" value={transferForm.reason} onChange={handleTransferChange("reason")} />
            <button type="submit">Transfer</button>
          </form>
        </section>
      )}

      <section>
        <h2>Transfer History</h2>
        <table>
          <thead><tr><th>From Dept</th><th>To Dept</th><th>From Custodian</th><th>To Custodian</th><th>Reason</th><th>Date</th></tr></thead>
          <tbody>
            {(asset.transfers || []).map((t) => (
              <tr key={t.id}>
                <td>{t.from_department_name || "—"}</td><td>{t.to_department_name || "—"}</td>
                <td>{t.from_custodian_name || "—"}</td><td>{t.to_custodian_name || "—"}</td>
                <td>{t.reason}</td><td>{new Date(t.transferred_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {!isDisposed && (
        <section>
          <h2>Log Maintenance</h2>
          <form onSubmit={submitMaintenance}>
            <select value={maintenanceForm.maintenance_type} onChange={handleMaintenanceChange("maintenance_type")}>
              <option value="PREVENTIVE">Preventive</option>
              <option value="CORRECTIVE">Corrective / Repair</option>
              <option value="CALIBRATION">Calibration</option>
              <option value="INSPECTION">Inspection</option>
            </select>
            <input type="date" value={maintenanceForm.scheduled_date} onChange={handleMaintenanceChange("scheduled_date")} required />
            <input type="text" placeholder="Vendor" value={maintenanceForm.vendor} onChange={handleMaintenanceChange("vendor")} />
            <input type="number" placeholder="Cost" value={maintenanceForm.cost} onChange={handleMaintenanceChange("cost")} />
            <textarea placeholder="Description" value={maintenanceForm.description} onChange={handleMaintenanceChange("description")} />
            <button type="submit">Log Maintenance</button>
          </form>
        </section>
      )}

      <section>
        <h2>Maintenance History</h2>
        <table>
          <thead><tr><th>Type</th><th>Status</th><th>Scheduled</th><th>Completed</th><th>Vendor</th><th>Cost</th><th></th></tr></thead>
          <tbody>
            {(asset.maintenance_records || []).map((m) => (
              <tr key={m.id}>
                <td>{m.maintenance_type}</td><td>{m.status}</td>
                <td>{m.scheduled_date || "—"}</td><td>{m.completed_date || "—"}</td>
                <td>{m.vendor || "—"}</td><td>{m.cost ? `KES ${m.cost}` : "—"}</td>
                <td>
                  {(m.status === "SCHEDULED" || m.status === "IN_PROGRESS") && (
                    <button type="button" onClick={() => handleCompleteMaintenance(m.id)}>Mark Complete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {!isDisposed ? (
        <section>
          <h2>Dispose Asset</h2>
          <form onSubmit={submitDispose}>
            <input type="date" value={disposeForm.disposal_date} onChange={handleDisposeChange("disposal_date")} required />
            <select value={disposeForm.disposal_method} onChange={handleDisposeChange("disposal_method")}>
              <option value="SOLD">Sold</option>
              <option value="SCRAPPED">Scrapped</option>
              <option value="DONATED">Donated</option>
              <option value="LOST">Lost</option>
              <option value="STOLEN">Stolen</option>
              <option value="TRADE_IN">Traded In</option>
            </select>
            <input type="number" placeholder="Disposal value (if sold/traded)" value={disposeForm.disposal_value} onChange={handleDisposeChange("disposal_value")} />
            <textarea placeholder="Reason" value={disposeForm.reason} onChange={handleDisposeChange("reason")} />
            <button type="submit">Dispose Asset</button>
          </form>
        </section>
      ) : (
        <section>
          <h2>Disposal Record</h2>
          <p>Date: {asset.disposal.disposal_date}</p>
          <p>Method: {asset.disposal.disposal_method}</p>
          <p>Value: KES {asset.disposal.disposal_value}</p>
          <p>Reason: {asset.disposal.reason || "—"}</p>
        </section>
      )}
    </div>
  );
}