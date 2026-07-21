import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getDentalVisit, recordTooth, addTreatmentPlanItem, getDentalProcedureCatalog,
  performDentalProcedure, cancelTreatmentPlanItem,
} from "../../services/api";

const FDI_QUADRANTS = {
  "Upper Right (1)": [18, 17, 16, 15, 14, 13, 12, 11],
  "Upper Left (2)": [21, 22, 23, 24, 25, 26, 27, 28],
  "Lower Left (3)": [31, 32, 33, 34, 35, 36, 37, 38],
  "Lower Right (4)": [48, 47, 46, 45, 44, 43, 42, 41],
};

export default function DentalVisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTooth, setSelectedTooth] = useState("");
  const [toothForm, setToothForm] = useState({ condition: "HEALTHY", notes: "" });

  const [planForm, setPlanForm] = useState({ tooth_number: "", procedure: "", sequence: "1", notes: "" });

  useEffect(() => { load(); loadProcedures(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDentalVisit(id);
      setVisit(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadProcedures = async () => {
    try {
      const data = await getDentalProcedureCatalog();
      setProcedures(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const getToothCondition = (toothNumber) => {
    const entry = (visit?.tooth_chart || []).find((t) => t.tooth_number === String(toothNumber));
    return entry ? entry.condition : null;
  };

  const openToothForm = (toothNumber) => {
    const existing = (visit?.tooth_chart || []).find((t) => t.tooth_number === String(toothNumber));
    setSelectedTooth(String(toothNumber));
    setToothForm({ condition: existing?.condition || "HEALTHY", notes: existing?.notes || "" });
  };

  const submitTooth = async (e) => {
    e.preventDefault();
    try {
      await recordTooth(id, { tooth_number: selectedTooth, ...toothForm });
      setSelectedTooth("");
      load();
    } catch (err) { setError(err.message); }
  };

  const submitPlan = async (e) => {
    e.preventDefault();
    try {
      await addTreatmentPlanItem(id, { ...planForm, sequence: Number(planForm.sequence) });
      setPlanForm({ tooth_number: "", procedure: "", sequence: "1", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handlePerform = async (planId) => {
    try {
      await performDentalProcedure(planId, {});
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCancelPlan = async (planId) => {
    try {
      await cancelTreatmentPlanItem(planId);
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div>Loading...</div>;
  if (!visit) return null;

  return (
    <div>
      <button type="button" onClick={() => navigate("/dental")}>&larr; Back</button>
      <h1>{visit.visit_number}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Patient: {visit.patient_name} ({visit.hospital_number})</p>
        <p>Dentist: {visit.dentist_name || "—"}</p>
        <p>Chief Complaint: {visit.chief_complaint || "—"}</p>
        <p>Date: {new Date(visit.visit_date).toLocaleString()}</p>
      </section>

      <section>
        <h2>Tooth Chart (FDI Notation)</h2>
        {Object.entries(FDI_QUADRANTS).map(([quadrantName, teeth]) => (
          <div key={quadrantName}>
            <h3>{quadrantName}</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              {teeth.map((t) => {
                const condition = getToothCondition(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => openToothForm(t)}
                    title={condition || "Not yet examined"}
                  >
                    {t}{condition ? ` (${condition})` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {selectedTooth && (
          <form onSubmit={submitTooth}>
            <h3>Tooth {selectedTooth}</h3>
            <select value={toothForm.condition} onChange={(e) => setToothForm((p) => ({ ...p, condition: e.target.value }))}>
              <option value="HEALTHY">Healthy</option>
              <option value="CARIES">Caries / Decay</option>
              <option value="FILLED">Filled</option>
              <option value="CROWNED">Crowned</option>
              <option value="MISSING">Missing</option>
              <option value="IMPACTED">Impacted</option>
              <option value="FRACTURED">Fractured</option>
              <option value="ROOT_CANAL_TREATED">Root Canal Treated</option>
            </select>
            <input type="text" placeholder="Notes" value={toothForm.notes} onChange={(e) => setToothForm((p) => ({ ...p, notes: e.target.value }))} />
            <button type="submit">Save Tooth Record</button>
            <button type="button" onClick={() => setSelectedTooth("")}>Cancel</button>
          </form>
        )}
      </section>

      <section>
        <h2>Add Treatment Plan Item</h2>
        <form onSubmit={submitPlan}>
          <select value={planForm.tooth_number} onChange={(e) => setPlanForm((p) => ({ ...p, tooth_number: e.target.value }))}>
            <option value="">Whole-mouth procedure (no specific tooth)</option>
            {Object.values(FDI_QUADRANTS).flat().map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={planForm.procedure} onChange={(e) => setPlanForm((p) => ({ ...p, procedure: e.target.value }))} required>
            <option value="">Select procedure</option>
            {procedures.map((p) => <option key={p.id} value={p.id}>{p.name} (KES {p.price})</option>)}
          </select>
          <input type="number" placeholder="Sequence" value={planForm.sequence} onChange={(e) => setPlanForm((p) => ({ ...p, sequence: e.target.value }))} />
          <input type="text" placeholder="Notes" value={planForm.notes} onChange={(e) => setPlanForm((p) => ({ ...p, notes: e.target.value }))} />
          <button type="submit">Add to Plan</button>
        </form>
      </section>

      <section>
        <h2>Treatment Plan</h2>
        <table>
          <thead><tr><th>#</th><th>Tooth</th><th>Procedure</th><th>Price</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {visit.treatment_plans.map((p) => (
              <tr key={p.id}>
                <td>{p.sequence}</td><td>{p.tooth_number || "N/A"}</td>
                <td>{p.procedure_name}</td><td>KES {p.procedure_price}</td>
                <td>{p.status}</td>
                <td>
                  {p.status === "PLANNED" && (
                    <>
                      <button type="button" onClick={() => handlePerform(p.id)}>Mark Performed & Bill</button>{" "}
                      <button type="button" onClick={() => handleCancelPlan(p.id)}>Cancel</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visit.treatment_plans.length === 0 && <p>No treatment plan items yet.</p>}
      </section>
    </div>
  );
}