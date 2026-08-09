//src/pages/radiology/RadiologyTestCatalogManagement.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "../../context/ToastContext";
import {
  getRadiologyTestCatalog,
  createRadiologyTest,
  updateRadiologyTest,
  deleteRadiologyTest,
} from "../../services/api";
import DataTable from "../../components/DataTable";
import SearchBar from "../../components/SearchBar";
import StatusBadge from "../../components/StatusBadge";
import ConfirmDialog from "../../components/ConfirmDialog";

const EMPTY_FORM = { code: "", name: "", price: "", is_active: true };

const toArray = (data) => (Array.isArray(data) ? data : data?.results ?? []);

export default function RadiologyTestCatalogManagement() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRadiologyTestCatalog();
      setTests(toArray(data));
    } catch (err) {
      toast.error(err.message || "Failed to load radiology test catalog");
    } finally {
      setLoading(false);
    }
  };

  const visibleTests = search
    ? tests.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.code.toLowerCase().includes(search.toLowerCase())
      )
    : tests;

  const openCreateForm = () => {
    setEditingCode(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (test) => {
    setEditingCode(test.code);
    setForm({
      code: test.code,
      name: test.name,
      price: test.price,
      is_active: test.is_active,
    });
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCode(null);
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (editingCode) {
        // code is the lookup_field on RadiologyTestCatalogViewSet and isn't
        // editable once set, so only name/price/is_active go in the PATCH.
        const { code, ...payload } = form;
        await updateRadiologyTest(editingCode, payload);
        toast.success("Radiology test updated");
      } else {
        await createRadiologyTest(form);
        toast.success("Radiology test added");
      }
      closeForm();
      load();
    } catch (err) {
      setFormError(err.message || "Failed to save radiology test");
    } finally {
      setSaving(false);
    }
  };

  const requestToggleActive = (test) => setPendingAction({ type: "toggle", test });
  const requestDelete = (test) => setPendingAction({ type: "delete", test });

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    const { type, test } = pendingAction;
    try {
      if (type === "toggle") {
        await updateRadiologyTest(test.code, { is_active: !test.is_active });
        toast.success(test.is_active ? "Test marked inactive" : "Test marked active");
      } else {
        await deleteRadiologyTest(test.code);
        toast.success("Radiology test deleted");
      }
      load();
    } catch (err) {
      toast.error(err.message || "Action failed");
    } finally {
      setPendingAction(null);
    }
  };

  const columns = [
    {
      key: "code",
      label: "Code",
      render: (row) => <span className="cell-mono">{row.code}</span>,
    },
    {
      key: "name",
      label: "Test",
      render: (row) => <div className="cell-primary">{row.name}</div>,
    },
    {
      key: "price",
      label: "Price",
      render: (row) => <span className="cell-mono">KES {Number(row.price).toLocaleString()}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <button
          className="btn-icon-only-labeled"
          onClick={() => requestToggleActive(row)}
          title={row.is_active ? "Mark inactive" : "Mark active"}
        >
          <StatusBadge status={row.is_active ? "Active" : "Inactive"} variant={row.is_active ? "success" : "secondary"} />
        </button>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button className="btn-icon-only" onClick={() => openEditForm(row)} title="Edit test">
            <i className="bi bi-pencil"></i>
          </button>
          <button
            className="btn-icon-only"
            style={{ color: "var(--danger-strong)" }}
            onClick={() => requestDelete(row)}
            title="Delete test"
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Radiology</div>
          <h1 className="page-title">Test Catalog</h1>
          <p className="page-subtitle">Manage radiology tests, codes, and pricing</p>
        </div>
        <div className="page-header__actions">
          <Link to="/radiology" className="btn btn-secondary">
            <i className="bi bi-arrow-left me-2"></i>
            Back to Radiology
          </Link>
          <button className="btn btn-primary" onClick={openCreateForm}>
            <i className="bi bi-plus-lg me-2"></i>
            Add Test
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar placeholder="Search by name or code..." onSearch={setSearch} delay={300} />
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {visibleTests.length} test{visibleTests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={visibleTests}
            loading={loading}
            emptyMessage="No radiology tests yet. Add one to get started."
          />
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="modal modal-lg" role="dialog" aria-modal="true">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <div>
                  <h5 className="modal-title">{editingCode ? "Edit Radiology Test" : "Add Radiology Test"}</h5>
                  <p className="modal-desc">
                    {editingCode ? "Update test details" : "Create a new radiology test"}
                  </p>
                </div>
                <button type="button" className="modal-close" onClick={closeForm} aria-label="Close">
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--danger-soft)',
                    color: 'var(--danger-strong)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)',
                    fontSize: 'var(--fs-sm)'
                  }}>
                    {formError}
                  </div>
                )}

                <div className="field">
                  <label className="field-label">
                    Test Code <span className="required">*</span>
                  </label>
                  <input
                    className="input"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., XRAY-CHEST"
                    disabled={!!editingCode}
                    required
                  />
                  {editingCode && (
                    <span className="field-hint">Code cannot be changed after creation</span>
                  )}
                </div>

                <div className="field">
                  <label className="field-label">
                    Test Name <span className="required">*</span>
                  </label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Chest X-Ray"
                    required
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    Price (KES) <span className="required">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-addon">KES</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <div className="switch-row" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      />
                      <span className="switch-track"></span>
                    </label>
                    <div>
                      <div style={{ fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-sm)' }}>
                        Active Test
                      </div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
                        Inactive tests won't appear when ordering
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner spinner-sm" style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        marginRight: 'var(--space-2)'
                      }}></span>
                      Saving...
                    </>
                  ) : (
                    editingCode ? 'Update Test' : 'Add Test'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        show={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
        title={pendingAction?.type === "delete" ? "Delete Radiology Test" : "Change Test Status"}
        message={
          pendingAction?.type === "delete"
            ? `Delete "${pendingAction?.test?.name}"? Existing radiology orders that reference it will keep their history.`
            : `Are you sure you want to mark "${pendingAction?.test?.name}" as ${pendingAction?.test?.is_active ? "inactive" : "active"}?`
        }
        variant={pendingAction?.type === "delete" ? "danger" : "warning"}
      />
    </>
  );
}