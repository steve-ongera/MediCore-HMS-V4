import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEyeVisit, saveEyeExamination, prescribeSpectacles, getEyeProcedureCatalog,
  addEyeTreatmentPlanItem, performEyeProcedure, cancelEyeTreatmentPlanItem,
} from "../../services/api";

export default function EyeVisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [examForm, setExamForm] = useState({
    visual_acuity_od: "", visual_acuity_os: "", iop_od: "", iop_os: "",
    sphere_od: "", cylinder_od: "", axis_od: "", sphere_os: "", cylinder_os: "", axis_os: "",
    anterior_segment_notes: "", posterior_segment_notes: "", diagnosis: "",
  });

  const [rxForm, setRxForm] = useState({
    lens_type: "SINGLE_VISION", sphere_od: "", cylinder_od: "", axis_od: "", add_od: "",
    sphere_os: "", cylinder_os: "", axis_os: "", add_os: "", pupillary_distance_mm: "", price: "", notes: "",
  });

  const [planForm, setPlanForm] = useState({ procedure: "", eye: "BOTH", notes: "" });

  useEffect(() => { load(); loadProcedures(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getEyeVisit(id);
      setVisit(data);
      if (data.examination) {
        setExamForm({
          visual_acuity_od: data.examination.visual_acuity_od || "",
          visual_acuity_os: data.examination.visual_acuity_os || "",
          iop_od: data.examination.iop_od || "", iop_os: data.examination.iop_os || "",
          sphere_od: data.examination.sphere_od || "", cylinder_od: data.examination.cylinder_od || "",
          axis_od: data.examination.axis_od || "", sphere_os: data.examination.sphere_os || "",
          cylinder_os: data.examination.cylinder_os || "", axis_os: data.examination.axis_os || "",
          anterior_segment_notes: data.examination.anterior_segment_notes || "",
          posterior_segment_notes: data.examination.posterior_segment_notes || "",
          diagnosis: data.examination.diagnosis || "",
        });
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadProcedures = async () => {
    try {
      const data = await getEyeProcedureCatalog();
      setProcedures(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleExamChange = (f) => (e) => setExamForm((p) => ({ ...p, [f]: e.target.value }));
  const submitExam = async (e) => {
    e.preventDefault();
    try {
      await saveEyeExamination(id, examForm);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleRxChange = (f) => (e) => setRxForm((p) => ({ ...p, [f]: e.target.value }));
  const submitRx = async (e) => {
    e.preventDefault();
    try {
      await prescribeSpectacles(id, { ...rxForm, price: Number(rxForm.price) || 0 });
      setRxForm({ lens_type: "SINGLE_VISION", sphere_od: "", cylinder_od: "", axis_od: "", add_od: "", sphere_os: "", cylinder_os: "", axis_os: "", add_os: "", pupillary_distance_mm: "", price: "", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitPlan = async (e) => {
    e.preventDefault();
    try {
      await addEyeTreatmentPlanItem(id, planForm);
      setPlanForm({ procedure: "", eye: "BOTH", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handlePerform = async (planId) => {
    try {
      await performEyeProcedure(planId, {});
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCancelPlan = async (planId) => {
    try {
      await cancelEyeTreatmentPlanItem(planId);
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div>Loading...</div>;
  if (!visit) return null;

  return (
    <div>
      <button type="button" onClick={() => navigate("/eyeclinic")}>&larr; Back</button>
      <h1>{visit.visit_number}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Patient: {visit.patient_name} ({visit.hospital_number})</p>
        <p>Ophthalmologist: {visit.ophthalmologist_name || "—"}</p>
        <p>Chief Complaint: {visit.chief_complaint || "—"}</p>
        <p>Date: {new Date(visit.visit_date).toLocaleString()}</p>
      </section>

      <section>
        <h2>Examination</h2>
        <form onSubmit={submitExam}>
          <div>
            <h3>Right Eye (OD)</h3>
            <input type="text" placeholder="Visual Acuity OD (e.g. 6/6)" value={examForm.visual_acuity_od} onChange={handleExamChange("visual_acuity_od")} />
            <input type="number" placeholder="IOP OD (mmHg)" value={examForm.iop_od} onChange={handleExamChange("iop_od")} />
            <input type="number" placeholder="Sphere OD" value={examForm.sphere_od} onChange={handleExamChange("sphere_od")} />
            <input type="number" placeholder="Cylinder OD" value={examForm.cylinder_od} onChange={handleExamChange("cylinder_od")} />
            <input type="number" placeholder="Axis OD" value={examForm.axis_od} onChange={handleExamChange("axis_od")} />
          </div>
          <div>
            <h3>Left Eye (OS)</h3>
            <input type="text" placeholder="Visual Acuity OS (e.g. 6/6)" value={examForm.visual_acuity_os} onChange={handleExamChange("visual_acuity_os")} />
            <input type="number" placeholder="IOP OS (mmHg)" value={examForm.iop_os} onChange={handleExamChange("iop_os")} />
            <input type="number" placeholder="Sphere OS" value={examForm.sphere_os} onChange={handleExamChange("sphere_os")} />
            <input type="number" placeholder="Cylinder OS" value={examForm.cylinder_os} onChange={handleExamChange("cylinder_os")} />
            <input type="number" placeholder="Axis OS" value={examForm.axis_os} onChange={handleExamChange("axis_os")} />
          </div>
          <textarea placeholder="Anterior segment notes" value={examForm.anterior_segment_notes} onChange={handleExamChange("anterior_segment_notes")} />
          <textarea placeholder="Posterior segment notes" value={examForm.posterior_segment_notes} onChange={handleExamChange("posterior_segment_notes")} />
          <textarea placeholder="Diagnosis" value={examForm.diagnosis} onChange={handleExamChange("diagnosis")} />
          <button type="submit">Save Examination</button>
        </form>
      </section>

      <section>
        <h2>Prescribe Spectacles</h2>
        <form onSubmit={submitRx}>
          <select value={rxForm.lens_type} onChange={handleRxChange("lens_type")}>
            <option value="SINGLE_VISION">Single Vision</option>
            <option value="BIFOCAL">Bifocal</option>
            <option value="PROGRESSIVE">Progressive</option>
            <option value="READING">Reading Only</option>
          </select>
          <div>
            <h3>Right Eye (OD)</h3>
            <input type="number" placeholder="Sphere OD" value={rxForm.sphere_od} onChange={handleRxChange("sphere_od")} />
            <input type="number" placeholder="Cylinder OD" value={rxForm.cylinder_od} onChange={handleRxChange("cylinder_od")} />
            <input type="number" placeholder="Axis OD" value={rxForm.axis_od} onChange={handleRxChange("axis_od")} />
            <input type="number" placeholder="Add OD" value={rxForm.add_od} onChange={handleRxChange("add_od")} />
          </div>
          <div>
            <h3>Left Eye (OS)</h3>
            <input type="number" placeholder="Sphere OS" value={rxForm.sphere_os} onChange={handleRxChange("sphere_os")} />
            <input type="number" placeholder="Cylinder OS" value={rxForm.cylinder_os} onChange={handleRxChange("cylinder_os")} />
            <input type="number" placeholder="Axis OS" value={rxForm.axis_os} onChange={handleRxChange("axis_os")} />
            <input type="number" placeholder="Add OS" value={rxForm.add_os} onChange={handleRxChange("add_os")} />
          </div>
          <input type="number" placeholder="Pupillary distance (mm)" value={rxForm.pupillary_distance_mm} onChange={handleRxChange("pupillary_distance_mm")} />
          <input type="number" placeholder="Price (KES)" value={rxForm.price} onChange={handleRxChange("price")} />
          <textarea placeholder="Notes" value={rxForm.notes} onChange={handleRxChange("notes")} />
          <button type="submit">Save Prescription</button>
        </form>
      </section>

      <section>
        <h2>Spectacle Prescriptions</h2>
        <table>
          <thead><tr><th>Lens Type</th><th>OD (Sph/Cyl/Axis)</th><th>OS (Sph/Cyl/Axis)</th><th>Price</th><th>Date</th></tr></thead>
          <tbody>
            {visit.spectacle_prescriptions.map((rx) => (
              <tr key={rx.id}>
                <td>{rx.lens_type}</td>
                <td>{rx.sphere_od}/{rx.cylinder_od}/{rx.axis_od}</td>
                <td>{rx.sphere_os}/{rx.cylinder_os}/{rx.axis_os}</td>
                <td>KES {rx.price}</td>
                <td>{new Date(rx.prescribed_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visit.spectacle_prescriptions.length === 0 && <p>No prescriptions yet.</p>}
      </section>

      <section>
        <h2>Add Treatment Plan Item</h2>
        <form onSubmit={submitPlan}>
          <select value={planForm.procedure} onChange={(e) => setPlanForm((p) => ({ ...p, procedure: e.target.value }))} required>
            <option value="">Select procedure</option>
            {procedures.map((p) => <option key={p.id} value={p.id}>{p.name} (KES {p.price})</option>)}
          </select>
          <select value={planForm.eye} onChange={(e) => setPlanForm((p) => ({ ...p, eye: e.target.value }))}>
            <option value="OD">Right Eye (OD)</option>
            <option value="OS">Left Eye (OS)</option>
            <option value="BOTH">Both Eyes</option>
          </select>
          <input type="text" placeholder="Notes" value={planForm.notes} onChange={(e) => setPlanForm((p) => ({ ...p, notes: e.target.value }))} />
          <button type="submit">Add to Plan</button>
        </form>
      </section>

      <section>
        <h2>Treatment Plan</h2>
        <table>
          <thead><tr><th>Procedure</th><th>Eye</th><th>Price</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {visit.treatment_plans.map((p) => (
              <tr key={p.id}>
                <td>{p.procedure_name}</td><td>{p.eye}</td><td>KES {p.procedure_price}</td><td>{p.status}</td>
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