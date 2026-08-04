import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEquipment, getSuppliers } from "../../services/api";

export default function EquipmentForm() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "", category: "OTHER", manufacturer: "", model_number: "", serial_number: "",
    department: "", risk_class: "MEDIUM", supplier: "", purchase_date: "", purchase_cost: "",
    warranty_expiry: "", preventive_maintenance_interval_days: "90", calibration_interval_days: "",
  });

  useEffect(() => {
    (async () => {
      try { const data = await getSuppliers(); setSuppliers(data.results ?? data); } catch (err) { setError(err.message); }
    })();
  }, []);

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const equipment = await createEquipment({
        ...form,
        supplier: form.supplier || undefined,
        purchase_cost: form.purchase_cost || undefined,
        purchase_date: form.purchase_date || undefined,
        warranty_expiry: form.warranty_expiry || undefined,
        preventive_maintenance_interval_days: Number(form.preventive_maintenance_interval_days),
        calibration_interval_days: form.calibration_interval_days ? Number(form.calibration_interval_days) : undefined,
      });
      navigate(`/biomed/equipment/${equipment.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1>Register Equipment</h1>
      {error && <p>Error: {error}</p>}

      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Equipment Name" value={form.name} onChange={handleChange("name")} required />
        <select value={form.category} onChange={handleChange("category")}>
          <option value="DIAGNOSTIC">Diagnostic</option>
          <option value="THERAPEUTIC">Therapeutic</option>
          <option value="LIFE_SUPPORT">Life Support</option>
          <option value="LABORATORY">Laboratory</option>
          <option value="IMAGING">Imaging</option>
          <option value="STERILIZATION">Sterilization</option>
          <option value="OTHER">Other</option>
        </select>
        <input type="text" placeholder="Manufacturer" value={form.manufacturer} onChange={handleChange("manufacturer")} />
        <input type="text" placeholder="Model Number" value={form.model_number} onChange={handleChange("model_number")} />
        <input type="text" placeholder="Serial Number" value={form.serial_number} onChange={handleChange("serial_number")} />
        <input type="text" placeholder="Department / Location" value={form.department} onChange={handleChange("department")} />

        <select value={form.risk_class} onChange={handleChange("risk_class")}>
          <option value="LOW">Low Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="HIGH">High Risk (Life-Critical)</option>
        </select>

        <select value={form.supplier} onChange={handleChange("supplier")}>
          <option value="">Supplier (optional)</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <label>Purchase Date</label>
        <input type="date" value={form.purchase_date} onChange={handleChange("purchase_date")} />
        <input type="number" placeholder="Purchase Cost" value={form.purchase_cost} onChange={handleChange("purchase_cost")} />
        <label>Warranty Expiry</label>
        <input type="date" value={form.warranty_expiry} onChange={handleChange("warranty_expiry")} />

        <label>Preventive Maintenance Interval (days)</label>
        <input type="number" value={form.preventive_maintenance_interval_days} onChange={handleChange("preventive_maintenance_interval_days")} required />
        <label>Calibration Interval (days) — leave blank if not applicable</label>
        <input type="number" value={form.calibration_interval_days} onChange={handleChange("calibration_interval_days")} />

        <button type="submit" disabled={submitting}>{submitting ? "Registering..." : "Register Equipment"}</button>
      </form>
    </div>
  );
}