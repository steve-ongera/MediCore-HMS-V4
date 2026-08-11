import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDoctorProfiles } from "../../services/api";

export default function DoctorList() {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [search]);

  const load = async () => {
    try {
      const params = { page_size: 100 };
      if (search) params.search = search;
      const data = await getDoctorProfiles(params);
      setDoctors(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>List of Doctors</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <input type="text" placeholder="Search doctors" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Link to="/doctors/create"><button type="button">+ Add New Doctor Profile</button></Link>

      <table>
        <thead><tr><th>Name</th><th>Specialty</th><th>Department</th><th>Available</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {doctors.map((d) => (
            <tr key={d.id}>
              <td>Dr. {d.full_name}</td><td>{d.specialty || "General"}</td><td>{d.department_name || "—"}</td>
              <td>{d.is_available_for_booking ? "Yes" : "No"}</td>
              <td>{d.is_active_staff ? "Active" : "Inactive"}</td>
              <td><Link to={`/doctors/${d.id}`}>View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      {doctors.length === 0 && <p>No doctor profiles found.</p>}
    </div>
  );
}