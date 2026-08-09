//src/pages/doctor/ConsultationList.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "../../context/ToastContext";
import { getConsultations, deleteConsultation } from "../../services/api";
import DataTable from "../../components/DataTable";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import ConfirmDialog from "../../components/ConfirmDialog";
import { formatDate, initials } from "../../utils/formatters";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
];

export default function ConsultationList() {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    loadConsultations();
  }, [page, search, statusFilter]);

  const loadConsultations = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const data = await getConsultations(params);
      setConsultations(data.results || []);
      setTotal(data.count || 0);
    } catch (err) {
      toast.error(err.message || "Failed to load consultations");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, patientName) => {
    setDeleteId(id);
    setDeleteName(patientName);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteConsultation(deleteId);
      toast.success("Consultation deleted successfully");
      loadConsultations();
    } catch (err) {
      toast.error(err.message || "Failed to delete consultation");
    } finally {
      setShowConfirm(false);
      setDeleteId(null);
      setDeleteName("");
    }
  };

  const columns = [
    {
      key: "patient_name",
      label: "Patient",
      render: (row) => (
        <div className="table-row-avatar">
          <span className="avatar avatar-sm">
            {initials(row.patient_name) || "?"}
          </span>
          <div>
            <div className="cell-primary">{row.patient_name}</div>
            <div className="text-2xs text-tertiary">
              {row.doctor_name || "Unassigned"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "started_at",
      label: "Started",
      render: (row) => (
        <span className="text-tertiary text-sm">
          {formatDate(row.started_at)}
        </span>
      ),
    },
    {
      key: "completed_at",
      label: "Completed",
      render: (row) =>
        row.completed_at ? (
          <span className="text-tertiary text-sm">
            {formatDate(row.completed_at)}
          </span>
        ) : (
          <span className="text-tertiary text-2xs">In progress</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button
            className="btn-icon-only"
            onClick={() => navigate(`/doctor/consultations/${row.id}`)}
            title="View consultation"
          >
            <i className="bi bi-eye"></i>
          </button>
          <button
            className="btn-icon-only"
            onClick={() => navigate(`/doctor/consultations/${row.id}?edit=1`)}
            title="Edit consultation"
          >
            <i className="bi bi-pencil"></i>
          </button>
          <button
            className="btn-icon-only"
            style={{ color: "var(--danger-strong)" }}
            onClick={() => handleDelete(row.id, row.patient_name)}
            title="Delete consultation"
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      ),
    },
  ];

  if (loading && consultations.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading consultations...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Doctor</div>
          <h1 className="page-title">Consultations</h1>
          <p className="page-subtitle">Browse, review, and manage past and ongoing consultations</p>
        </div>
        <div className="page-header__actions">
          <Link to="/doctor" className="btn btn-secondary">
            <i className="bi bi-clipboard2-pulse me-2"></i>
            My Queue
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar
              placeholder="Search by patient or visit number..."
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              delay={400}
            />
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {total} consultation{total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body" style={{ borderBottom: "1px solid var(--border-color)", padding: "var(--space-3)" }}>
          <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((s) => {
              const isActive = statusFilter === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  className={`btn btn-sm ${isActive ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setStatusFilter(s.value);
                    setPage(1);
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card-body p-0">
          {!loading && consultations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clipboard2-pulse"></i>
              </div>
              <h3 className="empty-state__title">No consultations found</h3>
              <p className="empty-state__desc">
                {search || statusFilter
                  ? "Try adjusting your search or filters."
                  : "Consultations will appear here once patients are seen."}
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={consultations}
              loading={loading}
              emptyMessage="No consultations found. Try adjusting your search or filters."
            />
          )}
        </div>

        <div className="card-footer">
          <Pagination page={page} count={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Consultation"
        message={`Are you sure you want to delete the consultation record for ${deleteName}? This action cannot be undone.`}
        variant="danger"
      />
    </>
  );
}