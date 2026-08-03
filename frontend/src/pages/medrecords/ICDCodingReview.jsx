import { useEffect, useState } from "react";
import { getUnverifiedDiagnoses, getUncodedDiagnoses, verifyDiagnosisCoding, correctDiagnosisCoding, searchICD10Codes } from "../../services/api";

export default function ICDCodingReview() {
  const [tab, setTab] = useState("unverified");
  const [diagnoses, setDiagnoses] = useState([]);
  const [error, setError] = useState("");

  const [correctingId, setCorrectingId] = useState(null);
  const [codeSearch, setCodeSearch] = useState("");
  const [codeOptions, setCodeOptions] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");

  useEffect(() => { load(); }, [tab]);

  const load = async () => {
    try {
      const data = tab === "unverified" ? await getUnverifiedDiagnoses() : await getUncodedDiagnoses();
      setDiagnoses(data);
    } catch (err) { setError(err.message); }
  };

  const handleVerify = async (id) => {
    try { await verifyDiagnosisCoding(id); load(); } catch (err) { setError(err.message); }
  };

  const searchCodes = async (query) => {
    setCodeSearch(query);
    if (query.length < 2) { setCodeOptions([]); return; }
    try {
      const data = await searchICD10Codes(query);
      setCodeOptions(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const submitCorrection = async (id) => {
    try {
      await correctDiagnosisCoding(id, { icd10_code: selectedCode, coding_correction_notes: correctionNotes });
      setCorrectingId(null);
      setSelectedCode("");
      setCorrectionNotes("");
      setCodeSearch("");
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>ICD-10 Coding Review</h1>
      <p>Quality assurance over diagnosis coding entered by doctors — verify correct codes, or correct miscoded diagnoses.</p>
      {error && <p>Error: {error}</p>}

      <button type="button" onClick={() => setTab("unverified")} style={{ fontWeight: tab === "unverified" ? "bold" : "normal" }}>Unverified</button>{" "}
      <button type="button" onClick={() => setTab("uncoded")} style={{ fontWeight: tab === "uncoded" ? "bold" : "normal" }}>Uncoded (no ICD10 at all)</button>

      <table>
        <thead><tr><th>Patient</th><th>Diagnosis Notes</th><th>ICD10 Code</th><th>Doctor</th><th>Date</th><th></th></tr></thead>
        <tbody>
          {diagnoses.map((d) => (
            <tr key={d.id}>
              <td>{d.patient_name}</td>
              <td>{d.notes}</td>
              <td>{d.icd10_code_display || "— Not coded —"}</td>
              <td>{d.doctor_name}</td>
              <td>{new Date(d.created_at).toLocaleDateString()}</td>
              <td>
                {tab === "unverified" && (
                  <button type="button" onClick={() => handleVerify(d.id)}>Verify Correct</button>
                )}{" "}
                {correctingId === d.id ? (
                  <div>
                    <input type="text" placeholder="Search ICD10 code" value={codeSearch} onChange={(e) => searchCodes(e.target.value)} />
                    {codeOptions.length > 0 && (
                      <select value={selectedCode} onChange={(e) => setSelectedCode(e.target.value)}>
                        <option value="">Select code</option>
                        {codeOptions.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.description}</option>)}
                      </select>
                    )}
                    <input type="text" placeholder="Correction reason" value={correctionNotes} onChange={(e) => setCorrectionNotes(e.target.value)} />
                    <button type="button" onClick={() => submitCorrection(d.id)}>Save Correction</button>
                    <button type="button" onClick={() => setCorrectingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setCorrectingId(d.id)}>Correct Code</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {diagnoses.length === 0 && <p>Nothing in this queue.</p>}
    </div>
  );
}