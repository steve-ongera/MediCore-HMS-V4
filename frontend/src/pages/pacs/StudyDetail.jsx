import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPACSStudyDetail, simulatePACSImages, savePACSReport, finalizePACSReport } from "../../services/api";

export default function StudyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [study, setStudy] = useState(null);
  const [error, setError] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [reportForm, setReportForm] = useState({ findings: "", impression: "" });

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const data = await getPACSStudyDetail(id);
      setStudy(data);
      if (data.report) setReportForm({ findings: data.report.findings, impression: data.report.impression });
    } catch (err) { setError(err.message); }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    setError("");
    try {
      await simulatePACSImages(id, { series_count: 1, images_per_series: 3 });
      load();
    } catch (err) { setError(err.message); } finally { setSimulating(false); }
  };

  const saveReport = async (e) => {
    e.preventDefault();
    try {
      await savePACSReport(id, reportForm);
      load();
    } catch (err) { setError(err.message); }
  };

  const finalize = async () => {
    if (!window.confirm("Finalize this report? It cannot be edited afterward.")) return;
    try {
      await finalizePACSReport(id);
      load();
    } catch (err) { setError(err.message); }
  };

  if (!study) return <div>Loading...</div>;

  return (
    <div>
      <button type="button" onClick={() => navigate("/pacs")}>&larr; Back</button>
      <h1>{study.accession_number} — {study.description}</h1>
      {study.source === "DEMO" && <p style={{ background: "#fff3cd", padding: "6px" }}>⚠ This study contains simulated demo images, not a real patient scan.</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <section>
        <p>Patient: {study.patient_name} ({study.hospital_number})</p>
        <p>Modality: {study.modality} — Status: {study.status}</p>
        <p>Study UID: {study.study_instance_uid}</p>
        <p>Referring Physician: {study.referring_physician_name || "—"}</p>
        {study.study_date && <p>Study Date: {new Date(study.study_date).toLocaleString()}</p>}

        {study.status !== "COMPLETED" && study.status !== "REPORTED" && (
          <button type="button" onClick={handleSimulate} disabled={simulating}>
            {simulating ? "Simulating..." : "Simulate Modality Sending Images (Demo)"}
          </button>
        )}
      </section>

      <section>
        <h2>Images ({study.image_count})</h2>
        {study.series_set.map((series) => (
          <div key={series.id}>
            <h3>{series.series_description}</h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {series.images.map((img) => (
                <div key={img.id} style={{ textAlign: "center" }}>
                  <img src={img.file} alt={`Instance ${img.instance_number}`} style={{ width: 150, border: "1px solid #ccc" }} />
                  <div>Instance {img.instance_number}{img.is_simulated && " (simulated)"}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {study.series_set.length === 0 && <p>No images received yet.</p>}
      </section>

      {study.status === "COMPLETED" || study.status === "REPORTED" ? (
        <section>
          <h2>Report</h2>
          <form onSubmit={saveReport}>
            <textarea placeholder="Findings" value={reportForm.findings} onChange={(e) => setReportForm((p) => ({ ...p, findings: e.target.value }))} disabled={study.report?.status === "FINAL"} />
            <textarea placeholder="Impression" value={reportForm.impression} onChange={(e) => setReportForm((p) => ({ ...p, impression: e.target.value }))} disabled={study.report?.status === "FINAL"} />
            {study.report?.status !== "FINAL" && (
              <>
                <button type="submit">Save Draft</button>
                <button type="button" onClick={finalize}>Finalize Report</button>
              </>
            )}
          </form>
          {study.report?.status === "FINAL" && <p>Report finalized by {study.report.radiologist_name} on {new Date(study.report.finalized_at).toLocaleString()}.</p>}
        </section>
      ) : (
        <p>Images must be received before a report can be written.</p>
      )}
    </div>
  );
}