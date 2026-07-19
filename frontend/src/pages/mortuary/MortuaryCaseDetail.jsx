import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getMortuaryCase, getMortuaryBilling, addMortuaryCharge,
  getMortuaryServiceCatalog, orderMortuaryService, releaseBody,
} from "../../services/api";

export default function MortuaryCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [mortuaryCase, setMortuaryCase] = useState(null);
  const [billing, setBilling] = useState(null);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [chargeForm, setChargeForm] = useState({ description: "", amount: "" });
  const [serviceForm, setServiceForm] = useState({ service: "", notes: "" });
  const [releaseForm, setReleaseForm] = useState({
    collector_name: "", collector_id_number: "", collector_phone: "",
    relationship: "SPOUSE", funeral_home: "", burial_permit_number: "", notes: "",
  });

  useEffect(() => {
    load();
    loadBilling();
    loadServiceCatalog();
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMortuaryCase(id);
      setMortuaryCase(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadBilling = async () => {
    try {
      const data = await getMortuaryBilling(id);
      setBilling(data);
    } catch (err) { setError(err.message); }
  };

  const loadServiceCatalog = async () => {
    try {
      const data = await getMortuaryServiceCatalog();
      setServiceCatalog(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const submitCharge = async (e) => {
    e.preventDefault();
    try {
      await addMortuaryCharge(id, { description: chargeForm.description, amount: parseFloat(chargeForm.amount) });
      setChargeForm({ description: "", amount: "" });
      loadBilling();
    } catch (err) { setError(err.message); }
  };

  const submitService = async (e) => {
    e.preventDefault();
    try {
      await orderMortuaryService(id, serviceForm);
      setServiceForm({ service: "", notes: "" });
      load();
      loadBilling();
    } catch (err) { setError(err.message); }
  };

  const submitRelease = async (e) => {
    e.preventDefault();
    if (!window.confirm("Confirm body release? This cannot be undone.")) return;
    try {
      await releaseBody(id, releaseForm);
      load();
      loadBilling();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div>Loading...</div>;
  if (!mortuaryCase) return null;

  const isAdmitted = mortuaryCase.status === "ADMITTED";

  return (
    <div>
      <button type="button" onClick={() => navigate("/mortuary")}>&larr; Back</button>
      <h1>{mortuaryCase.case_number}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Deceased: {mortuaryCase.deceased_display_name} {mortuaryCase.hospital_number && `(${mortuaryCase.hospital_number})`}</p>
        <p>Gender: {mortuaryCase.gender} — Estimated Age: {mortuaryCase.estimated_age || "—"}</p>
        <p>Date of Death: {new Date(mortuaryCase.date_of_death).toLocaleString()}</p>
        <p>Cause of Death: {mortuaryCase.cause_of_death || "—"}</p>
        <p>Source: {mortuaryCase.source}</p>
        <p>Compartment: {mortuaryCase.compartment_number || "Unassigned"}</p>
        <p>Brought By: {mortuaryCase.brought_by || "—"} — Police OB #: {mortuaryCase.police_ob_number || "—"}</p>
        <p>Status: {mortuaryCase.status}</p>
        <p>Admitted: {new Date(mortuaryCase.admitted_at).toLocaleString()} by {mortuaryCase.admitted_by_name}</p>
        <p>Days in Storage: {mortuaryCase.days_in_storage}</p>
      </section>

      <section>
        <h2>Billing</h2>
        {!billing ? <p>Loading billing...</p> : (
          <>
            <p>Grand Total: KES {billing.grand_total} — Paid: KES {billing.amount_paid} — Balance: KES {billing.balance}</p>
            <table>
              <thead><tr><th>Invoice #</th><th>Description</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>
                {billing.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoice_number}</td><td>{inv.description}</td>
                    <td>KES {inv.amount}</td><td>KES {inv.balance}</td><td>{inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {Number(billing.balance) > 0 && (
              <button type="button" onClick={() => navigate(`/billing/payments?invoice=${billing.invoices.find((i) => Number(i.balance) > 0)?.id ?? ""}`)}>
                Go to Billing / Take Payment
              </button>
            )}

            <h3>Add Charge</h3>
            <form onSubmit={submitCharge}>
              <input type="text" placeholder="Description" value={chargeForm.description} onChange={(e) => setChargeForm((p) => ({ ...p, description: e.target.value }))} required />
              <input type="number" placeholder="Amount" value={chargeForm.amount} onChange={(e) => setChargeForm((p) => ({ ...p, amount: e.target.value }))} required />
              <button type="submit">Add Charge</button>
            </form>
          </>
        )}
      </section>

      {isAdmitted && (
        <section>
          <h2>Order Service</h2>
          <form onSubmit={submitService}>
            <select value={serviceForm.service} onChange={(e) => setServiceForm((p) => ({ ...p, service: e.target.value }))} required>
              <option value="">Select service</option>
              {serviceCatalog.map((s) => <option key={s.id} value={s.id}>{s.name} (KES {s.price})</option>)}
            </select>
            <input type="text" placeholder="Notes" value={serviceForm.notes} onChange={(e) => setServiceForm((p) => ({ ...p, notes: e.target.value }))} />
            <button type="submit">Order Service</button>
          </form>
        </section>
      )}

      <section>
        <h2>Services</h2>
        <table>
          <thead><tr><th>Service</th><th>Status</th><th>Ordered</th></tr></thead>
          <tbody>
            {(mortuaryCase.services || []).map((s) => (
              <tr key={s.id}>
                <td>{s.service_name}</td><td>{s.status}</td>
                <td>{new Date(s.ordered_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isAdmitted ? (
        <section>
          <h2>Release Body</h2>
          <form onSubmit={submitRelease}>
            <input type="text" placeholder="Collector's full name" value={releaseForm.collector_name} onChange={(e) => setReleaseForm((p) => ({ ...p, collector_name: e.target.value }))} required />
            <input type="text" placeholder="Collector's ID number" value={releaseForm.collector_id_number} onChange={(e) => setReleaseForm((p) => ({ ...p, collector_id_number: e.target.value }))} />
            <input type="text" placeholder="Collector's phone" value={releaseForm.collector_phone} onChange={(e) => setReleaseForm((p) => ({ ...p, collector_phone: e.target.value }))} />
            <select value={releaseForm.relationship} onChange={(e) => setReleaseForm((p) => ({ ...p, relationship: e.target.value }))}>
              <option value="SPOUSE">Spouse</option>
              <option value="CHILD">Child</option>
              <option value="PARENT">Parent</option>
              <option value="SIBLING">Sibling</option>
              <option value="OTHER_RELATIVE">Other Relative</option>
              <option value="UNDERTAKER">Undertaker / Funeral Home</option>
              <option value="POLICE">Police</option>
              <option value="OTHER">Other</option>
            </select>
            <input type="text" placeholder="Funeral home (if applicable)" value={releaseForm.funeral_home} onChange={(e) => setReleaseForm((p) => ({ ...p, funeral_home: e.target.value }))} />
            <input type="text" placeholder="Burial permit number" value={releaseForm.burial_permit_number} onChange={(e) => setReleaseForm((p) => ({ ...p, burial_permit_number: e.target.value }))} />
            <textarea placeholder="Notes" value={releaseForm.notes} onChange={(e) => setReleaseForm((p) => ({ ...p, notes: e.target.value }))} />
            <button type="submit">Release Body</button>
          </form>
        </section>
      ) : (
        mortuaryCase.release && (
          <section>
            <h2>Release Record</h2>
            <p>Collected By: {mortuaryCase.release.collector_name} ({mortuaryCase.release.relationship})</p>
            <p>ID Number: {mortuaryCase.release.collector_id_number || "—"} — Phone: {mortuaryCase.release.collector_phone || "—"}</p>
            <p>Funeral Home: {mortuaryCase.release.funeral_home || "—"}</p>
            <p>Burial Permit #: {mortuaryCase.release.burial_permit_number || "—"}</p>
            <p>Released By: {mortuaryCase.release.released_by_name} on {new Date(mortuaryCase.release.released_at).toLocaleString()}</p>
            <p>Notes: {mortuaryCase.release.notes || "—"}</p>
          </section>
        )
      )}
    </div>
  );
}