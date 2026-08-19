import { useEffect, useState } from "react";
import { toast } from "../../context/ToastContext";
import { getFiscalPeriods, createFiscalPeriod, closeFiscalPeriod } from "../../services/api";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import { formatDate } from "../../utils/formatters";

export default function FiscalPeriods() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [closingId, setClosingId] = useState(null);

  const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getFiscalPeriods({ page_size: 200 });
      setPeriods(data.results ?? data ?? []);
    } catch (err) {
      toast.error(err.message || "Failed to load fiscal periods");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Period name is required";
    if (!form.start_date) newErrors.start_date = "Start date is required";
    if (!form.end_date) newErrors.end_date = "End date is required";
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      newErrors.end_date = "End date must be after start date";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createFiscalPeriod(form);
      toast.success("Fiscal period created");
      setShowModal(false);
      setForm({ name: "", start_date: "", end_date: "" });
      load();
    } catch (err) {
      toast.error(err.message || "Failed to create fiscal period");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (period) => {
    if (!window.confirm(`Close "${period.name}"? Once closed, no journal entries can be posted or edited within this period. This cannot be undone.`)) {
      return;
    }
    setClosingId(period.id);
    try {
      await closeFiscalPeriod(period.id);
      toast.success(`${period.name} closed`);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to close fiscal period");
    } finally {
      setClosingId(null);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Period",
      render: (row) => <span className="cell-primary">{row.name}</span>,
    },
    {
      key: "start_date",
      label: "Start Date",
      render: (row) => formatDate(row.start_date),
    },
    {
      key: "end_date",
      label: "End Date",
      render: (row) => formatDate(row.end_date),
    },
    {
      key: "is_closed",
      label: "Status",
      render: (row) => (
        <span className={`badge ${row.is_closed ? "badge-neutral" : "badge-success"}`}>
          <span className="badge-dot"></span>
          {row.is_closed ? "Closed" : "Open"}
        </span>
      ),
    },
    {
      key: "closed_by_name",
      label: "Closed By",
      render: (row) => (row.is_closed ? row.closed_by_name || "—" : "—"),
    },
    {
      key: "closed_at",
      label: "Closed On",
      render: (row) => (row.is_closed && row.closed_at ? formatDate(row.closed_at) : "—"),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-1 justify-end">
          {!row.is_closed && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleClose(row)}
              disabled={closingId === row.id}
            >
              {closingId === row.id ? (
                <span className="spinner-border spinner-border-sm" role="status" />
              ) : (
                <>
                  <i className="bi bi-lock me-1"></i> Close Period
                </>
              )}
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading && periods.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading fiscal periods...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1 className="page-title">Fiscal Periods</h1>
          <p className="page-subtitle">
            Shared accounting calendar — every branch's budgets and journal entries are tracked
            against these same periods, so group-level reporting stays consistent across branches.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <i className="bi bi-plus-circle me-1"></i> New Fiscal Period
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="text-tertiary text-sm">
            {periods.length} period{periods.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="card-body p-0">
          {periods.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-calendar-range"></i>
              </div>
              <div className="empty-state__title">No fiscal periods yet</div>
              <div className="empty-state__desc">
                Create your first fiscal period to start budgeting and posting journal entries.
              </div>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <i className="bi bi-plus-circle me-2"></i>
                Create First Fiscal Period
              </button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={periods}
              loading={loading}
              emptyMessage="No fiscal periods found."
            />
          )}
        </div>
      </div>

      <Modal
        show={showModal}
        onClose={() => {
          setShowModal(false);
          setForm({ name: "", start_date: "", end_date: "" });
          setErrors({});
        }}
        title="New Fiscal Period"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" />
                  Creating...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg me-1"></i> Create Period
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="field">
            <label className="field-label" htmlFor="period_name">
              Period Name <span className="required">*</span>
            </label>
            <input
              id="period_name"
              type="text"
              className={`input ${errors.name ? "has-error" : ""}`}
              placeholder="e.g. July 2026"
              value={form.name}
              onChange={handleChange("name")}
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
            <div className="field-hint">
              This period is shared across every branch — the same calendar all branches report against.
            </div>
          </div>

          <div className="field-row">
            <div className="field" style={{ marginBottom: 0, flex: 1 }}>
              <label className="field-label" htmlFor="start_date">
                Start Date <span className="required">*</span>
              </label>
              <input
                id="start_date"
                type="date"
                className={`input ${errors.start_date ? "has-error" : ""}`}
                value={form.start_date}
                onChange={handleChange("start_date")}
              />
              {errors.start_date && <div className="field-error">{errors.start_date}</div>}
            </div>
            <div className="field" style={{ marginBottom: 0, flex: 1 }}>
              <label className="field-label" htmlFor="end_date">
                End Date <span className="required">*</span>
              </label>
              <input
                id="end_date"
                type="date"
                className={`input ${errors.end_date ? "has-error" : ""}`}
                value={form.end_date}
                onChange={handleChange("end_date")}
              />
              {errors.end_date && <div className="field-error">{errors.end_date}</div>}
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}