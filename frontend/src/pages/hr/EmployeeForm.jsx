import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDepartments, getUsers, createEmployee } from "../../services/api";

export default function EmployeeForm() {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    user: "", full_name: "", national_id: "", gender: "", date_of_birth: "",
    phone: "", email: "", address: "", job_title: "", department: "",
    employment_type: "FULL_TIME", date_hired: "", basic_salary: "",
    bank_name: "", bank_account_number: "",
    next_of_kin_name: "", next_of_kin_phone: "", next_of_kin_relationship: "",
  });

  useEffect(() => {
    loadDepartments();
    loadUsers();
  }, []);

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const employee = await createEmployee({
        ...form,
        user: form.user || undefined,
        national_id: form.national_id || undefined,
        date_of_birth: form.date_of_birth || undefined,
        basic_salary: form.basic_salary ? Number(form.basic_salary) : 0,
        department: form.department || undefined,
      });
      navigate(`/hr/employees/${employee.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1>Register Employee</h1>
      {error && <p>Error: {error}</p>}

      <form onSubmit={handleSubmit}>
        <h2>Personal Details</h2>
        <input type="text" placeholder="Full Name" value={form.full_name} onChange={handleChange("full_name")} required />
        <input type="text" placeholder="National ID" value={form.national_id} onChange={handleChange("national_id")} />
        <select value={form.gender} onChange={handleChange("gender")}>
          <option value="">Select gender</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>
        <label>Date of Birth</label>
        <input type="date" value={form.date_of_birth} onChange={handleChange("date_of_birth")} />
        <input type="text" placeholder="Phone" value={form.phone} onChange={handleChange("phone")} />
        <input type="email" placeholder="Email" value={form.email} onChange={handleChange("email")} />
        <input type="text" placeholder="Address" value={form.address} onChange={handleChange("address")} />

        <h2>Employment Details</h2>
        <input type="text" placeholder="Job Title" value={form.job_title} onChange={handleChange("job_title")} required />
        <select value={form.department} onChange={handleChange("department")}>
          <option value="">Select department (optional)</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={form.employment_type} onChange={handleChange("employment_type")}>
          <option value="FULL_TIME">Full-Time</option>
          <option value="PART_TIME">Part-Time</option>
          <option value="CONTRACT">Contract</option>
          <option value="LOCUM">Locum</option>
          <option value="INTERN">Intern</option>
        </select>
        <label>Date Hired</label>
        <input type="date" value={form.date_hired} onChange={handleChange("date_hired")} required />
        <input type="number" placeholder="Basic Salary" value={form.basic_salary} onChange={handleChange("basic_salary")} />

        <select value={form.user} onChange={handleChange("user")}>
          <option value="">No system login (optional)</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>)}
        </select>

        <h2>Banking Details</h2>
        <input type="text" placeholder="Bank Name" value={form.bank_name} onChange={handleChange("bank_name")} />
        <input type="text" placeholder="Bank Account Number" value={form.bank_account_number} onChange={handleChange("bank_account_number")} />

        <h2>Next of Kin</h2>
        <input type="text" placeholder="Next of Kin Name" value={form.next_of_kin_name} onChange={handleChange("next_of_kin_name")} />
        <input type="text" placeholder="Next of Kin Phone" value={form.next_of_kin_phone} onChange={handleChange("next_of_kin_phone")} />
        <input type="text" placeholder="Relationship" value={form.next_of_kin_relationship} onChange={handleChange("next_of_kin_relationship")} />

        <button type="submit" disabled={submitting}>
          {submitting ? "Registering..." : "Register Employee"}
        </button>
      </form>
    </div>
  );
}