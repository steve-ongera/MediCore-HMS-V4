import { useEffect, useState } from "react";
import { getPatients, uploadDocument, getDocumentAttachments } from "../../services/api";

export default function DocumentUpload() {
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [documentType, setDocumentType] = useState("OTHER");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedPatient) loadDocuments();
  }, [selectedPatient]);

  const loadDocuments = async () => {
    try {
      const data = await getDocumentAttachments({ patient: selectedPatient.id });
      setDocuments(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !file) { setError("Select a patient and a file."); return; }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("patient", selectedPatient.id);
      formData.append("document_type", documentType);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("file", file);
      await uploadDocument(formData);
      setTitle("");
      setDescription("");
      setFile(null);
      loadDocuments();
    } catch (err) { setError(err.message); } finally { setUploading(false); }
  };

  return (
    <div>
      <h1>Document Scanning & Attachments</h1>
      {error && <p>Error: {error}</p>}

      <h2>Find Patient</h2>
      <form onSubmit={handlePatientSearch}>
        <input type="text" placeholder="Search patient" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
        <button type="submit">Search</button>
      </form>
      {patientResults.length > 0 && (
        <ul>
          {patientResults.map((p) => (
            <li key={p.id}>{p.full_name} — {p.hospital_number} <button type="button" onClick={() => { setSelectedPatient(p); setPatientResults([]); setPatientQuery(""); }}>Select</button></li>
          ))}
        </ul>
      )}

      {selectedPatient && (
        <>
          <p>Patient: <strong>{selectedPatient.full_name}</strong></p>

          <h2>Upload Document</h2>
          <form onSubmit={handleUpload}>
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              <option value="REFERRAL_LETTER">Referral Letter</option>
              <option value="EXTERNAL_RESULT">External Lab/Imaging Result</option>
              <option value="ID_DOCUMENT">ID Document</option>
              <option value="CONSENT_FORM">Consent Form</option>
              <option value="INSURANCE_DOCUMENT">Insurance Document</option>
              <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
              <option value="OTHER">Other</option>
            </select>
            <input type="text" placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
            <button type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</button>
          </form>

          <h2>Documents on File</h2>
          <table>
            <thead><tr><th>Type</th><th>Title</th><th>Uploaded By</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td>{d.document_type}</td><td>{d.title}</td><td>{d.uploaded_by_name}</td>
                  <td>{new Date(d.uploaded_at).toLocaleString()}</td>
                  <td><a href={d.file} target="_blank" rel="noreferrer">View</a></td>
                </tr>
              ))}
            </tbody>
          </table>
          {documents.length === 0 && <p>No documents on file for this patient.</p>}
        </>
      )}
    </div>
  );
}