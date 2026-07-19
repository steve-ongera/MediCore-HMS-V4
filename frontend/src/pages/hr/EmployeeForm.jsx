import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDepartments, getUsers, createEmployee } from "../../services/api";

export default function EmployeeForm() {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    user: "", full_name: "", national_id: "", gender: "", date_of_birth: "",
    phone: "", email: "", address: "", job_title: "", department: "",
    employment_type: "FULL_TIME", date_hired: "", basic_salary: "",
    bank_name: "", bank_account_number: "",
    next_of_kin_name: "", next_of_kin_phone: "", next_of_kin_relationship: "",
  });

  useEffect(() => {
    Promise.all([loadDepartments(), loadUsers()]).finally(() => setLoading(false));
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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading form data...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Human Resources</div>
          <h1 className="page-title">Register Employee</h1>
          <p className="page-subtitle">Add a new employee to the system</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/hr/employees")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Employees
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-2"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-person-plus me-2"></i> Employee Information
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Personal Details */}
            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
              <i className="bi bi-person me-1"></i> Personal Details
            </h6>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                <label className="field-label">Full Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Full name"
                  value={form.full_name}
                  onChange={handleChange("full_name")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">National ID</label>
                <input
                  type="text"
                  className="input"
                  placeholder="National ID"
                  value={form.national_id}
                  onChange={handleChange("national_id")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Gender</label>
                <select className="select" value={form.gender} onChange={handleChange("gender")}>
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Date of Birth</label>
                <input
                  type="date"
                  className="input"
                  value={form.date_of_birth}
                  onChange={handleChange("date_of_birth")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Phone</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={handleChange("phone")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange("email")}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Address</label>
              <input
                type="text"
                className="input"
                placeholder="Physical address"
                value={form.address}
                onChange={handleChange("address")}
              />
            </div>

            {/* Employment Details */}
            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-briefcase me-1"></i> Employment Details
            </h6>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Job Title <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Job title"
                  value={form.job_title}
                  onChange={handleChange("job_title")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Department</label>
                <select className="select" value={form.department} onChange={handleChange("department")}>
                  <option value="">Select department (optional)</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Employment Type</label>
                <select className="select" value={form.employment_type} onChange={handleChange("employment_type")}>
                  <option value="FULL_TIME">Full-Time</option>
                  <option value="PART_TIME">Part-Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="LOCUM">Locum</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Date Hired <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.date_hired}
                  onChange={handleChange("date_hired")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Basic Salary</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Basic salary"
                  value={form.basic_salary}
                  onChange={handleChange("basic_salary")}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">System Login</label>
              <select className="select" value={form.user} onChange={handleChange("user")}>
                <option value="">No system login (optional)</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>)}
              </select>
              <div className="text-2xs text-tertiary" style={{ marginTop: "var(--space-1)" }}>
                Assign an existing system user account to this employee
              </div>
            </div>

            {/* Banking Details */}
            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-bank me-1"></i> Banking Details
            </h6>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Bank Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Bank name"
                  value={form.bank_name}
                  onChange={handleChange("bank_name")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Bank Account Number</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Account number"
                  value={form.bank_account_number}
                  onChange={handleChange("bank_account_number")}
                />
              </div>
            </div>

            {/* Next of Kin */}
            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-people me-1"></i> Next of Kin
            </h6>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Next of kin name"
                  value={form.next_of_kin_name}
                  onChange={handleChange("next_of_kin_name")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Phone</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Phone number"
                  value={form.next_of_kin_phone}
                  onChange={handleChange("next_of_kin_phone")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Relationship</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Relationship"
                  value={form.next_of_kin_relationship}
                  onChange={handleChange("next_of_kin_relationship")}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/hr/employees")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Registering...
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-plus me-2"></i> Register Employee
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}