import { useEffect, useState } from "react";
import { toast } from "../../context/ToastContext";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../services/api";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import LoadingSpinner from "../../components/LoadingSpinner";
import { ROLES, ROLE_LABELS } from "../../utils/roles";
import { formatCurrency } from "../../utils/formatters";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [resetPassword, setResetPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const [userPage, setUserPage] = useState(1);
  const [userCount, setUserCount] = useState(0);
  const [deptPage, setDeptPage] = useState(1);
  const [deptCount, setDeptCount] = useState(0);

  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");

  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "",
    phone: "",
    password: "",
  });

  const [deptForm, setDeptForm] = useState({
    name: "",
    consultation_fee: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    const handle = setTimeout(() => {
      setUserSearch(userSearchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [userSearchInput]);

  useEffect(() => {
    if (userPage !== 1) {
      setUserPage(1);
    } else {
      loadUsers(1);
    }
  }, [userSearch, userRoleFilter]);

  useEffect(() => {
    loadUsers(userPage);
  }, [userPage]);

  useEffect(() => {
    loadDepartments(deptPage);
  }, [deptPage]);

  const normalizeListResponse = (data) => {
    if (Array.isArray(data)) {
      return { results: data, count: data.length };
    }
    return { results: data?.results || [], count: data?.count ?? (data?.results?.length || 0) };
  };

  const loadUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (userSearch) params.search = userSearch;
      if (userRoleFilter) params.role = userRoleFilter;
      const data = await getUsers(params);
      const { results, count } = normalizeListResponse(data);
      setUsers(results);
      setUserCount(count);
    } catch (err) {
      toast.error(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async (page = 1) => {
    setLoading(true);
    try {
      const data = await getDepartments({ page, page_size: PAGE_SIZE });
      const { results, count } = normalizeListResponse(data);
      setDepartments(results);
      setDeptCount(count);
    } catch (err) {
      toast.error(err.message || "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const reloadCurrentTab = () => {
    if (activeTab === "users") {
      loadUsers(userPage);
    } else {
      loadDepartments(deptPage);
    }
  };

  const clearUserFilters = () => {
    setUserSearchInput("");
    setUserSearch("");
    setUserRoleFilter("");
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!editingUser && (!userForm.username || !userForm.password || !userForm.role)) {
      toast.error("Username, password, and role are required");
      return;
    }
    if (editingUser && (!userForm.username || !userForm.role)) {
      toast.error("Username and role are required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        const { password, ...updateData } = userForm;
        await updateUser(editingUser.id, updateData);
        toast.success("User updated successfully");
      } else {
        await createUser(userForm);
        toast.success("User created successfully");
      }
      setShowUserModal(false);
      setUserForm({ username: "", email: "", first_name: "", last_name: "", role: "", phone: "", password: "" });
      setEditingUser(null);
      setResetPassword("");
      loadUsers(userPage);
    } catch (err) {
      toast.error(err.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingUser) return;
    if (!resetPassword || resetPassword.length < 8) {
      toast.error("Enter a new password (min 8 characters)");
      return;
    }
    setResettingPassword(true);
    try {
      await resetUserPassword(editingUser.id, resetPassword);
      toast.success("Password reset successfully");
      setResetPassword("");
    } catch (err) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.consultation_fee) {
      toast.error("Name and consultation fee are required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, deptForm);
        toast.success("Department updated successfully");
      } else {
        await createDepartment(deptForm);
        toast.success("Department created successfully");
      }
      setShowDeptModal(false);
      setDeptForm({ name: "", consultation_fee: "", description: "", is_active: true });
      setEditingDept(null);
      loadDepartments(deptPage);
    } catch (err) {
      toast.error(err.message || "Failed to save department");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "user") {
        await deleteUser(deleteTarget.id);
        toast.success("User deleted");
        if (users.length === 1 && userPage > 1) {
          setUserPage((p) => p - 1);
        } else {
          loadUsers(userPage);
        }
      } else {
        await deleteDepartment(deleteTarget.id);
        toast.success("Department deleted");
        if (departments.length === 1 && deptPage > 1) {
          setDeptPage((p) => p - 1);
        } else {
          loadDepartments(deptPage);
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setShowConfirm(false);
      setDeleteTarget(null);
    }
  };

  const openUserModal = (user = null) => {
    setResetPassword("");
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username,
        email: user.email || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        role: user.role,
        phone: user.phone || "",
        password: "",
      });
    } else {
      setEditingUser(null);
      setUserForm({ username: "", email: "", first_name: "", last_name: "", role: "", phone: "", password: "" });
    }
    setShowUserModal(true);
  };

  const openDeptModal = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({
        name: dept.name,
        consultation_fee: dept.consultation_fee,
        description: dept.description || "",
        is_active: dept.is_active,
      });
    } else {
      setEditingDept(null);
      setDeptForm({ name: "", consultation_fee: "", description: "", is_active: true });
    }
    setShowDeptModal(true);
  };

  const getStatusBadge = (isActive) => {
    return isActive ? "badge-success" : "badge-neutral";
  };

  const userColumns = [
    {
      key: "username",
      label: "Username",
      render: (row) => (
        <div>
          <div className="cell-primary">{row.username}</div>
          <div className="text-2xs text-tertiary">{row.email}</div>
        </div>
      ),
    },
    {
      key: "first_name",
      label: "Name",
      render: (row) => `${row.first_name || ""} ${row.last_name || ""}`.trim() || "—",
    },
    {
      key: "role",
      label: "Role",
      render: (row) => ROLE_LABELS[row.role] || row.role || "—",
    },
    {
      key: "phone",
      label: "Phone",
      render: (row) => row.phone || "—",
    },
    {
      key: "is_active",
      label: "Status",
      render: (row) => (
        <span className={`badge ${getStatusBadge(row.is_active)}`}>
          <span className="badge-dot"></span>
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openUserModal(row)}
          >
            <i className="bi bi-pencil"></i>
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => {
              setDeleteTarget({ id: row.id, type: "user" });
              setShowConfirm(true);
            }}
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      ),
    },
  ];

  const deptColumns = [
    {
      key: "name",
      label: "Department",
      render: (row) => (
        <div>
          <div className="cell-primary">{row.name}</div>
          <div className="text-2xs text-tertiary">{row.description}</div>
        </div>
      ),
    },
    {
      key: "consultation_fee",
      label: "Consultation Fee",
      render: (row) => formatCurrency(row.consultation_fee),
    },
    {
      key: "is_active",
      label: "Status",
      render: (row) => (
        <span className={`badge ${getStatusBadge(row.is_active)}`}>
          <span className="badge-dot"></span>
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openDeptModal(row)}
          >
            <i className="bi bi-pencil"></i>
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => {
              setDeleteTarget({ id: row.id, type: "department" });
              setShowConfirm(true);
            }}
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      ),
    },
  ];

  const currentPage = activeTab === "users" ? userPage : deptPage;
  const currentCount = activeTab === "users" ? userCount : deptCount;
  const totalPages = Math.max(1, Math.ceil(currentCount / PAGE_SIZE));
  const setCurrentPage = activeTab === "users" ? setUserPage : setDeptPage;
  const hasActiveUserFilters = Boolean(userSearchInput || userRoleFilter);

  if (loading && users.length === 0 && departments.length === 0) return <LoadingSpinner />;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Administration</div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage users, departments, and system configuration</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={reloadCurrentTab}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: "var(--space-3)" }}>
        <button
          type="button"
          className={`tabs__item ${activeTab === "users" ? "is-active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <i className="bi bi-people me-2"></i>
          Users ({userCount})
        </button>
        <button
          type="button"
          className={`tabs__item ${activeTab === "departments" ? "is-active" : ""}`}
          onClick={() => setActiveTab("departments")}
        >
          <i className="bi bi-building me-2"></i>
          Departments ({deptCount})
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            {activeTab === "users" ? "User Management" : "Department Management"}
          </h5>
          {activeTab === "users" ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => openUserModal()}
            >
              <i className="bi bi-person-plus me-1"></i>
              Add User
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => openDeptModal()}
            >
              <i className="bi bi-building-add me-1"></i>
              Add Department
            </button>
          )}
        </div>

        {/* Search + role filter — users tab only */}
        {activeTab === "users" && (
          <div className="card-body" style={{ borderBottom: "1px solid var(--border-color)", padding: "var(--space-3)" }}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="search-bar" style={{ flex: "1 1 260px", minWidth: "220px" }}>
                <i className="bi bi-search search-bar__icon"></i>
                <input
                  type="text"
                  className="search-bar__input"
                  placeholder="Search by name, username, or email..."
                  value={userSearchInput}
                  onChange={(e) => setUserSearchInput(e.target.value)}
                />
                {userSearchInput && (
                  <button
                    type="button"
                    className="search-bar__clear"
                    onClick={() => setUserSearchInput("")}
                    aria-label="Clear search"
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <select
                  className="select"
                  style={{ width: "180px" }}
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  aria-label="Filter by role"
                >
                  <option value="">All roles</option>
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {hasActiveUserFilters && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={clearUserFilters}
                >
                  <i className="bi bi-x-lg me-1"></i>
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        <div className="card-body p-0">
          <DataTable
            columns={activeTab === "users" ? userColumns : deptColumns}
            data={activeTab === "users" ? users : departments}
            loading={loading}
            emptyMessage={
              activeTab === "users" && hasActiveUserFilters
                ? "No users match your search"
                : `No ${activeTab} found`
            }
          />
        </div>

        {/* Pagination footer */}
        {currentCount > PAGE_SIZE && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, currentCount)} of {currentCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <i className="bi bi-chevron-left me-1"></i>
                Prev
              </button>
              <span className="text-2xs text-tertiary">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <i className="bi bi-chevron-right ms-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Modal */}
      <Modal
        show={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setEditingUser(null);
          setResetPassword("");
          setUserForm({ username: "", email: "", first_name: "", last_name: "", role: "", phone: "", password: "" });
        }}
        title={editingUser ? "Edit User" : "Add User"}
        size="lg"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowUserModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateUser}
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
              ) : editingUser ? "Update" : "Create"}
            </button>
          </div>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="user_username">
            Username <span className="required">*</span>
          </label>
          <input
            id="user_username"
            type="text"
            className="input"
            placeholder="Username"
            value={userForm.username}
            onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))}
          />
        </div>
        <div className="field-row">
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label className="field-label" htmlFor="user_first_name">
              First Name
            </label>
            <input
              id="user_first_name"
              type="text"
              className="input"
              placeholder="First name"
              value={userForm.first_name}
              onChange={(e) => setUserForm((prev) => ({ ...prev, first_name: e.target.value }))}
            />
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label className="field-label" htmlFor="user_last_name">
              Last Name
            </label>
            <input
              id="user_last_name"
              type="text"
              className="input"
              placeholder="Last name"
              value={userForm.last_name}
              onChange={(e) => setUserForm((prev) => ({ ...prev, last_name: e.target.value }))}
            />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="user_email">
            Email
          </label>
          <input
            id="user_email"
            type="email"
            className="input"
            placeholder="Email address"
            value={userForm.email}
            onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
          />
        </div>
        <div className="field-row">
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label className="field-label" htmlFor="user_role">
              Role <span className="required">*</span>
            </label>
            <select
              id="user_role"
              className="select"
              value={userForm.role}
              onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="">Select role</option>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label className="field-label" htmlFor="user_phone">
              Phone
            </label>
            <input
              id="user_phone"
              type="tel"
              className="input"
              placeholder="Phone number"
              value={userForm.phone}
              onChange={(e) => setUserForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
        </div>

        {!editingUser ? (
          <div className="field">
            <label className="field-label" htmlFor="user_password">
              Password <span className="required">*</span>
            </label>
            <input
              id="user_password"
              type="password"
              className="input"
              placeholder="Password"
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>
        ) : (
          <div className="field">
            <label className="field-label" htmlFor="reset_password">
              Reset Password
            </label>
            <div className="flex gap-2">
              <input
                id="reset_password"
                type="password"
                className="input"
                placeholder="New password (leave blank to skip)"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetPassword}
                disabled={resettingPassword || !resetPassword}
              >
                {resettingPassword ? (
                  <span className="spinner spinner-sm" style={{ display: "inline-block", width: "14px", height: "14px" }}></span>
                ) : (
                  "Reset"
                )}
              </button>
            </div>
            <div className="text-2xs text-tertiary" style={{ marginTop: "var(--space-1)" }}>
              Sets the password directly — the current password is not required.
            </div>
          </div>
        )}
      </Modal>

      {/* Department Modal */}
      <Modal
        show={showDeptModal}
        onClose={() => {
          setShowDeptModal(false);
          setEditingDept(null);
          setDeptForm({ name: "", consultation_fee: "", description: "", is_active: true });
        }}
        title={editingDept ? "Edit Department" : "Add Department"}
        size="lg"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowDeptModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateDepartment}
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
              ) : editingDept ? "Update" : "Create"}
            </button>
          </div>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="dept_name">
            Department Name <span className="required">*</span>
          </label>
          <input
            id="dept_name"
            type="text"
            className="input"
            placeholder="Department name"
            value={deptForm.name}
            onChange={(e) => setDeptForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="dept_fee">
            Consultation Fee (KES) <span className="required">*</span>
          </label>
          <input
            id="dept_fee"
            type="number"
            step="0.01"
            className="input"
            placeholder="0.00"
            value={deptForm.consultation_fee}
            onChange={(e) => setDeptForm((prev) => ({ ...prev, consultation_fee: e.target.value }))}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="dept_description">
            Description
          </label>
          <textarea
            id="dept_description"
            className="textarea"
            rows={3}
            placeholder="Department description"
            value={deptForm.description}
            onChange={(e) => setDeptForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <div className="field" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <input
            id="dept_active"
            type="checkbox"
            className="input"
            style={{ width: "auto", margin: 0 }}
            checked={deptForm.is_active}
            onChange={(e) => setDeptForm((prev) => ({ ...prev, is_active: e.target.checked }))}
          />
          <label className="field-label" htmlFor="dept_active" style={{ marginBottom: 0 }}>
            Active
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget?.type === "user" ? "User" : "Department"}`}
        message={`Are you sure you want to delete this ${deleteTarget?.type}? This action cannot be undone.`}
        variant="danger"
      />
    </>
  );
}