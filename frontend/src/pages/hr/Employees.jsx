import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEmployees, getDepartments } from "../../services/api";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { loadDepartments(); }, []);
  useEffect(() => { load(); }, [statusFilter, deptFilter, search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.employment_status = statusFilter;
      if (deptFilter) params.department = deptFilter;
      if (search) params.search = search;
      const data = await getEmployees(params);
      setEmployees(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Employees</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/hr/employees/register"><button type="button">+ Register Employee</button></Link>

      <input type="text" placeholder="Search by name, employee #, national ID" value={search} onChange={(e) => setSearch(e.target.value)} />

      <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
        <option value="">All Departments</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="ON_LEAVE">On Leave</option>
        <option value="SUSPENDED">Suspended</option>
        <option value="TERMINATED">Terminated</option>
        <option value="RESIGNED">Resigned</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead>
            <tr>
              <th>Employee #</th><th>Name</th><th>Job Title</th><th>Department</th>
              <th>Type</th><th>Status</th><th>Date Hired</th><th>Phone</th><th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td>{e.employee_number}</td><td>{e.full_name}</td><td>{e.job_title}</td>
                <td>{e.department_name || "—"}</td><td>{e.employment_type}</td>
                <td>{e.employment_status}</td><td>{e.date_hired}</td><td>{e.phone || "—"}</td>
                <td><Link to={`/hr/employees/${e.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && employees.length === 0 && <p>No employees found.</p>}
    </div>
  );
}