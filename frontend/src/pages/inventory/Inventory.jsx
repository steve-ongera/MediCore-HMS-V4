import { useEffect, useState } from "react";
import { toast } from "../../context/ToastContext";
import {
  getMedicines,
  getSuppliers,
  getMedicineBatches,
  createMedicine,
  createSupplier,
  createMedicineBatch,
  getLowStockMedicines,
} from "../../services/api";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import Modal from "../../components/Modal";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatCard from "../../components/StatCard";
import Pagination from "../../components/Pagination";
import { formatCurrency, formatDate } from "../../utils/formatters";

const PAGE_SIZE = 20;

export default function Inventory() {
  const [medicines, setMedicines] = useState([]);
  const [medPage, setMedPage] = useState(1);
  const [medTotal, setMedTotal] = useState(0);

  const [batches, setBatches] = useState([]);
  const [batchPage, setBatchPage] = useState(1);
  const [batchTotal, setBatchTotal] = useState(0);

  const [suppliers, setSuppliers] = useState([]);
  const [supPage, setSupPage] = useState(1);
  const [supTotal, setSupTotal] = useState(0);

  // Lightweight totals for the stat cards, fetched independently of whichever
  // tab/page is currently on screen. Active Batches is computed from a capped
  // sample (first 200 batches) since there's no server-side filter for it —
  // an approximation, but good enough for a dashboard tile.
  const [counts, setCounts] = useState({ medicines: 0, suppliers: 0, batches: 0, activeBatches: 0, lowStock: 0 });

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("medicines");

  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [medicineForm, setMedicineForm] = useState({
    name: "",
    generic_name: "",
    category: "",
    unit: "tablet",
    unit_price: "",
    reorder_level: 20,
  });

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [batchForm, setBatchForm] = useState({
    medicine: "",
    supplier: "",
    batch_number: "",
    quantity_received: "",
    expiry_date: "",
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadCounts(), loadMedicines(1), loadBatches(1), loadSuppliers(1)]);
      } catch (err) {
        toast.error(err.message || "Failed to load inventory");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Page-change effects only drive re-fetches for user pagination clicks —
  // the initial load above is handled explicitly, so these are gated on
  // `loading` to avoid a duplicate first fetch.
  useEffect(() => { if (!loading) loadMedicines(medPage); }, [medPage]);
  useEffect(() => { if (!loading) loadBatches(batchPage); }, [batchPage]);
  useEffect(() => { if (!loading) loadSuppliers(supPage); }, [supPage]);

  const loadCounts = async () => {
    const [medCountRes, supCountRes, batchSample, low] = await Promise.all([
      getMedicines({ page: 1, page_size: 1 }),
      getSuppliers({ page: 1, page_size: 1 }),
      getMedicineBatches({ page: 1, page_size: 200 }),
      getLowStockMedicines(),
    ]);
    const batchResults = batchSample.results || [];
    setCounts({
      medicines: medCountRes.count ?? 0,
      suppliers: supCountRes.count ?? 0,
      batches: batchSample.count ?? batchResults.length,
      activeBatches: batchResults.filter((b) => b.quantity_remaining > 0).length,
      lowStock: (low || []).length,
    });
  };

  const loadMedicines = async (page = medPage) => {
    setTableLoading(true);
    try {
      const data = await getMedicines({ page, page_size: PAGE_SIZE });
      setMedicines(data.results || []);
      setMedTotal(data.count ?? (data.results || []).length);
    } finally {
      setTableLoading(false);
    }
  };

  const loadBatches = async (page = batchPage) => {
    setTableLoading(true);
    try {
      const data = await getMedicineBatches({ page, page_size: PAGE_SIZE });
      setBatches(data.results || []);
      setBatchTotal(data.count ?? (data.results || []).length);
    } finally {
      setTableLoading(false);
    }
  };

  const loadSuppliers = async (page = supPage) => {
    setTableLoading(true);
    try {
      const data = await getSuppliers({ page, page_size: PAGE_SIZE });
      setSuppliers(data.results || []);
      setSupTotal(data.count ?? (data.results || []).length);
    } finally {
      setTableLoading(false);
    }
  };

  const handleCreateMedicine = async (e) => {
    e.preventDefault();
    if (!medicineForm.name || !medicineForm.unit_price) {
      toast.error("Name and price are required");
      return;
    }

    setSubmitting(true);
    try {
      await createMedicine({
        ...medicineForm,
        unit_price: parseFloat(medicineForm.unit_price),
        reorder_level: parseInt(medicineForm.reorder_level) || 20,
      });
      toast.success("Medicine added successfully");
      setShowMedicineModal(false);
      setMedicineForm({ name: "", generic_name: "", category: "", unit: "tablet", unit_price: "", reorder_level: 20 });
      setMedPage(1);
      await loadMedicines(1);
      await loadCounts();
    } catch (err) {
      toast.error(err.message || "Failed to add medicine");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name) {
      toast.error("Supplier name is required");
      return;
    }

    setSubmitting(true);
    try {
      await createSupplier(supplierForm);
      toast.success("Supplier added successfully");
      setShowSupplierModal(false);
      setSupplierForm({ name: "", phone: "", email: "", address: "" });
      setSupPage(1);
      await loadSuppliers(1);
      await loadCounts();
    } catch (err) {
      toast.error(err.message || "Failed to add supplier");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.medicine || !batchForm.batch_number || !batchForm.quantity_received || !batchForm.expiry_date) {
      toast.error("All fields are required");
      return;
    }

    setSubmitting(true);
    try {
      await createMedicineBatch({
        ...batchForm,
        quantity_received: parseInt(batchForm.quantity_received),
      });
      toast.success("Batch added successfully");
      setShowBatchModal(false);
      setBatchForm({ medicine: "", supplier: "", batch_number: "", quantity_received: "", expiry_date: "" });
      setBatchPage(1);
      await loadBatches(1);
      await loadCounts();
    } catch (err) {
      toast.error(err.message || "Failed to add batch");
    } finally {
      setSubmitting(false);
    }
  };

  const medicineColumns = [
    {
      key: "name",
      label: "Medicine",
      render: (row) => (
        <div>
          <div className="fw-semibold">{row.name}</div>
          <div className="text-xs text-muted">{row.generic_name || row.category}</div>
        </div>
      ),
    },
    {
      key: "unit_price",
      label: "Price",
      render: (row) => formatCurrency(row.unit_price),
    },
    {
      key: "current_stock",
      label: "Stock",
      render: (row) => (
        <div>
          <div>{row.current_stock || 0}</div>
          <div className="stock-meter mt-1">
            <div
              className={`stock-meter__fill ${row.current_stock <= row.reorder_level ? "is-critical" : ""}`}
              style={{
                width: `${Math.min((row.current_stock / (row.reorder_level * 3)) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="text-xs text-muted">Reorder: {row.reorder_level}</div>
        </div>
      ),
    },
    {
      key: "is_low_stock",
      label: "Status",
      render: (row) => (
        row.is_low_stock ? (
          <StatusBadge status="LOW_STOCK" />
        ) : (
          <StatusBadge status="IN_STOCK" />
        )
      ),
    },
    {
      key: "unit",
      label: "Unit",
      render: (row) => row.unit || "—",
    },
  ];

  // NOTE: MedicineBatchSerializer returns `medicine` and `supplier` as plain
  // foreign-key IDs, not nested objects. Read the flat `medicine_name` /
  // `supplier_name` fields the serializer provides instead of drilling into
  // row.medicine.name / row.supplier.name (which are always undefined since
  // row.medicine / row.supplier are just UUID strings).
  const batchColumns = [
    {
      key: "medicine_name",
      label: "Medicine",
      render: (row) => row.medicine_name || "—",
    },
    {
      key: "batch_number",
      label: "Batch #",
      render: (row) => <span className="cell-mono">{row.batch_number}</span>,
    },
    {
      key: "supplier_name",
      label: "Supplier",
      render: (row) => row.supplier_name || "—",
    },
    {
      key: "quantity_received",
      label: "Received",
      render: (row) => row.quantity_received || 0,
    },
    {
      key: "quantity_remaining",
      label: "Remaining",
      render: (row) => row.quantity_remaining || 0,
    },
    {
      key: "expiry_date",
      label: "Expiry",
      render: (row) => {
        const isExpired = new Date(row.expiry_date) < new Date();
        return (
          <span className={isExpired ? "text-danger" : ""}>
            {formatDate(row.expiry_date)}
            {isExpired && <i className="bi bi-exclamation-triangle ms-1" />}
          </span>
        );
      },
    },
  ];

  const supplierColumns = [
    {
      key: "name",
      label: "Name",
      render: (row) => row.name,
    },
    {
      key: "phone",
      label: "Phone",
      render: (row) => row.phone || "—",
    },
    {
      key: "email",
      label: "Email",
      render: (row) => row.email || "—",
    },
    {
      key: "address",
      label: "Address",
      render: (row) => row.address || "—",
    },
  ];

  if (loading) return <LoadingSpinner />;

  const activeData =
    activeTab === "medicines" ? medicines : activeTab === "batches" ? batches : suppliers;
  const activeColumns =
    activeTab === "medicines" ? medicineColumns : activeTab === "batches" ? batchColumns : supplierColumns;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Pharmacy</div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage medicines, suppliers, and stock</p>
        </div>
        <div className="page-header__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              loadCounts();
              loadMedicines(medPage);
              loadBatches(batchPage);
              loadSuppliers(supPage);
            }}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid mb-4">
        <StatCard
          label="Total Medicines"
          value={counts.medicines}
          icon="bi-capsule"
          variant="primary"
        />
        <StatCard
          label="Low Stock Items"
          value={counts.lowStock}
          icon="bi-exclamation-triangle"
          variant="danger"
        />
        <StatCard
          label="Suppliers"
          value={counts.suppliers}
          icon="bi-truck"
          variant="info"
        />
        <StatCard
          label="Active Batches"
          value={counts.activeBatches}
          icon="bi-boxes"
          variant="success"
        />
      </div>

      {/* Tabs */}
      <div className="tabs mb-3">
        <button
          type="button"
          className={`tabs__item ${activeTab === "medicines" ? "is-active" : ""}`}
          onClick={() => setActiveTab("medicines")}
        >
          Medicines ({counts.medicines})
        </button>
        <button
          type="button"
          className={`tabs__item ${activeTab === "batches" ? "is-active" : ""}`}
          onClick={() => setActiveTab("batches")}
        >
          Batches ({counts.batches})
        </button>
        <button
          type="button"
          className={`tabs__item ${activeTab === "suppliers" ? "is-active" : ""}`}
          onClick={() => setActiveTab("suppliers")}
        >
          Suppliers ({counts.suppliers})
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            {activeTab === "medicines" && "Medicine Catalog"}
            {activeTab === "batches" && "Stock Batches"}
            {activeTab === "suppliers" && "Suppliers"}
          </h5>
          {activeTab === "medicines" && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowMedicineModal(true)}
            >
              <i className="bi bi-plus-lg me-1"></i>
              Add Medicine
            </button>
          )}
          {activeTab === "batches" && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowBatchModal(true)}
            >
              <i className="bi bi-plus-lg me-1"></i>
              Add Batch
            </button>
          )}
          {activeTab === "suppliers" && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowSupplierModal(true)}
            >
              <i className="bi bi-plus-lg me-1"></i>
              Add Supplier
            </button>
          )}
        </div>
        <div className="card-body p-0">
          <DataTable
            columns={activeColumns}
            data={activeData}
            loading={tableLoading}
            emptyMessage={`No ${activeTab} found`}
          />

          {activeTab === "medicines" && (
            <Pagination page={medPage} count={medTotal} pageSize={PAGE_SIZE} onPageChange={setMedPage} />
          )}
          {activeTab === "batches" && (
            <Pagination page={batchPage} count={batchTotal} pageSize={PAGE_SIZE} onPageChange={setBatchPage} />
          )}
          {activeTab === "suppliers" && (
            <Pagination page={supPage} count={supTotal} pageSize={PAGE_SIZE} onPageChange={setSupPage} />
          )}
        </div>
      </div>

      {/* Add Medicine Modal */}
      <Modal
        show={showMedicineModal}
        onClose={() => {
          setShowMedicineModal(false);
          setMedicineForm({ name: "", generic_name: "", category: "", unit: "tablet", unit_price: "", reorder_level: 20 });
        }}
        title="Add Medicine"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowMedicineModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateMedicine}
              disabled={submitting}
            >
              {submitting ? <span className="spinner-border spinner-border-sm" /> : "Add Medicine"}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="med_name">
            Name <span className="required">*</span>
          </label>
          <input
            id="med_name"
            type="text"
            className="input"
            placeholder="Medicine name"
            value={medicineForm.name}
            onChange={(e) => setMedicineForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="med_generic">
            Generic Name
          </label>
          <input
            id="med_generic"
            type="text"
            className="input"
            placeholder="Generic name"
            value={medicineForm.generic_name}
            onChange={(e) => setMedicineForm((prev) => ({ ...prev, generic_name: e.target.value }))}
          />
        </div>
        <div className="row">
          <div className="col-md-6">
            <div className="field">
              <label className="field-label" htmlFor="med_category">
                Category
              </label>
              <input
                id="med_category"
                type="text"
                className="input"
                placeholder="e.g., Antibiotic"
                value={medicineForm.category}
                onChange={(e) => setMedicineForm((prev) => ({ ...prev, category: e.target.value }))}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="field">
              <label className="field-label" htmlFor="med_unit">
                Unit
              </label>
              <select
                id="med_unit"
                className="select"
                value={medicineForm.unit}
                onChange={(e) => setMedicineForm((prev) => ({ ...prev, unit: e.target.value }))}
              >
                <option value="tablet">Tablet</option>
                <option value="capsule">Capsule</option>
                <option value="syrup">Syrup</option>
                <option value="injection">Injection</option>
                <option value="cream">Cream</option>
                <option value="drops">Drops</option>
              </select>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-6">
            <div className="field">
              <label className="field-label" htmlFor="med_price">
                Unit Price (KES) <span className="required">*</span>
              </label>
              <input
                id="med_price"
                type="number"
                step="0.01"
                className="input"
                placeholder="0.00"
                value={medicineForm.unit_price}
                onChange={(e) => setMedicineForm((prev) => ({ ...prev, unit_price: e.target.value }))}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="field">
              <label className="field-label" htmlFor="med_reorder">
                Reorder Level
              </label>
              <input
                id="med_reorder"
                type="number"
                className="input"
                placeholder="20"
                value={medicineForm.reorder_level}
                onChange={(e) => setMedicineForm((prev) => ({ ...prev, reorder_level: parseInt(e.target.value) || 20 }))}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal
        show={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false);
          setSupplierForm({ name: "", phone: "", email: "", address: "" });
        }}
        title="Add Supplier"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowSupplierModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateSupplier}
              disabled={submitting}
            >
              {submitting ? <span className="spinner-border spinner-border-sm" /> : "Add Supplier"}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="sup_name">
            Name <span className="required">*</span>
          </label>
          <input
            id="sup_name"
            type="text"
            className="input"
            placeholder="Supplier name"
            value={supplierForm.name}
            onChange={(e) => setSupplierForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="row">
          <div className="col-md-6">
            <div className="field">
              <label className="field-label" htmlFor="sup_phone">
                Phone
              </label>
              <input
                id="sup_phone"
                type="tel"
                className="input"
                placeholder="Phone number"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="field">
              <label className="field-label" htmlFor="sup_email">
                Email
              </label>
              <input
                id="sup_email"
                type="email"
                className="input"
                placeholder="Email address"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="sup_address">
            Address
          </label>
          <input
            id="sup_address"
            type="text"
            className="input"
            placeholder="Physical address"
            value={supplierForm.address}
            onChange={(e) => setSupplierForm((prev) => ({ ...prev, address: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Add Batch Modal */}
      <Modal
        show={showBatchModal}
        onClose={() => {
          setShowBatchModal(false);
          setBatchForm({ medicine: "", supplier: "", batch_number: "", quantity_received: "", expiry_date: "" });
        }}
        title="Add Stock Batch"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowBatchModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateBatch}
              disabled={submitting}
            >
              {submitting ? <span className="spinner-border spinner-border-sm" /> : "Add Batch"}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="batch_medicine">
            Medicine <span className="required">*</span>
          </label>
          <select
            id="batch_medicine"
            className="select"
            value={batchForm.medicine}
            onChange={(e) => setBatchForm((prev) => ({ ...prev, medicine: e.target.value }))}
          >
            <option value="">Select medicine</option>
            {medicines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.current_stock || 0} in stock)
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="batch_supplier">
            Supplier
          </label>
          <select
            id="batch_supplier"
            className="select"
            value={batchForm.supplier}
            onChange={(e) => setBatchForm((prev) => ({ ...prev, supplier: e.target.value }))}
          >
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="batch_number">
            Batch Number <span className="required">*</span>
          </label>
          <input
            id="batch_number"
            type="text"
            className="input"
            placeholder="Batch number"
            value={batchForm.batch_number}
            onChange={(e) => setBatchForm((prev) => ({ ...prev, batch_number: e.target.value }))}
          />
        </div>
        <div className="row">
          <div className="col-md-6">
            <div className="field">
              <label className="field-label" htmlFor="batch_qty">
                Quantity Received <span className="required">*</span>
              </label>
              <input
                id="batch_qty"
                type="number"
                className="input"
                placeholder="0"
                value={batchForm.quantity_received}
                onChange={(e) => setBatchForm((prev) => ({ ...prev, quantity_received: e.target.value }))}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="field">
              <label className="field-label" htmlFor="batch_expiry">
                Expiry Date <span className="required">*</span>
              </label>
              <input
                id="batch_expiry"
                type="date"
                className="input"
                value={batchForm.expiry_date}
                onChange={(e) => setBatchForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}