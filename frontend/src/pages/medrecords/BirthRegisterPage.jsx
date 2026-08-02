import { useEffect, useState } from "react";
import { getBirthRegister, createBirthRegistration, getPatients, getUsers } from "../../services/api";

export default function BirthRegisterPage() {
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [motherQuery, setMotherQuery] = useState("");
  const [motherResults, setMotherResults] = useState([]);
  const [selectedMother, setSelectedMother] = useState(null);

  const [form, setForm] = useState({
    child_name: "", sex: "MALE", date_of_birth: "", time_of_birth: "",
    place_of_birth: "Facility", father_name: "", father_national_id: "", attending_staff: "",
  });

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { load(); }, [search]);

  const load = async () => {
    try {
      const params = { page_size: 100 };
      if (search) params.search = search;
      const data = await getBirthRegister(params);
      setEntries(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadUsers = async () => {
    try { const data = await getUsers(); setUsers(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const handleMotherSearch = async (e) => {
    e.preventDefault();
    if (!motherQuery.trim()) return;
    try {
      const data = await getPatients({ search: motherQuery });
      setMotherResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedMother) { setError("Select the mother first."); return; }
    try {
      await createBirthRegistration({
        ...form,
        mother: selectedMother.id,
        time_of_birth: form.time_of_birth || undefined,
        attending_staff: form.attending_staff || undefined,
      });
      setSelectedMother(null);
      setMotherQuery("");
      setForm({ child_name: "", sex: "MALE", date_of_birth: "", time_of_birth: "", place_of_birth: "Facility", father_name: "", father_national_id: "", attending_staff: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Birth Register</h1>
      {error && <p>Error: {error}</p>}

      <h2>Register Birth</h2>
      <form onSubmit={handleMotherSearch}>
        <input type="text" placeholder="Search mother" value={motherQuery} onChange={(e) => setMotherQuery(e.target.value)} />
        <button type="submit">Search</button>
      </form>
      {motherResults.length > 0 && (
        <ul>
          {motherResults.map((p) => (
            <li key={p.id}>{p.full_name} — {p.hospital_number} <button type="button" onClick={() => setSelectedMother(p)}>Select</button></li>
          ))}
        </ul>
      )}
      {selectedMother && <p>Mother: <strong>{selectedMother.full_name}</strong></p>}

      <form onSubmit={submit}>
        <input type="text" placeholder="Child's name (optional if not yet named)" value={form.child_name} onChange={(e) => setForm((p) => ({ ...p, child_name: e.target.value }))} />
        <select value={form.sex} onChange={(e) => setForm((p) => ({ ...p, sex: e.target.value }))}>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
        <input type="date" value={form.date_of_birth} onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))} required />
        <input type="time" value={form.time_of_birth} onChange={(e) => setForm((p) => ({ ...p, time_of_birth: e.target.value }))} />
        <input type="text" placeholder="Place of birth" value={form.place_of_birth} onChange={(e) => setForm((p) => ({ ...p, place_of_birth: e.target.value }))} />
        <input type="text" placeholder="Father's name" value={form.father_name} onChange={(e) => setForm((p) => ({ ...p, father_name: e.target.value }))} />
        <input type="text" placeholder="Father's national ID" value={form.father_national_id} onChange={(e) => setForm((p) => ({ ...p, father_national_id: e.target.value }))} />
        <select value={form.attending_staff} onChange={(e) => setForm((p) => ({ ...p, attending_staff: e.target.value }))}>
          <option value="">Attending staff (optional)</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <button type="submit" disabled={!selectedMother}>Register Birth</button>
      </form>

      <h2>Birth Register Entries</h2>
      <input type="text" placeholder="Search by reg #, name" value={search} onChange={(e) => setSearch(e.target.value)} />
      <table>
        <thead><tr><th>Reg #</th><th>Child Name</th><th>Sex</th><th>DOB</th><th>Mother</th></tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.registration_number}</td><td>{e.child_name || "Unnamed"}</td><td>{e.sex}</td>
              <td>{e.date_of_birth}</td><td>{e.mother_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}